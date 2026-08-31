import SwiftUI
import StoreKit
import PeculeCore

struct PaywallView: View {

    @Environment(SubscriptionStore.self) private var subscriptionStore
    @Environment(\.dismiss) private var dismiss

    @State private var selectedProduct: Product?
    @State private var isPurchasing = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    header
                    benefits
                    offers
                    legal
                }
                .padding(20)
            }
            .navigationTitle("Pécule Pro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Restaurer") {
                        Task { await subscriptionStore.restore() }
                    }
                    .font(.footnote)
                }
            }
            .alert(
                "Achat impossible",
                isPresented: Binding(
                    get: { subscriptionStore.purchaseError != nil },
                    set: { if !$0 { subscriptionStore.clearError() } }
                )
            ) {
                Button("OK", role: .cancel) { subscriptionStore.clearError() }
            } message: {
                Text(subscriptionStore.purchaseError ?? "")
            }
            .task {
                if subscriptionStore.products.isEmpty {
                    await subscriptionStore.loadProducts()
                }
                selectedProduct = subscriptionStore.products.last
            }
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Image(systemName: "shield.lefthalf.filled")
                .font(.system(size: 48))
                .foregroundStyle(Palette.available)

            Text("Ne plus jamais être surpris par une échéance")
                .font(.title2.weight(.semibold))
                .multilineTextAlignment(.center)

            Text("""
            Gratuit jusqu'à \(SubscriptionStore.freeEntryLimit) encaissements. \
            Au-delà, l'abonnement débloque le suivi complet.
            """)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
        }
    }

    private var benefits: some View {
        VStack(alignment: .leading, spacing: 14) {
            benefit("infinity", "Encaissements illimités",
                    "Aucune limite de saisie, année après année.")
            benefit("bell.badge", "Alertes de seuil",
                    "Prévenu avant de franchir la franchise de TVA ou le plafond micro.")
            benefit("chart.line.uptrend.xyaxis", "Projections",
                    "Ce que donnera ton année au rythme actuel.")
            benefit("lock.shield", "Tes données restent sur ton téléphone",
                    "Aucun compte, aucun serveur, aucune connexion bancaire.")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func benefit(_ symbol: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol)
                .font(.body)
                .frame(width: 28)
                .foregroundStyle(Palette.available)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.medium))
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var offers: some View {
        if subscriptionStore.isLoadingProducts {
            ProgressView().frame(height: 120)
        } else if subscriptionStore.hasProductsUnavailable {
            // Cas courant en développement : les identifiants ne sont pas
            // encore déclarés sur App Store Connect. On l'annonce plutôt que
            // de laisser un écran vide inexplicable.
            Card {
                Label("Offres indisponibles", systemImage: "wifi.exclamationmark")
                    .font(.subheadline.weight(.medium))
                Text("""
                Les abonnements n'ont pas pu être chargés. Vérifie ta connexion, \
                ou que les produits sont bien déclarés sur App Store Connect.
                """)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        } else {
            VStack(spacing: 10) {
                ForEach(subscriptionStore.products, id: \.id) { product in
                    ProductRow(
                        product: product,
                        isSelected: selectedProduct?.id == product.id,
                        onTap: { selectedProduct = product }
                    )
                }

                Button {
                    guard let selectedProduct else { return }
                    isPurchasing = true
                    Task {
                        let succeeded = await subscriptionStore.purchase(selectedProduct)
                        isPurchasing = false
                        if succeeded { dismiss() }
                    }
                } label: {
                    Group {
                        if isPurchasing {
                            ProgressView()
                        } else {
                            Text("S'abonner")
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(selectedProduct == nil || isPurchasing)
            }
        }
    }

    private var legal: some View {
        Text("""
        L'abonnement se renouvelle automatiquement sauf résiliation au moins \
        24 heures avant la fin de la période en cours. Résiliable à tout moment \
        dans les réglages de ton compte App Store.
        """)
        .font(.caption2)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
}

struct ProductRow: View {

    let product: Product
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(product.displayName)
                        .font(.subheadline.weight(.medium))
                    Text(product.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(product.displayPrice)
                    .font(.headline.monospacedDigit())
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(isSelected ? Palette.available : Color.secondary.opacity(0.3), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
        .foregroundStyle(.primary)
    }
}
