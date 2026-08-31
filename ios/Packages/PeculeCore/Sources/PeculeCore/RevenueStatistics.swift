import Foundation

/// Le chiffre d'affaires d'un mois, pour le graphique du tableau de bord.
public struct MonthlyRevenue: Hashable, Sendable, Identifiable {
    public let id: String
    public let month: Date
    public let label: String
    public let gross: Money
    public let available: Money

    public init(month: Date, label: String, gross: Money, available: Money) {
        self.id = label
        self.month = month
        self.label = label
        self.gross = gross
        self.available = available
    }
}

/// La photographie de l'année en cours.
public struct YearSummary: Hashable, Sendable {
    public let year: Int
    public let breakdown: ProvisionBreakdown
    public let entryCount: Int

    /// Projection linéaire du CA de fin d'année au rythme constaté.
    public let projectedYearEndRevenue: Money

    /// Moyenne mensuelle sur les mois écoulés.
    public let monthlyAverage: Money

    public init(
        year: Int, breakdown: ProvisionBreakdown, entryCount: Int,
        projectedYearEndRevenue: Money, monthlyAverage: Money
    ) {
        self.year = year
        self.breakdown = breakdown
        self.entryCount = entryCount
        self.projectedYearEndRevenue = projectedYearEndRevenue
        self.monthlyAverage = monthlyAverage
    }
}

/// Agrège les encaissements pour l'affichage.
public struct RevenueStatistics: Sendable {

    private let calendar: Calendar
    private let calculator = ProvisionCalculator()

    public init(calendar: Calendar = .gregorianUTC) {
        self.calendar = calendar
    }

    /// Les encaissements de l'année civile de `date`.
    public func entriesOfYear(_ entries: [RevenueEntry], containing date: Date) -> [RevenueEntry] {
        let year = calendar.component(.year, from: date)
        return entries.filter { calendar.component(.year, from: $0.date) == year }
    }

    /// Le résumé annuel, projection comprise.
    public func yearSummary(
        entries: [RevenueEntry], settings: MicroSettings, referenceDate: Date
    ) -> YearSummary {
        let year = calendar.component(.year, from: referenceDate)
        let yearEntries = entriesOfYear(entries, containing: referenceDate)
        let breakdown = calculator.breakdown(for: yearEntries, settings: settings)

        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: referenceDate) ?? 1
        let daysInYear = calendar.range(of: .day, in: .year, for: referenceDate)?.count ?? 365

        let projected: Money
        if dayOfYear > 0 {
            projected = Money(breakdown.netOfVAT.amount / Decimal(dayOfYear) * Decimal(daysInYear)).roundedToEuro
        } else {
            projected = breakdown.netOfVAT
        }

        let elapsedMonths = max(1, calendar.component(.month, from: referenceDate))
        let average = Money(breakdown.netOfVAT.amount / Decimal(elapsedMonths)).roundedToEuro

        return YearSummary(
            year: year,
            breakdown: breakdown,
            entryCount: yearEntries.count,
            projectedYearEndRevenue: projected,
            monthlyAverage: average
        )
    }

    /// Les `count` derniers mois, y compris les mois sans encaissement — un trou
    /// dans la courbe est une information, pas un mois à masquer.
    public func monthlyBreakdown(
        entries: [RevenueEntry], settings: MicroSettings,
        endingAt referenceDate: Date, count: Int = 12
    ) -> [MonthlyRevenue] {
        guard count > 0 else { return [] }
        var months: [MonthlyRevenue] = []

        for offset in stride(from: count - 1, through: 0, by: -1) {
            guard let anchor = calendar.date(byAdding: .month, value: -offset, to: referenceDate),
                  let start = calendar.date(from: calendar.dateComponents([.year, .month], from: anchor)),
                  let end = calendar.date(byAdding: .month, value: 1, to: start)
            else { continue }

            let monthEntries = entries.filter { (start..<end).contains($0.date) }
            let breakdown = calculator.breakdown(for: monthEntries, settings: settings)
            let monthIndex = calendar.component(.month, from: start)
            let year = calendar.component(.year, from: start)
            let label = "\(DeadlineScheduler.shortMonthNames[monthIndex - 1]) \(year % 100)"

            months.append(
                MonthlyRevenue(
                    month: start,
                    label: label,
                    gross: breakdown.gross,
                    available: breakdown.available
                )
            )
        }
        return months
    }

    /// Répartition du CA par client, du plus gros au plus petit.
    ///
    /// Sert d'indicateur de dépendance : un client à 70 % du CA est un risque,
    /// pas une réussite.
    public func revenueByClient(
        entries: [RevenueEntry], limit: Int = 5
    ) -> [(client: String, amount: Money)] {
        var totals: [String: Money] = [:]
        for entry in entries {
            let name = entry.client.trimmingCharacters(in: .whitespacesAndNewlines)
            let key = name.isEmpty ? "Sans client" : name
            totals[key, default: .zero] += entry.grossAmount
        }
        return totals
            .map { (client: $0.key, amount: $0.value) }
            .sorted { $0.amount > $1.amount }
            .prefix(limit)
            .map { $0 }
    }
}
