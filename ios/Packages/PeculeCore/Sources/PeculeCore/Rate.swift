import Foundation

/// Un taux exprimé en pourcentage.
///
/// Stocké sous forme de fraction (21,2 % -> 0,212) mais toujours construit et
/// affiché en pourcentage, parce que c'est ce que l'utilisateur lit sur les
/// documents de l'URSSAF.
public struct Rate: Hashable, Sendable, Codable, Comparable {

    /// La fraction, entre 0 et 1 pour un taux usuel.
    public let fraction: Decimal

    public init(fraction: Decimal) {
        self.fraction = fraction
    }

    /// `Rate(percent: Decimal(string: "21.2")!)` pour 21,2 %.
    ///
    /// Réservé aux valeurs saisies par l'utilisateur, déjà décimales exactes.
    public init(percent: Decimal) {
        self.fraction = percent / 100
    }

    /// `Rate(basisPoints: 2120)` pour 21,2 %.
    ///
    /// Les taux constants passent par ici plutôt que par un littéral flottant :
    /// `Decimal(21.2)` transite par un `Double` et peut réintroduire l'erreur
    /// binaire que `Decimal` sert justement à éliminer. Un entier reste exact.
    public init(basisPoints: Int) {
        self.fraction = Decimal(basisPoints) / 10_000
    }

    public static let zero = Rate(fraction: 0)

    public var percent: Decimal { fraction * 100 }

    public var isZero: Bool { fraction == 0 }

    public static func + (lhs: Rate, rhs: Rate) -> Rate {
        Rate(fraction: lhs.fraction + rhs.fraction)
    }

    public static func < (lhs: Rate, rhs: Rate) -> Bool {
        lhs.fraction < rhs.fraction
    }

    /// Le taux effectif d'un montant prélevé sur une base.
    public static func effective(part: Money, of base: Money) -> Rate {
        guard base.amount != 0 else { return .zero }
        return Rate(fraction: part.amount / base.amount)
    }
}

extension Rate: CustomStringConvertible {
    public var description: String { "\(percent) %" }
}
