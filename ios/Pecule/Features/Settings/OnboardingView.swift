import SwiftUI
import PeculeCore

/// Trois questions suffisent à rendre les calculs justes. Tout le reste est
/// modifiable ensuite dans les réglages.
struct OnboardingView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @State private var activity: ActivityKind = .prestationBNC
    @State private var periodicity: DeclarationPeriodicity = .quarterly
    @State private var usesFlatTax = true

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Combien est vraiment à toi ?")
                            .font(.title2.weight(.semibold))
                        Text("""
                        Pécule décompose chaque encaissement entre ce que tu dois \
                        mettre de côté et ce que tu peux dépenser. Trois réponses \
                        et c'est réglé.
                        """)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 8)
                }

                Section("Ton activité") {
                    Picker("Activité", selection: $activity) {
                        ForEach(ActivityKind.allCases) { kind in
                            Text(kind.label).tag(kind)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()

                    Text(activity.explanation)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("Ta déclaration URSSAF") {
                    Picker("Périodicité", selection: $periodicity) {
                        ForEach(DeclarationPeriodicity.allCases) { value in
                            Text(value.label).tag(value)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Toggle("Versement libératoire de l'impôt", isOn: $usesFlatTax)
                } footer: {
                    Text("""
                    Si tu ne l'as pas choisi, Pécule provisionnera l'impôt selon \
                    ta tranche marginale, que tu pourras régler dans les réglages.
                    """)
                }

                Section {
                    Button("Commencer") { complete() }
                        .frame(maxWidth: .infinity)
                        .fontWeight(.semibold)
                } footer: {
                    Text(Disclaimer.text)
                        .font(.caption2)
                }
            }
            .navigationTitle("Bienvenue")
        }
    }

    private func complete() {
        var settings = MicroSettings(
            activity: activity,
            periodicity: periodicity,
            incomeTaxMode: usesFlatTax ? .flatRate : .marginalBracket(Rate(basisPoints: 1100))
        )
        settings.resetRatesToDefaults()
        settingsStore.settings = settings
        settingsStore.persist()
        settingsStore.completeOnboarding()
    }
}

enum Disclaimer {
    static let text = """
    Les taux et seuils fournis sont des repères indicatifs, pas une source \
    officielle. Vérifie-les auprès de l'URSSAF ou de ton comptable et corrige-les \
    dans les réglages : ce sont tes valeurs qui servent aux calculs.
    """
}
