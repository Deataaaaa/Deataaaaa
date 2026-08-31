import SwiftUI
import SwiftData
import PeculeCore

struct AddEntryView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var quickText = ""
    @State private var amountText = ""
    @State private var client = ""
    @State private var reference = ""
    @State private var date = Date()
    @State private var overrideActivity: ActivityKind?

    @FocusState private var focusedField: Field?

    private enum Field { case quick, amount, client, reference }

    private let parser = QuickEntryParser()

    private var amount: Money? {
        // La virgule est le séparateur décimal attendu en français ; le point
        // est accepté parce que le clavier numérique en propose un.
        let normalized = amountText
            .replacingOccurrences(of: ",", with: ".")
            .filter { $0.isNumber || $0 == "." }
        guard let value = Decimal(string: normalized), value > 0 else { return nil }
        return Money(value)
    }

    private var simulation: ProvisionBreakdown? {
        guard let amount else { return nil }
        var settings = settingsStore.settings
        if let overrideActivity {
            settings.rates = RateTable.defaults(for: overrideActivity)
        }
        return Ledger(entries: [], settings: settings).simulate(gross: amount)
    }

    var body: some View {
        NavigationStack {
            Form {
                quickEntrySection
                detailsSection
                if let simulation {
                    simulationSection(simulation)
                }
            }
            .navigationTitle("Nouvel encaissement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer", action: save)
                        .disabled(amount == nil)
                }
            }
            .onAppear { focusedField = .quick }
        }
    }

    // MARK: - Saisie rapide

    private var quickEntrySection: some View {
        Section {
            TextField("Dupont 1 250,50 € facture 2026-014 hier", text: $quickText, axis: .vertical)
                .focused($focusedField, equals: .quick)
                .submitLabel(.done)
                .onChange(of: quickText) { _, newValue in applyQuickEntry(newValue) }
        } header: {
            Text("Saisie rapide")
        } footer: {
            Text("""
            Écris comme tu parles : montant, client, référence et date sont \
            reconnus au fil de la frappe. Tout reste modifiable en dessous.
            """)
        }
    }

    private func applyQuickEntry(_ text: String) {
        guard !text.isEmpty else { return }
        let parsed = parser.parse(text)
        if let parsedAmount = parsed.amount {
            amountText = parsedAmount.amount.formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
        }
        if let parsedClient = parsed.client { client = parsedClient }
        if let parsedReference = parsed.reference { reference = parsedReference }
        if let parsedDate = parsed.date { date = parsedDate }
    }

    // MARK: - Détails

    private var detailsSection: some View {
        Section("Détails") {
            LabeledContent("Montant encaissé") {
                TextField("0", text: $amountText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .focused($focusedField, equals: .amount)
                    .font(.body.monospacedDigit())
            }

            DatePicker("Date d'encaissement", selection: $date, displayedComponents: .date)

            TextField("Client", text: $client)
                .focused($focusedField, equals: .client)
                .textInputAutocapitalization(.words)

            TextField("Référence de facture", text: $reference)
                .focused($focusedField, equals: .reference)
                .autocorrectionDisabled()

            Picker("Activité", selection: $overrideActivity) {
                Text("Activité principale").tag(ActivityKind?.none)
                ForEach(ActivityKind.allCases) { kind in
                    Text(kind.shortLabel).tag(ActivityKind?.some(kind))
                }
            }
        }
    }

    // MARK: - Simulation en direct

    private func simulationSection(_ breakdown: ProvisionBreakdown) -> some View {
        Section("Ce que ça donne") {
            ForEach(breakdown.lines, id: \.label) { line in
                LabeledContent(line.label, value: line.amount.formatted)
                    .foregroundStyle(.secondary)
            }
            LabeledContent("À mettre de côté") {
                Text(breakdown.provisionTotal.formatted)
                    .fontWeight(.semibold)
                    .foregroundStyle(Palette.provision)
            }
            LabeledContent("Réellement à toi") {
                Text(breakdown.available.formatted)
                    .fontWeight(.semibold)
                    .foregroundStyle(Palette.available)
            }
        }
    }

    // MARK: - Enregistrement

    private func save() {
        guard let amount else { return }
        let entry = StoredEntry(
            date: date,
            amount: amount.amount,
            client: client.trimmingCharacters(in: .whitespacesAndNewlines),
            reference: reference.trimmingCharacters(in: .whitespacesAndNewlines),
            activity: overrideActivity
        )
        modelContext.insert(entry)
        dismiss()
    }
}

/// Le détail d'un encaissement enregistré, modifiable.
struct EntryDetailView: View {

    @Environment(SettingsStore.self) private var settingsStore
    @Bindable var entry: StoredEntry

    private var breakdown: ProvisionBreakdown {
        Ledger(entries: [], settings: settingsStore.settings).simulate(gross: Money(entry.amount))
    }

    var body: some View {
        Form {
            Section("Encaissement") {
                LabeledContent("Montant", value: Money(entry.amount).formatted)
                DatePicker("Date", selection: $entry.date, displayedComponents: .date)
                TextField("Client", text: $entry.client)
                TextField("Référence", text: $entry.reference)
            }

            Section("Décomposition") {
                ForEach(breakdown.lines, id: \.label) { line in
                    LabeledContent(line.label, value: line.amount.formatted)
                }
                LabeledContent("Réellement à toi") {
                    Text(breakdown.available.formatted)
                        .fontWeight(.semibold)
                        .foregroundStyle(Palette.available)
                }
            }
        }
        .navigationTitle(entry.client.isEmpty ? "Encaissement" : entry.client)
        .navigationBarTitleDisplayMode(.inline)
    }
}
