import SwiftUI
import SwiftData
import Charts
import UIKit
import PeculeCore

struct DashboardView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @Query(sort: \StoredEntry.date, order: .reverse) private var storedEntries: [StoredEntry]

    @State private var isAddingEntry = false

    private var ledger: Ledger {
        Ledger(entries: storedEntries.asRevenueEntries, settings: settingsStore.settings)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if storedEntries.isEmpty {
                        firstRunCard
                    } else {
                        balanceCard
                        warningsSection
                        nextDeadlineCard
                        chartCard
                        clientsCard
                    }
                }
                .padding(16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Tableau de bord")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Ajouter", systemImage: "plus") { isAddingEntry = true }
                }
            }
            .sheet(isPresented: $isAddingEntry) {
                AddEntryView()
            }
        }
    }

    // MARK: - Le chiffre qui compte

    private var balanceCard: some View {
        let summary = ledger.yearSummary
        let breakdown = summary.breakdown

        return Card {
            VStack(alignment: .leading, spacing: 4) {
                Text("Réellement à toi")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text(breakdown.available.formattedRounded)
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(Palette.available)
                    .contentTransition(.numericText())
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)

                Text("sur \(breakdown.gross.formattedRounded) encaissés en \(String(summary.year))")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Divider()

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("À provisionner")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(breakdown.provisionTotal.formattedRounded)
                        .font(.title3.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Palette.provision)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Taux effectif")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(breakdown.provisionRate.formatted)
                        .font(.title3.weight(.semibold).monospacedDigit())
                }
            }

            NavigationLink {
                ProvisionDetailView(breakdown: breakdown, summary: summary)
            } label: {
                Label("Voir le détail", systemImage: "list.bullet.rectangle")
                    .font(.subheadline)
            }
        }
    }

    // MARK: - Alertes

    @ViewBuilder
    private var warningsSection: some View {
        let warnings = ledger.warnings
        if !warnings.isEmpty {
            Card(title: "À surveiller") {
                ForEach(warnings) { warning in
                    ThresholdGauge(progress: warning)
                    if warning.id != warnings.last?.id {
                        Divider()
                    }
                }
            }
        }
    }

    // MARK: - Prochaine échéance

    @ViewBuilder
    private var nextDeadlineCard: some View {
        if let deadline = ledger.nextDeadline {
            let days = deadline.daysRemaining(from: Date())
            Card(title: "Prochaine échéance") {
                HStack(alignment: .center, spacing: 14) {
                    Image(systemName: deadline.kind.symbolName)
                        .font(.title2)
                        .frame(width: 40, height: 40)
                        .background(Palette.provision.opacity(0.15), in: Circle())
                        .foregroundStyle(Palette.provision)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(deadline.kind.title)
                            .font(.subheadline.weight(.medium))
                        Text("\(deadline.periodLabel) · \(deadline.dueDate.longDate)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(deadline.estimatedAmount.formattedRounded)
                            .font(.headline.monospacedDigit())
                        Text("dans \(days.pluralized("jour"))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Courbe

    private var chartCard: some View {
        Card(title: "Douze derniers mois") {
            Chart(ledger.monthlyBreakdown) { month in
                BarMark(
                    x: .value("Mois", month.label),
                    y: .value("Disponible", month.available.doubleValue)
                )
                .foregroundStyle(Palette.available)
                .position(by: .value("Poste", "Disponible"))

                BarMark(
                    x: .value("Mois", month.label),
                    y: .value("Provisions", (month.gross - month.available).doubleValue)
                )
                .foregroundStyle(Palette.provision)
                .position(by: .value("Poste", "Provisions"))
            }
            .chartLegend(.hidden)
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 180)

            HStack(spacing: 16) {
                legendItem(color: Palette.available, label: "Disponible")
                legendItem(color: Palette.provision, label: "Provisions")
            }
        }
    }

    private func legendItem(color: Color, label: String) -> some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2).fill(color).frame(width: 10, height: 10)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }

    // MARK: - Clients

    @ViewBuilder
    private var clientsCard: some View {
        let clients = ledger.topClients
        if clients.count > 1 {
            Card(title: "Répartition par client") {
                ForEach(clients, id: \.client) { item in
                    HStack {
                        Text(item.client)
                            .font(.subheadline)
                            .lineLimit(1)
                        Spacer()
                        Text(item.amount.formattedRounded)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Premier lancement

    private var firstRunCard: some View {
        EmptyStateView(
            symbol: "eurosign.circle",
            title: "Aucun encaissement",
            message: """
            Ajoute ton premier encaissement : Pécule te dira immédiatement \
            combien mettre de côté et combien tu peux réellement dépenser.
            """,
            actionTitle: "Ajouter un encaissement",
            action: { isAddingEntry = true }
        )
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

/// Le détail poste par poste, accessible depuis le tableau de bord.
struct ProvisionDetailView: View {

    let breakdown: ProvisionBreakdown
    let summary: YearSummary

    var body: some View {
        List {
            Section("Encaissé en \(String(summary.year))") {
                LabeledContent("Chiffre d'affaires brut", value: breakdown.gross.formatted)
                if !breakdown.vat.isZero {
                    LabeledContent("Dont TVA collectée", value: breakdown.vat.formatted)
                    LabeledContent("Chiffre d'affaires HT", value: breakdown.netOfVAT.formatted)
                }
                LabeledContent("Nombre d'encaissements", value: "\(summary.entryCount)")
            }

            Section("À mettre de côté") {
                ForEach(breakdown.lines, id: \.label) { line in
                    LabeledContent(line.label, value: line.amount.formatted)
                }
                LabeledContent("Total") {
                    Text(breakdown.provisionTotal.formatted)
                        .fontWeight(.semibold)
                        .foregroundStyle(Palette.provision)
                }
            }

            Section("Disponible") {
                LabeledContent("Réellement à toi") {
                    Text(breakdown.available.formatted)
                        .fontWeight(.semibold)
                        .foregroundStyle(Palette.available)
                }
                LabeledContent("Taux de prélèvement", value: breakdown.provisionRate.formatted)
            }

            Section("Projection") {
                LabeledContent("Moyenne mensuelle", value: summary.monthlyAverage.formatted)
                LabeledContent("Fin d'année au rythme actuel", value: summary.projectedYearEndRevenue.formatted)
            }

            Section {
                Text(Disclaimer.text)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Détail")
        .navigationBarTitleDisplayMode(.inline)
    }
}
