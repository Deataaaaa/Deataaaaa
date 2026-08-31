import SwiftUI
import SwiftData

struct RootView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @State private var selection: AppTab = .dashboard

    var body: some View {
        if settingsStore.hasCompletedOnboarding {
            TabView(selection: $selection) {
                Tab("Tableau de bord", systemImage: "gauge.with.dots.needle.33percent", value: AppTab.dashboard) {
                    DashboardView()
                }
                Tab("Encaissements", systemImage: "eurosign.circle", value: AppTab.entries) {
                    EntriesView()
                }
                Tab("Échéances", systemImage: "calendar", value: AppTab.deadlines) {
                    DeadlinesView()
                }
                Tab("Réglages", systemImage: "gearshape", value: AppTab.settings) {
                    SettingsView()
                }
            }
        } else {
            OnboardingView()
        }
    }
}

enum AppTab: Hashable {
    case dashboard, entries, deadlines, settings
}
