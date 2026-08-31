import Foundation

/// Un montant en euros.
///
/// Adossé à `Decimal` et non à `Double` : sur de l'argent, le binaire flottant
/// accumule des erreurs d'arrondi (0,1 + 0,2 != 0,3). Tous les calculs de
/// provision passent par ce type.
public struct Money: Hashable, Sendable, Codable, Comparable {

    public let amount: Decimal

    public init(_ amount: Decimal) {
        self.amount = amount
    }

    public init(_ amount: Int) {
        self.amount = Decimal(amount)
    }

    /// Construit un montant depuis des centimes, pour éviter tout littéral flottant.
    public init(cents: Int) {
        self.amount = Decimal(cents) / 100
    }

    public static let zero = Money(0)

    public var isZero: Bool { amount == 0 }
    public var isPositive: Bool { amount > 0 }

    /// Le montant arrondi au centime (arrondi commercial).
    public var rounded: Money {
        var input = amount
        var output = Decimal()
        NSDecimalRound(&output, &input, 2, .plain)
        return Money(output)
    }

    /// Le montant arrondi à l'euro, utilisé pour l'affichage des provisions.
    public var roundedToEuro: Money {
        var input = amount
        var output = Decimal()
        NSDecimalRound(&output, &input, 0, .plain)
        return Money(output)
    }

    /// Valeur `Double`, uniquement pour l'affichage graphique (Swift Charts).
    /// Ne jamais l'utiliser pour un calcul.
    public var doubleValue: Double {
        NSDecimalNumber(decimal: amount).doubleValue
    }

    public static func + (lhs: Money, rhs: Money) -> Money { Money(lhs.amount + rhs.amount) }
    public static func - (lhs: Money, rhs: Money) -> Money { Money(lhs.amount - rhs.amount) }
    public static func * (lhs: Money, rhs: Decimal) -> Money { Money(lhs.amount * rhs) }
    public static func / (lhs: Money, rhs: Decimal) -> Money { Money(lhs.amount / rhs) }
    public static func += (lhs: inout Money, rhs: Money) { lhs = lhs + rhs }
    public static func < (lhs: Money, rhs: Money) -> Bool { lhs.amount < rhs.amount }

    /// Applique un taux et arrondit au centime.
    public func applying(_ rate: Rate) -> Money {
        Money(amount * rate.fraction).rounded
    }

    /// Ne descend jamais sous zéro. Utile quand une provision dépasse
    /// l'encaissement (cas limite d'un taux mal saisi).
    public var clampedToZero: Money {
        amount < 0 ? .zero : self
    }
}

extension Money: CustomStringConvertible {
    public var description: String { "\(amount) €" }
}

extension Money {
    /// Somme d'une séquence de montants.
    public static func total(_ values: some Sequence<Money>) -> Money {
        values.reduce(Money.zero, +)
    }
}
