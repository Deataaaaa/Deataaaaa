import SwiftUI
import SwiftData
import PeculeCore

struct DeadlinesView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @Query(sort: \StoredEntry.date, order: .reverse) private var storedEntries: [StoredEntry]

    private var ledger: Ledger {
        Ledger(entries: storedEntries.asRevenueEntries, settings: settingsStore.settings)
    }

    var body: some View {
        NavigationStack {
            Group {
                if ledger.upcomingDeadlines.isEmpty {
                    EmptyStateView(
                        symbol: "calendar",
                        title: "Aucune échéance",
                        message: """
                        Les échéances apparaissent dès le premier encaissement, \
                        avec le montant qui sera prélevé.
                        """
                    )
                } else {
                    deadlineList
                }
            }
            .navigationTitle("Échéances")
        }
    }

    private var deadlineList: some View {
        List {
            Section {
                ForEach(ledger.upcomingDeadlines) { deadline in
                    DeadlineRow(deadline: deadline)
                }
            } footer: {
                Text("""
                Montants estimés à partir des encaissements déjà saisis. \
                Une période en cours continuera d'augmenter jusqu'à sa clôture.
                """)
            }

            Section("Seuils") {
                ForEach(ledger.thresholds) { threshold in
                    VStack(alignment: .leading, spacing: 10) {
                        ThresholdGauge(progress: threshold)
                        Text(threshold.explanation)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

struct DeadlineRow: View {

    let deadline: Deadline

    private var days: Int { deadline.daysRemaining(from: Date()) }

    /// Rouge en dessous d'une semaine, orange en dessous d'un mois : le délai
    /// utile pour réunir la somme, pas une simple date.
    private var urgencyColor: Color {
        switch days {
        case ..<7: Palette.danger
        case ..<30: Palette.provision
        default: Palette.neutral
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: deadline.kind.symbolName)
                .font(.body)
                .frame(width: 36, height: 36)
                .background(urgencyColor.opacity(0.15), in: Circle())
                .foregroundStyle(urgencyColor)

            VStack(alignment: .leading, spacing: 2) {
                Text(deadline.kind.title)
                    .font(.subheadline.weight(.medium))
                Text(deadline.periodLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                Text(deadline.estimatedAmount.formattedRounded)
                    .font(.subheadline.weight(.semibold).monospacedDigit())
                Text(deadline.dueDate.shortDate)
                    .font(.caption)
                    .foregroundStyle(urgencyColor)
            }
        }
        .padding(.vertical, 4)
    }
}
