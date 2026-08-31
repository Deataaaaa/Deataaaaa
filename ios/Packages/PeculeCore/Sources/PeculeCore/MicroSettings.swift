import Foundation

/// La périodicité de déclaration choisie auprès de l'URSSAF.
public enum DeclarationPeriodicity: String, CaseIterable, Sendable, Codable, Identifiable {
    case monthly
    case quarterly

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .monthly: "Mensuelle"
        case .quarterly: "Trimestrielle"
        }
    }
}

/// Comment l'impôt sur le revenu est provisionné.
public enum IncomeTaxMode: Hashable, Sendable, Codable {

    /// Versement libératoire : un pourcentage fixe du CA, prélevé avec les
    /// cotisations.
    case flatRate

    /// Barème classique : le CA est abattu forfaitairement, puis le revenu
    /// imposable est soumis à la tranche marginale du foyer.
    case marginalBracket(Rate)

    /// L'impôt n'est pas provisionné par l'application. Nommé explicitement
    /// pour ne pas entrer en collision avec `Optional.none`.
    case notProvisioned
}

/// La configuration complète de l'utilisateur : c'est l'unique source de vérité
/// des calculs.
public struct MicroSettings: Hashable, Sendable, Codable {

    public var activity: ActivityKind
    public var rates: RateTable
    public var periodicity: DeclarationPeriodicity
    public var incomeTaxMode: IncomeTaxMode

    /// L'utilisateur a dépassé la franchise et facture désormais la TVA.
    public var isVATRegistered: Bool

    /// Année de début d'activité, utilisée pour l'exonération de CFE la
    /// première année et pour le prorata du plafond.
    public var activityStartYear: Int

    /// Montant de CFE attendu, saisi par l'utilisateur (il est très variable
    /// d'une commune à l'autre, donc jamais deviné).
    public var expectedCFE: Money

    /// Marge de sécurité ajoutée à la provision, en pourcentage. Beaucoup
    /// d'indépendants préfèrent garder un coussin.
    public var safetyMargin: Rate

    public init(
        activity: ActivityKind = .prestationBNC,
        rates: RateTable? = nil,
        periodicity: DeclarationPeriodicity = .quarterly,
        incomeTaxMode: IncomeTaxMode = .flatRate,
        isVATRegistered: Bool = false,
        activityStartYear: Int = Calendar(identifier: .gregorian).component(.year, from: Date()),
        expectedCFE: Money = .zero,
        safetyMargin: Rate = .zero
    ) {
        self.activity = activity
        self.rates = rates ?? RateTable.defaults(for: activity)
        self.periodicity = periodicity
        self.incomeTaxMode = incomeTaxMode
        self.isVATRegistered = isVATRegistered
        self.activityStartYear = activityStartYear
        self.expectedCFE = expectedCFE
        self.safetyMargin = safetyMargin
    }

    /// Remet les taux aux valeurs par défaut de l'activité choisie.
    public mutating func resetRatesToDefaults() {
        rates = RateTable.defaults(for: activity)
    }

    /// Bascule d'activité en réalignant les taux, sauf si l'utilisateur les a
    /// personnalisés.
    public mutating func changeActivity(to newActivity: ActivityKind, keepingCustomRates: Bool) {
        let wasCustom = rates != RateTable.defaults(for: activity)
        activity = newActivity
        if !(keepingCustomRates && wasCustom) {
            rates = RateTable.defaults(for: newActivity)
        }
    }
}
