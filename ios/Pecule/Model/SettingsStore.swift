import Foundation
import Observation
import PeculeCore

/// Conserve les réglages de l'utilisateur entre deux lancements.
///
/// Les réglages tiennent dans quelques centaines d'octets : `UserDefaults`
/// suffit, sans le coût d'une entité SwiftData supplémentaire.
@MainActor
@Observable
final class SettingsStore {

    private static let storageKey = "pecule.settings.v1"
    private static let onboardingKey = "pecule.onboarded.v1"

    /// Modifié directement depuis les vues via `@Bindable` ; la persistance est
    /// déclenchée par `persist()`, appelé sur changement.
    var settings: MicroSettings

    /// `false` tant que l'utilisateur n'a pas validé l'écran d'accueil.
    ///
    /// Pas de `didSet` ici : la macro `@Observable` réécrit les propriétés
    /// stockées en propriétés calculées, où les observateurs ne se comportent
    /// pas comme attendu. La persistance est donc explicite.
    private(set) var hasCompletedOnboarding: Bool

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.hasCompletedOnboarding = defaults.bool(forKey: Self.onboardingKey)

        if let data = defaults.data(forKey: Self.storageKey),
           let decoded = try? JSONDecoder().decode(MicroSettings.self, from: data) {
            self.settings = decoded
        } else {
            self.settings = MicroSettings()
        }
    }

    func completeOnboarding() {
        hasCompletedOnboarding = true
        defaults.set(true, forKey: Self.onboardingKey)
    }

    func persist() {
        guard let data = try? JSONEncoder().encode(settings) else { return }
        defaults.set(data, forKey: Self.storageKey)
    }

    /// Remet les taux de l'activité courante à leurs valeurs par défaut.
    func resetRates() {
        settings.resetRatesToDefaults()
        persist()
    }
}
