import SwiftUI
import SwiftData
import PeculeCore

struct EntriesView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @Environment(SubscriptionStore.self) private var subscriptionStore
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \StoredEntry.date, order: .reverse) private var storedEntries: [StoredEntry]

    @State private var isAddingEntry = false
    @State private var isShowingPaywall = false
    @State private var searchText = ""

    private var ledger: Ledger {
        Ledger(entries: storedEntries.asRevenueEntries, settings: settingsStore.settings)
    }

    private var filteredEntries: [StoredEntry] {
        guard !searchText.isEmpty else { return storedEntries }
        return storedEntries.filter {
            $0.client.localizedCaseInsensitiveContains(searchText)
                || $0.reference.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if storedEntries.isEmpty {
                    EmptyStateView(
                        symbol: "tray",
                        title: "Rien d'encaissé",
                        message: "Les encaissements que tu ajoutes apparaissent ici, du plus récent au plus ancien.",
                        actionTitle: "Ajouter un encaissement",
                        action: startAdding
                    )
                } else {
                    entryList
                }
            }
            .navigationTitle("Encaissements")
            .searchable(text: $searchText, prompt: "Client ou référence")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Ajouter", systemImage: "plus", action: startAdding)
                }
            }
            .sheet(isPresented: $isAddingEntry) { AddEntryView() }
            .sheet(isPresented: $isShowingPaywall) { PaywallView() }
        }
    }

    private var entryList: some View {
        List {
            if !subscriptionStore.accessLevel.isPro {
                freeQuotaSection
            }

            ForEach(filteredEntries) { entry in
                NavigationLink {
                    EntryDetailView(entry: entry)
                } label: {
                    EntryRow(entry: entry, breakdown: ledger.breakdown(for: entry.asRevenueEntry))
                }
            }
            .onDelete(perform: delete)
        }
        .listStyle(.insetGrouped)
    }

    private var freeQuotaSection: some View {
        let remaining = subscriptionStore.remainingFreeEntries(currentCount: storedEntries.count)
        return Section {
            Button {
                isShowingPaywall = true
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(remaining > 0 ? "\(remaining.pluralized("encaissement")) restant" : "Limite atteinte")
                            .font(.subheadline.weight(.medium))
                        Text("Passe en illimité avec Pécule Pro")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .buttonStyle(.plain)
        }
    }

    private func startAdding() {
        if subscriptionStore.canAddEntry(currentCount: storedEntries.count) {
            isAddingEntry = true
        } else {
            isShowingPaywall = true
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(filteredEntries[index])
        }
    }
}

/// Une ligne de la liste : le brut à gauche, ce qui reste à droite.
struct EntryRow: View {

    let entry: StoredEntry
    let breakdown: ProvisionBreakdown

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.client.isEmpty ? "Sans client" : entry.client)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                    .foregroundStyle(entry.client.isEmpty ? .secondary : .primary)

                HStack(spacing: 6) {
                    Text(entry.date.shortDate)
                    if !entry.reference.isEmpty {
                        Text("·")
                        Text(entry.reference).lineLimit(1)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer(minLength: 12)

            VStack(alignment: .trailing, spacing: 3) {
                Text(Money(entry.amount).formattedRounded)
                    .font(.subheadline.monospacedDigit())
                Text(breakdown.available.formattedRounded)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(Palette.available)
            }
        }
        .padding(.vertical, 2)
    }
}
