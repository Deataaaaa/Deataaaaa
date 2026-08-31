import SwiftUI
import SwiftData

@main
struct PeculeApp: App {

    @State private var settingsStore = SettingsStore()
    @State private var subscriptionStore = SubscriptionStore()

    private let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(for: StoredEntry.self)
        } catch {
            // Une base illisible ne doit pas empêcher l'app de démarrer :
            // on repart en mémoire, l'utilisateur garde une app utilisable et
            // le problème reste visible plutôt que masqué par un crash.
            let fallback = ModelConfiguration(isStoredInMemoryOnly: true)
            container = try! ModelContainer(for: StoredEntry.self, configurations: fallback)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settingsStore)
                .environment(subscriptionStore)
                .task { await subscriptionStore.start() }
        }
        .modelContainer(container)
    }
}
