import Foundation

/// La nature d'une échéance.
public enum DeadlineKind: String, Hashable, Sendable, Codable {
    case urssaf
    case vat
    case cfe

    public var title: String {
        switch self {
        case .urssaf: "Déclaration URSSAF"
        case .vat: "TVA"
        case .cfe: "Cotisation foncière (CFE)"
        }
    }

    public var symbolName: String {
        switch self {
        case .urssaf: "building.columns"
        case .vat: "percent"
        case .cfe: "map"
        }
    }
}

/// Une échéance à honorer, avec le montant estimé correspondant.
public struct Deadline: Hashable, Sendable, Identifiable {

    public let id: String
    public let kind: DeadlineKind

    /// Libellé de la période couverte ("2ᵉ trimestre 2026", "Mars 2026"…).
    public let periodLabel: String

    /// La période d'encaissements prise en compte.
    public let periodRange: Range<Date>

    /// Date limite de déclaration et de paiement.
    public let dueDate: Date

    /// Montant estimé à partir des encaissements de la période.
    public let estimatedAmount: Money

    public init(
        id: String, kind: DeadlineKind, periodLabel: String,
        periodRange: Range<Date>, dueDate: Date, estimatedAmount: Money
    ) {
        self.id = id
        self.kind = kind
        self.periodLabel = periodLabel
        self.periodRange = periodRange
        self.dueDate = dueDate
        self.estimatedAmount = estimatedAmount
    }

    /// Nombre de jours restants, négatif si l'échéance est passée.
    public func daysRemaining(from date: Date, calendar: Calendar = .gregorianUTC) -> Int {
        let start = calendar.startOfDay(for: date)
        let end = calendar.startOfDay(for: dueDate)
        return calendar.dateComponents([.day], from: start, to: end).day ?? 0
    }

    public func isOverdue(on date: Date) -> Bool {
        daysRemaining(from: date) < 0
    }
}

/// Construit le calendrier des échéances à partir des encaissements réels.
///
/// L'intérêt n'est pas de rappeler qu'une déclaration existe — l'URSSAF le fait
/// déjà — mais d'y accoler **le montant** qui sera prélevé, connu dès le premier
/// encaissement de la période.
public struct DeadlineScheduler: Sendable {

    private let calendar: Calendar
    private let calculator = ProvisionCalculator()

    public init(calendar: Calendar = .gregorianUTC) {
        self.calendar = calendar
    }

    /// Les échéances à venir, triées par date, dans la limite de `horizonMonths`.
    public func upcomingDeadlines(
        entries: [RevenueEntry],
        settings: MicroSettings,
        from referenceDate: Date,
        horizonMonths: Int = 12
    ) -> [Deadline] {

        guard let horizonEnd = calendar.date(byAdding: .month, value: horizonMonths, to: referenceDate) else {
            return []
        }

        var deadlines = socialDeadlines(entries: entries, settings: settings, around: referenceDate)
        if settings.isVATRegistered {
            deadlines += vatDeadlines(entries: entries, settings: settings, around: referenceDate)
        }
        deadlines += cfeDeadlines(settings: settings, around: referenceDate)

        return deadlines
            .filter { $0.dueDate >= calendar.startOfDay(for: referenceDate) && $0.dueDate <= horizonEnd }
            .sorted { $0.dueDate < $1.dueDate }
    }

    /// La prochaine échéance, celle qui est mise en avant sur le tableau de bord.
    public func nextDeadline(
        entries: [RevenueEntry],
        settings: MicroSettings,
        from referenceDate: Date
    ) -> Deadline? {
        upcomingDeadlines(entries: entries, settings: settings, from: referenceDate).first
    }

    // MARK: - URSSAF

    private func socialDeadlines(
        entries: [RevenueEntry], settings: MicroSettings, around referenceDate: Date
    ) -> [Deadline] {
        periods(for: settings.periodicity, around: referenceDate).compactMap { period in
            guard let dueDate = socialDueDate(forPeriodEnding: period.range.upperBound) else { return nil }
            let periodEntries = entries.filter { period.range.contains($0.date) }
            let breakdown = calculator.breakdown(for: periodEntries, settings: settings)
            // La déclaration URSSAF porte sur les cotisations et la formation,
            // plus le versement libératoire quand il est retenu. La TVA et
            // l'impôt au barème suivent d'autres circuits.
            var amount = breakdown.socialContributions + breakdown.trainingContribution
            if case .flatRate = settings.incomeTaxMode {
                amount += breakdown.incomeTax
            }
            return Deadline(
                id: "urssaf-\(period.label)",
                kind: .urssaf,
                periodLabel: period.label,
                periodRange: period.range,
                dueDate: dueDate,
                estimatedAmount: amount.roundedToEuro
            )
        }
    }

    /// La déclaration d'une période est due le dernier jour du mois qui suit
    /// la fin de cette période.
    ///
    /// - Parameter periodEnd: la borne **exclusive** de la période. Un trimestre
    ///   avril-juin se termine à `1er juillet` : c'est le jour précédent qui
    ///   porte le mois de référence, sans quoi l'échéance glisserait d'un mois.
    private func socialDueDate(forPeriodEnding periodEnd: Date) -> Date? {
        guard let lastDayOfPeriod = calendar.date(byAdding: .day, value: -1, to: periodEnd),
              let inFollowingMonth = calendar.date(byAdding: .month, value: 1, to: lastDayOfPeriod),
              let range = calendar.range(of: .day, in: .month, for: inFollowingMonth) else { return nil }
        var components = calendar.dateComponents([.year, .month], from: inFollowingMonth)
        components.day = range.count
        return calendar.date(from: components)
    }

    // MARK: - TVA

    private func vatDeadlines(
        entries: [RevenueEntry], settings: MicroSettings, around referenceDate: Date
    ) -> [Deadline] {
        periods(for: .monthly, around: referenceDate).compactMap { period in
            // Ici la borne exclusive tombe déjà sur le mois suivant, qui est
            // précisément le mois de la déclaration.
            var components = calendar.dateComponents([.year, .month], from: period.range.upperBound)
            components.day = 24
            guard let dueDate = calendar.date(from: components) else { return nil }
            let periodEntries = entries.filter { period.range.contains($0.date) }
            let breakdown = calculator.breakdown(for: periodEntries, settings: settings)
            guard breakdown.vat.isPositive else { return nil }
            return Deadline(
                id: "vat-\(period.label)",
                kind: .vat,
                periodLabel: period.label,
                periodRange: period.range,
                dueDate: dueDate,
                estimatedAmount: breakdown.vat.roundedToEuro
            )
        }
    }

    // MARK: - CFE

    private func cfeDeadlines(settings: MicroSettings, around referenceDate: Date) -> [Deadline] {
        let years = [
            calendar.component(.year, from: referenceDate),
            calendar.component(.year, from: referenceDate) + 1
        ]
        return years.compactMap { year -> Deadline? in
            // La première année d'activité est exonérée de CFE.
            guard year > settings.activityStartYear, settings.expectedCFE.isPositive else { return nil }
            var components = DateComponents()
            components.year = year
            components.month = 12
            components.day = 15
            guard let dueDate = calendar.date(from: components),
                  let start = calendar.date(from: DateComponents(year: year, month: 1, day: 1)),
                  let end = calendar.date(from: DateComponents(year: year + 1, month: 1, day: 1))
            else { return nil }
            return Deadline(
                id: "cfe-\(year)",
                kind: .cfe,
                periodLabel: "Année \(year)",
                periodRange: start..<end,
                dueDate: dueDate,
                estimatedAmount: settings.expectedCFE
            )
        }
    }

    // MARK: - Découpage des périodes

    private struct Period {
        let label: String
        let range: Range<Date>
    }

    /// Les périodes couvrant l'année en cours et le début de la suivante, afin
    /// que la déclaration de fin d'année reste visible en janvier.
    private func periods(for periodicity: DeclarationPeriodicity, around date: Date) -> [Period] {
        let year = calendar.component(.year, from: date)
        var result: [Period] = []
        for candidateYear in [year - 1, year, year + 1] {
            switch periodicity {
            case .monthly:
                for month in 1...12 {
                    if let period = monthlyPeriod(year: candidateYear, month: month) {
                        result.append(period)
                    }
                }
            case .quarterly:
                for quarter in 1...4 {
                    if let period = quarterlyPeriod(year: candidateYear, quarter: quarter) {
                        result.append(period)
                    }
                }
            }
        }
        return result
    }

    private func monthlyPeriod(year: Int, month: Int) -> Period? {
        guard let start = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
              let end = calendar.date(byAdding: .month, value: 1, to: start) else { return nil }
        return Period(label: "\(Self.monthNames[month - 1]) \(year)", range: start..<end)
    }

    private func quarterlyPeriod(year: Int, quarter: Int) -> Period? {
        let startMonth = (quarter - 1) * 3 + 1
        guard let start = calendar.date(from: DateComponents(year: year, month: startMonth, day: 1)),
              let end = calendar.date(byAdding: .month, value: 3, to: start) else { return nil }
        let ordinal = quarter == 1 ? "1ᵉʳ" : "\(quarter)ᵉ"
        return Period(label: "\(ordinal) trimestre \(year)", range: start..<end)
    }

    static let monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ]

    /// Abréviations explicites plutôt qu'une troncature : « Juin » et
    /// « Juillet » se réduiraient tous deux à « Jui », rendant deux colonnes du
    /// graphique impossibles à distinguer.
    static let shortMonthNames = [
        "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
        "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
    ]
}
