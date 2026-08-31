import Foundation

/// L'état d'un seuil réglementaire par rapport au chiffre d'affaires réalisé.
public enum ThresholdStatus: Hashable, Sendable {

    /// Moins de 75 % du seuil consommé.
    case comfortable

    /// Entre 75 % et 100 % : le dépassement devient une hypothèse sérieuse.
    case approaching

    /// Seuil franchi.
    case exceeded

    public var isWarning: Bool { self != .comfortable }
}

/// Le suivi d'un seuil : où on en est, ce qu'il reste, et quand on le touchera
/// au rythme actuel.
public struct ThresholdProgress: Hashable, Sendable, Identifiable {

    public let id: String
    public let title: String
    public let explanation: String
    public let current: Money
    public let limit: Money
    public let status: ThresholdStatus

    /// Date estimée de franchissement, extrapolée du rythme constaté.
    /// `nil` si le seuil est déjà franchi ou si le rythme ne permet pas de
    /// l'atteindre dans l'année.
    public let projectedCrossing: Date?

    public var remaining: Money {
        (limit - current).clampedToZero
    }

    /// Part du seuil consommée, bornée à 1 pour l'affichage d'une jauge.
    public var completion: Double {
        guard limit.amount > 0 else { return 0 }
        let ratio = (current.amount / limit.amount).doubleValueClamped
        return min(max(ratio, 0), 1)
    }

    public init(
        id: String, title: String, explanation: String,
        current: Money, limit: Money, status: ThresholdStatus,
        projectedCrossing: Date?
    ) {
        self.id = id
        self.title = title
        self.explanation = explanation
        self.current = current
        self.limit = limit
        self.status = status
        self.projectedCrossing = projectedCrossing
    }
}

private extension Decimal {
    var doubleValueClamped: Double {
        NSDecimalNumber(decimal: self).doubleValue
    }
}

/// Surveille les seuils qui font basculer de régime : franchise de TVA et
/// plafond de la micro-entreprise.
///
/// C'est le point aveugle le plus coûteux pour un indépendant : on découvre le
/// dépassement au moment de la déclaration, alors qu'il fallait facturer la TVA
/// depuis des semaines.
public struct ThresholdMonitor: Sendable {

    /// Part du seuil à partir de laquelle on alerte : trois quarts.
    static let warningRatio = Decimal(3) / Decimal(4)

    private let calendar: Calendar

    public init(calendar: Calendar = .gregorianUTC) {
        self.calendar = calendar
    }

    /// Construit les jauges à afficher pour l'année en cours.
    ///
    /// - Parameters:
    ///   - yearToDateRevenue: CA hors taxes encaissé depuis le 1er janvier.
    ///   - settings: les réglages de l'utilisateur (seuils inclus).
    ///   - referenceDate: la date « aujourd'hui », injectable pour les tests.
    public func progress(
        yearToDateRevenue: Money,
        settings: MicroSettings,
        referenceDate: Date
    ) -> [ThresholdProgress] {

        let dailyRate = averageDailyRate(revenue: yearToDateRevenue, on: referenceDate)
        var result: [ThresholdProgress] = []

        if !settings.isVATRegistered {
            result.append(
                make(
                    id: "vat-franchise",
                    title: "Franchise en base de TVA",
                    explanation: "Au-delà, tu dois facturer la TVA à tes clients et la reverser.",
                    current: yearToDateRevenue,
                    limit: settings.rates.vatFranchiseThreshold,
                    dailyRate: dailyRate,
                    referenceDate: referenceDate
                )
            )
            result.append(
                make(
                    id: "vat-increased",
                    title: "Seuil majoré de TVA",
                    explanation: "Ce seuil-là ne pardonne pas : la TVA devient due immédiatement.",
                    current: yearToDateRevenue,
                    limit: settings.rates.vatIncreasedThreshold,
                    dailyRate: dailyRate,
                    referenceDate: referenceDate
                )
            )
        }

        result.append(
            make(
                id: "micro-ceiling",
                title: "Plafond de la micro-entreprise",
                explanation: "Deux années consécutives au-dessus et tu bascules au régime réel.",
                current: yearToDateRevenue,
                limit: settings.rates.microCeiling,
                dailyRate: dailyRate,
                referenceDate: referenceDate
            )
        )

        return result
    }

    /// Les seuils qui méritent d'être remontés à l'utilisateur.
    public func warnings(
        yearToDateRevenue: Money,
        settings: MicroSettings,
        referenceDate: Date
    ) -> [ThresholdProgress] {
        progress(yearToDateRevenue: yearToDateRevenue, settings: settings, referenceDate: referenceDate)
            .filter(\.status.isWarning)
    }

    // MARK: - Détail

    private func make(
        id: String, title: String, explanation: String,
        current: Money, limit: Money,
        dailyRate: Decimal, referenceDate: Date
    ) -> ThresholdProgress {

        let status: ThresholdStatus
        if current >= limit {
            status = .exceeded
        } else if limit.amount > 0, current.amount / limit.amount >= Self.warningRatio {
            status = .approaching
        } else {
            status = .comfortable
        }

        return ThresholdProgress(
            id: id, title: title, explanation: explanation,
            current: current, limit: limit, status: status,
            projectedCrossing: status == .exceeded
                ? nil
                : projectedCrossing(from: current, to: limit, dailyRate: dailyRate, referenceDate: referenceDate)
        )
    }

    /// Le CA moyen par jour écoulé depuis le début de l'année.
    private func averageDailyRate(revenue: Money, on date: Date) -> Decimal {
        let day = calendar.ordinality(of: .day, in: .year, for: date) ?? 1
        guard day > 0 else { return 0 }
        return revenue.amount / Decimal(day)
    }

    /// Extrapole linéairement la date de franchissement, en restant dans
    /// l'année civile : au-delà, la projection n'a plus de sens puisque les
    /// compteurs sont remis à zéro.
    private func projectedCrossing(
        from current: Money, to limit: Money,
        dailyRate: Decimal, referenceDate: Date
    ) -> Date? {
        guard dailyRate > 0 else { return nil }
        let remaining = limit.amount - current.amount
        guard remaining > 0 else { return nil }

        let daysNeeded = NSDecimalNumber(decimal: remaining / dailyRate).doubleValue
        guard daysNeeded.isFinite, daysNeeded < 3_650 else { return nil }

        guard let crossing = calendar.date(
            byAdding: .day,
            value: Int(daysNeeded.rounded(.up)),
            to: referenceDate
        ) else { return nil }

        let currentYear = calendar.component(.year, from: referenceDate)
        let crossingYear = calendar.component(.year, from: crossing)
        return crossingYear == currentYear ? crossing : nil
    }
}

extension Calendar {
    /// Calendrier stable pour tous les calculs de périodes : les échéances
    /// fiscales sont des dates civiles, pas des instants, donc on évite les
    /// surprises de fuseau.
    public static var gregorianUTC: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
        return calendar
    }
}
