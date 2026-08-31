import Foundation
import SwiftData
import PeculeCore

/// Un encaissement tel qu'il est stocké sur l'appareil.
///
/// Le modèle persistant est volontairement distinct de `RevenueEntry` : le
/// coeur métier reste une bibliothèque pure, sans dépendance à SwiftData, ce
/// qui permet de le tester sans base de données.
@Model
final class StoredEntry {

    var identifier: UUID = UUID()
    var date: Date = Date()
    var amount: Decimal = Decimal.zero
    var client: String = ""
    var reference: String = ""

    /// `nil` quand l'encaissement suit l'activité principale.
    var activityRaw: String?

    var createdAt: Date = Date()

    init(
        identifier: UUID = UUID(),
        date: Date,
        amount: Decimal,
        client: String = "",
        reference: String = "",
        activity: ActivityKind? = nil
    ) {
        self.identifier = identifier
        self.date = date
        self.amount = amount
        self.client = client
        self.reference = reference
        self.activityRaw = activity?.rawValue
        self.createdAt = Date()
    }

    var activity: ActivityKind? {
        get { activityRaw.flatMap(ActivityKind.init(rawValue:)) }
        set { activityRaw = newValue?.rawValue }
    }

    /// La projection vers le type manipulé par les calculs.
    var asRevenueEntry: RevenueEntry {
        RevenueEntry(
            id: identifier,
            date: date,
            grossAmount: Money(amount),
            client: client,
            reference: reference,
            activity: activity
        )
    }
}

extension Sequence where Element == StoredEntry {
    var asRevenueEntries: [RevenueEntry] { map(\.asRevenueEntry) }
}
