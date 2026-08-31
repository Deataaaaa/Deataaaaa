import SwiftUI
import SwiftData
import PeculeCore

struct SettingsView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @Environment(SubscriptionStore.self) private var subscriptionStore

    @State private var isShowingPaywall = false
    @State private var isShowingRates = false

    var body: some View {
        @Bindable var store = settingsStore

        NavigationStack {
            Form {
                subscriptionSection

                Section("Activité") {
                    Picker("Nature", selection: activityBinding) {
                        ForEach(ActivityKind.allCases) { kind in
                            Text(kind.shortLabel).tag(kind)
                        }
                    }

                    Picker("Déclaration URSSAF", selection: $store.settings.periodicity) {
                        ForEach(DeclarationPeriodicity.allCases) { value in
                            Text(value.label).tag(value)
                        }
                    }

                    Stepper(
                        "Début d'activité : \(String(store.settings.activityStartYear))",
                        value: $store.settings.activityStartYear,
                        in: 2000...2100
                    )
                }

                Section {
                    Picker("Impôt sur le revenu", selection: taxModeBinding) {
                        Text("Versement libératoire").tag(TaxModeChoice.flat)
                        Text("Barème (tranche marginale)").tag(TaxModeChoice.bracket)
                        Text("Ne pas provisionner").tag(TaxModeChoice.skip)
                    }

                    if case .marginalBracket = store.settings.incomeTaxMode {
                        Picker("Tranche marginale", selection: bracketBinding) {
                            ForEach([0, 1100, 3000, 4100, 4500], id: \.self) { basisPoints in
                                Text(Rate(basisPoints: basisPoints).formatted).tag(basisPoints)
                            }
                        }
                    }
                } header: {
                    Text("Impôt")
                } footer: {
                    Text("""
                    Au barème, l'impôt est estimé sur le revenu après abattement \
                    forfaitaire. C'est une estimation : le montant réel dépend de \
                    l'ensemble du foyer fiscal.
                    """)
                }

                Section {
                    Toggle("Je facture la TVA", isOn: $store.settings.isVATRegistered)
                    LabeledContent("Montant de CFE attendu") {
                        MoneyField(value: cfeBinding)
                    }
                } header: {
                    Text("TVA et CFE")
                } footer: {
                    Text("La CFE varie selon la commune : reporte le montant de ton avis d'imposition.")
                }

                Section {
                    Picker("Marge de sécurité", selection: marginBinding) {
                        ForEach([0, 500, 1000, 1500, 2000], id: \.self) { basisPoints in
                            Text(basisPoints == 0 ? "Aucune" : Rate(basisPoints: basisPoints).formatted)
                                .tag(basisPoints)
                        }
                    }
                } footer: {
                    Text("Un coussin ajouté aux provisions, pour absorber une régularisation.")
                }

                Section {
                    Button("Vérifier et ajuster les taux") { isShowingRates = true }
                } footer: {
                    Text(Disclaimer.text)
                }
            }
            .navigationTitle("Réglages")
            .onChange(of: store.settings) { _, _ in store.persist() }
            .sheet(isPresented: $isShowingPaywall) { PaywallView() }
            .sheet(isPresented: $isShowingRates) { RatesEditorView() }
        }
    }

    // MARK: - Abonnement

    private var subscriptionSection: some View {
        Section {
            if subscriptionStore.accessLevel.isPro {
                LabeledContent("Abonnement") {
                    Label("Pro", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(Palette.available)
                }
            } else {
                Button {
                    isShowingPaywall = true
                } label: {
                    LabeledContent("Abonnement", value: "Gratuit")
                }
            }
        }
    }

    // MARK: - Passerelles entre le modèle métier et les contrôles

    private var activityBinding: Binding<ActivityKind> {
        Binding(
            get: { settingsStore.settings.activity },
            set: { newValue in
                settingsStore.settings.changeActivity(to: newValue, keepingCustomRates: true)
                settingsStore.persist()
            }
        )
    }

    private var taxModeBinding: Binding<TaxModeChoice> {
        Binding(
            get: {
                switch settingsStore.settings.incomeTaxMode {
                case .flatRate: .flat
                case .marginalBracket: .bracket
                case .notProvisioned: .skip
                }
            },
            set: { choice in
                settingsStore.settings.incomeTaxMode = switch choice {
                case .flat: .flatRate
                case .bracket: .marginalBracket(Rate(basisPoints: 1100))
                case .skip: .notProvisioned
                }
                settingsStore.persist()
            }
        )
    }

    private var bracketBinding: Binding<Int> {
        Binding(
            get: {
                if case .marginalBracket(let rate) = settingsStore.settings.incomeTaxMode {
                    return NSDecimalNumber(decimal: rate.fraction * 10_000).intValue
                }
                return 1100
            },
            set: { basisPoints in
                settingsStore.settings.incomeTaxMode = .marginalBracket(Rate(basisPoints: basisPoints))
                settingsStore.persist()
            }
        )
    }

    private var marginBinding: Binding<Int> {
        Binding(
            get: { NSDecimalNumber(decimal: settingsStore.settings.safetyMargin.fraction * 10_000).intValue },
            set: { basisPoints in
                settingsStore.settings.safetyMargin = Rate(basisPoints: basisPoints)
                settingsStore.persist()
            }
        )
    }

    private var cfeBinding: Binding<Decimal> {
        Binding(
            get: { settingsStore.settings.expectedCFE.amount },
            set: { newValue in
                settingsStore.settings.expectedCFE = Money(newValue)
                settingsStore.persist()
            }
        )
    }
}

enum TaxModeChoice: Hashable {
    case flat, bracket, skip
}

/// Un champ de saisie monétaire aligné à droite.
struct MoneyField: View {
    @Binding var value: Decimal

    var body: some View {
        TextField("0", value: $value, format: .number.precision(.fractionLength(0...2)))
            .keyboardType(.decimalPad)
            .multilineTextAlignment(.trailing)
            .font(.body.monospacedDigit())
    }
}
