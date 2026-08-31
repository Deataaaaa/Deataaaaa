import Foundation
import Observation
import StoreKit

/// L'accès dont dispose l'utilisateur.
enum AccessLevel: Equatable {
    case free
    case pro

    var isPro: Bool { self == .pro }
}

/// Gère l'abonnement : chargement des offres, achat, restauration et suivi des
/// droits en cours.
///
/// Le modèle économique tient en une phrase : la saisie est gratuite jusqu'à un
/// certain volume, l'usage professionnel est payant. Une app qui bloque au
/// premier encaissement n'a aucune chance d'être adoptée.
@MainActor
@Observable
final class SubscriptionStore {

    /// Au-delà, la saisie demande un abonnement. Volontairement large : c'est
    /// environ un an d'activité d'un indépendant qui démarre.
    static let freeEntryLimit = 30

    static let productIdentifiers = [
        "com.deataaaaa.pecule.pro.monthly",
        "com.deataaaaa.pecule.pro.yearly"
    ]

    private(set) var products: [Product] = []
    private(set) var accessLevel: AccessLevel = .free
    private(set) var isLoadingProducts = false
    private(set) var purchaseError: String?

    /// `true` quand les offres n'ont pas pu être chargées — hors ligne, ou
    /// identifiants pas encore déclarés sur App Store Connect.
    var hasProductsUnavailable: Bool { !isLoadingProducts && products.isEmpty }

    /// Hors du suivi d'observation : c'est de la plomberie, aucune vue n'en dépend.
    @ObservationIgnored private var updatesTask: Task<Void, Never>?

    init() {
        // L'écoute doit démarrer avant tout achat, sinon une transaction
        // conclue en dehors de l'app (renouvellement, achat sur un autre
        // appareil) serait manquée.
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                guard case .verified(let transaction) = update else { continue }
                await transaction.finish()
                await self?.refreshEntitlements()
            }
        }
    }

    func start() async {
        await loadProducts()
        await refreshEntitlements()
    }

    func loadProducts() async {
        isLoadingProducts = true
        defer { isLoadingProducts = false }
        do {
            let loaded = try await Product.products(for: Self.productIdentifiers)
            products = loaded.sorted { $0.price < $1.price }
        } catch {
            products = []
        }
    }

    func refreshEntitlements() async {
        var level = AccessLevel.free
        for await entitlement in Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement else { continue }
            guard transaction.revocationDate == nil else { continue }
            if Self.productIdentifiers.contains(transaction.productID) {
                level = .pro
            }
        }
        accessLevel = level
    }

    /// - Returns: `true` si l'achat a abouti.
    @discardableResult
    func purchase(_ product: Product) async -> Bool {
        purchaseError = nil
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                guard case .verified(let transaction) = verification else {
                    purchaseError = "Cet achat n'a pas pu être vérifié par l'App Store."
                    return false
                }
                await transaction.finish()
                await refreshEntitlements()
                return true

            case .userCancelled:
                return false

            case .pending:
                purchaseError = "L'achat est en attente de validation."
                return false

            @unknown default:
                return false
            }
        } catch {
            purchaseError = error.localizedDescription
            return false
        }
    }

    func restore() async {
        do {
            try await AppStore.sync()
        } catch {
            purchaseError = error.localizedDescription
        }
        await refreshEntitlements()
    }

    /// Peut-on encore ajouter un encaissement ?
    func canAddEntry(currentCount: Int) -> Bool {
        accessLevel.isPro || currentCount < Self.freeEntryLimit
    }

    func remainingFreeEntries(currentCount: Int) -> Int {
        max(0, Self.freeEntryLimit - currentCount)
    }

    func clearError() {
        purchaseError = nil
    }
}
