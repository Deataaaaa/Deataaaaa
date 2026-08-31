import Foundation

/// Un encaissement.
///
/// En micro-entreprise, seul l'encaissement compte : une facture émise mais non
/// payée ne génère ni cotisation ni impôt. C'est donc la date de **paiement**
/// qui est stockée.
public struct RevenueEntry: Hashable, Sendable, Codable, Identifiable {

    public let id: UUID

    /// Date d'encaissement effectif.
    public var date: Date

    /// Montant encaissé, TVA comprise si l'utilisateur est assujetti.
    public var grossAmount: Money

    /// Nom du client, libre.
    public var client: String

    /// Référence de facture, libre.
    public var reference: String

    /// Permet de rattacher un encaissement à une activité différente de
    /// l'activité principale (cas d'une activité mixte).
    public var activity: ActivityKind?

    public init(
        id: UUID = UUID(),
        date: Date,
        grossAmount: Money,
        client: String = "",
        reference: String = "",
        activity: ActivityKind? = nil
    ) {
        self.id = id
        self.date = date
        self.grossAmount = grossAmount
        self.client = client
        self.reference = reference
        self.activity = activity
    }

    /// L'activité effective de la ligne, en retombant sur celle des réglages.
    public func resolvedActivity(using settings: MicroSettings) -> ActivityKind {
        activity ?? settings.activity
    }
}
