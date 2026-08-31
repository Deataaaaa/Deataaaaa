import Foundation

/// L'ensemble des taux et seuils appliqués à une activité donnée.
///
/// - Important: les valeurs par défaut fournies par `RateTable.defaults(for:)`
///   sont des **repères indicatifs** et non une source officielle. Les taux de
///   cotisations, les plafonds de la micro-entreprise et les seuils de franchise
///   de TVA sont révisés régulièrement par le législateur. L'application est
///   conçue pour que l'utilisateur puisse **corriger chaque valeur** dans les
///   réglages ; c'est cette table modifiée qui fait foi côté calcul.
public struct RateTable: Hashable, Sendable, Codable {

    /// Cotisations sociales URSSAF, en pourcentage du chiffre d'affaires encaissé.
    public var socialContributions: Rate

    /// Contribution à la formation professionnelle, également assise sur le CA.
    public var trainingContribution: Rate

    /// Taux du versement libératoire de l'impôt sur le revenu, quand l'option
    /// est retenue.
    public var flatIncomeTax: Rate

    /// Abattement forfaitaire pour frais professionnels, appliqué au CA pour
    /// obtenir le revenu imposable quand le versement libératoire n'est **pas**
    /// retenu.
    public var incomeAllowance: Rate

    /// Plafond de chiffre d'affaires annuel du régime micro.
    public var microCeiling: Money

    /// Seuil de base de la franchise en base de TVA.
    public var vatFranchiseThreshold: Money

    /// Seuil majoré de la franchise en base de TVA : au-delà, la TVA devient
    /// exigible immédiatement.
    public var vatIncreasedThreshold: Money

    /// Taux de TVA appliqué une fois assujetti.
    public var vatRate: Rate

    public init(
        socialContributions: Rate,
        trainingContribution: Rate,
        flatIncomeTax: Rate,
        incomeAllowance: Rate,
        microCeiling: Money,
        vatFranchiseThreshold: Money,
        vatIncreasedThreshold: Money,
        vatRate: Rate = Rate(basisPoints: 2000)
    ) {
        self.socialContributions = socialContributions
        self.trainingContribution = trainingContribution
        self.flatIncomeTax = flatIncomeTax
        self.incomeAllowance = incomeAllowance
        self.microCeiling = microCeiling
        self.vatFranchiseThreshold = vatFranchiseThreshold
        self.vatIncreasedThreshold = vatIncreasedThreshold
        self.vatRate = vatRate
    }

    /// Repères par défaut, à vérifier et ajuster dans les réglages.
    public static func defaults(for activity: ActivityKind) -> RateTable {
        switch activity {
        case .venteMarchandises:
            RateTable(
                socialContributions: Rate(basisPoints: 1230),
                trainingContribution: Rate(basisPoints: 10),
                flatIncomeTax: Rate(basisPoints: 100),
                incomeAllowance: Rate(basisPoints: 7100),
                microCeiling: Money(188_700),
                vatFranchiseThreshold: Money(85_000),
                vatIncreasedThreshold: Money(93_500)
            )
        case .prestationBIC:
            RateTable(
                socialContributions: Rate(basisPoints: 2120),
                trainingContribution: Rate(basisPoints: 30),
                flatIncomeTax: Rate(basisPoints: 170),
                incomeAllowance: Rate(basisPoints: 5000),
                microCeiling: Money(77_700),
                vatFranchiseThreshold: Money(37_500),
                vatIncreasedThreshold: Money(41_250)
            )
        case .prestationBNC:
            RateTable(
                socialContributions: Rate(basisPoints: 2610),
                trainingContribution: Rate(basisPoints: 20),
                flatIncomeTax: Rate(basisPoints: 220),
                incomeAllowance: Rate(basisPoints: 3400),
                microCeiling: Money(77_700),
                vatFranchiseThreshold: Money(37_500),
                vatIncreasedThreshold: Money(41_250)
            )
        }
    }

    /// Réduction ACRE : abat le taux de cotisations sans toucher au reste.
    public func applyingACRE(reduction: Rate) -> RateTable {
        var copy = self
        let reduced = socialContributions.fraction * (1 - reduction.fraction)
        copy.socialContributions = Rate(fraction: max(0, reduced))
        return copy
    }
}
