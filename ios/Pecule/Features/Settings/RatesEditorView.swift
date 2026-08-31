import SwiftUI
import PeculeCore

/// Permet de corriger chaque taux et chaque seuil.
///
/// C'est l'écran qui rend l'application honnête : plutôt que de prétendre
/// détenir des valeurs officielles à jour, elle affiche des repères et laisse
/// l'utilisateur les aligner sur sa situation réelle.
struct RatesEditorView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        @Bindable var store = settingsStore

        NavigationStack {
            Form {
                Section {
                    Text(Disclaimer.text)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Prélèvements sur le chiffre d'affaires") {
                    RateRow(title: "Cotisations URSSAF", rate: $store.settings.rates.socialContributions)
                    RateRow(title: "Formation professionnelle", rate: $store.settings.rates.trainingContribution)
                    RateRow(title: "Versement libératoire", rate: $store.settings.rates.flatIncomeTax)
                }

                Section {
                    RateRow(title: "Abattement forfaitaire", rate: $store.settings.rates.incomeAllowance)
                } header: {
                    Text("Impôt au barème")
                } footer: {
                    Text("Part du chiffre d'affaires déduite avant application de ta tranche marginale.")
                }

                Section("Seuils annuels") {
                    MoneyRow(title: "Plafond micro-entreprise", amount: $store.settings.rates.microCeiling)
                    MoneyRow(title: "Franchise en base de TVA", amount: $store.settings.rates.vatFranchiseThreshold)
                    MoneyRow(title: "Seuil majoré de TVA", amount: $store.settings.rates.vatIncreasedThreshold)
                    RateRow(title: "Taux de TVA", rate: $store.settings.rates.vatRate)
                }

                Section {
                    Button("Revenir aux valeurs par défaut", role: .destructive) {
                        settingsStore.resetRates()
                    }
                }
            }
            .navigationTitle("Taux et seuils")
            .navigationBarTitleDisplayMode(.inline)
            .onChange(of: store.settings) { _, _ in store.persist() }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Terminé") { dismiss() }
                }
            }
        }
    }
}

/// Une ligne de saisie de taux, exprimée en pourcentage.
struct RateRow: View {

    let title: String
    @Binding var rate: Rate

    private var percentBinding: Binding<Decimal> {
        Binding(
            get: { rate.percent },
            set: { rate = Rate(percent: $0) }
        )
    }

    var body: some View {
        LabeledContent(title) {
            HStack(spacing: 4) {
                TextField("0", value: percentBinding, format: .number.precision(.fractionLength(0...2)))
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .font(.body.monospacedDigit())
                Text("%").foregroundStyle(.secondary)
            }
        }
    }
}

/// Une ligne de saisie de montant en euros.
struct MoneyRow: View {

    let title: String
    @Binding var amount: Money

    private var decimalBinding: Binding<Decimal> {
        Binding(
            get: { amount.amount },
            set: { amount = Money($0) }
        )
    }

    var body: some View {
        LabeledContent(title) {
            HStack(spacing: 4) {
                TextField("0", value: decimalBinding, format: .number.precision(.fractionLength(0)))
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.trailing)
                    .font(.body.monospacedDigit())
                Text("€").foregroundStyle(.secondary)
            }
        }
    }
}
