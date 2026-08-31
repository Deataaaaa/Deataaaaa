import Foundation
import Testing
@testable import PeculeCore

@Suite("Statistiques")
struct RevenueStatisticsTests {

    let stats = RevenueStatistics()
    let today = Fixture.date(2026, 7, 1)

    private var entries: [RevenueEntry] {
        [
            Fixture.entry(2_000, on: Fixture.date(2025, 11, 5), client: "Ancien"),
            Fixture.entry(3_000, on: Fixture.date(2026, 2, 10), client: "Studio Bergamote"),
            Fixture.entry(5_000, on: Fixture.date(2026, 3, 20), client: "Studio Bergamote"),
            Fixture.entry(1_000, on: Fixture.date(2026, 6, 15), client: "Lefebvre")
        ]
    }

    @Test("Seuls les encaissements de l'année civile en cours sont comptés")
    func filtrageAnnuel() {
        let yearEntries = stats.entriesOfYear(entries, containing: today)
        #expect(yearEntries.count == 3)
        #expect(!yearEntries.contains { $0.client == "Ancien" })
    }

    @Test("Le résumé annuel agrège le chiffre d'affaires et les provisions")
    func résuméAnnuel() {
        let summary = stats.yearSummary(entries: entries, settings: Fixture.settings(), referenceDate: today)

        #expect(summary.year == 2026)
        #expect(summary.entryCount == 3)
        #expect(summary.breakdown.gross == Money(9_000))
        #expect(summary.breakdown.socialContributions == Money(cents: 234_900))
    }

    @Test("La projection extrapole le rythme constaté sur l'année entière")
    func projectionAnnuelle() {
        let summary = stats.yearSummary(entries: entries, settings: Fixture.settings(), referenceDate: today)

        // 9 000 € au 182e jour, projetés sur 365 jours.
        #expect(summary.projectedYearEndRevenue == Money(18_049))
        #expect(summary.monthlyAverage == Money(1_286))   // 9 000 / 7 mois écoulés
    }

    @Test("Le découpage mensuel couvre les douze derniers mois, trous compris")
    func douzeDerniersMois() {
        let months = stats.monthlyBreakdown(
            entries: entries, settings: Fixture.settings(), endingAt: today
        )

        #expect(months.count == 12)
        #expect(months.first?.label == "Août 25")
        #expect(months.last?.label == "Juil 26")

        let janvier = months.first { $0.label == "Jan 26" }
        #expect(janvier?.gross == .zero)          // un mois vide reste affiché

        let mars = months.first { $0.label == "Mar 26" }
        #expect(mars?.gross == Money(5_000))

        // Juin et Juillet doivent rester deux libellés distincts.
        #expect(Set(months.map(\.label)).count == 12)
    }

    @Test("Un découpage de zéro mois ne produit rien")
    func découpageVide() {
        #expect(stats.monthlyBreakdown(
            entries: entries, settings: Fixture.settings(), endingAt: today, count: 0
        ).isEmpty)
    }

    @Test("La répartition par client classe du plus gros au plus petit")
    func répartitionParClient() {
        let byClient = stats.revenueByClient(entries: stats.entriesOfYear(entries, containing: today))

        #expect(byClient.count == 2)
        #expect(byClient[0].client == "Studio Bergamote")
        #expect(byClient[0].amount == Money(8_000))       // deux factures cumulées
        #expect(byClient[1].client == "Lefebvre")
    }

    @Test("Un encaissement sans client est regroupé plutôt qu'ignoré")
    func clientAbsent() {
        let anonymous = [
            RevenueEntry(date: today, grossAmount: Money(700), client: "   "),
            RevenueEntry(date: today, grossAmount: Money(300), client: "")
        ]
        let byClient = stats.revenueByClient(entries: anonymous)

        #expect(byClient.count == 1)
        #expect(byClient[0].client == "Sans client")
        #expect(byClient[0].amount == Money(1_000))
    }

    @Test("Sans aucun encaissement, le résumé reste cohérent")
    func aucuneDonnée() {
        let summary = stats.yearSummary(entries: [], settings: Fixture.settings(), referenceDate: today)

        #expect(summary.entryCount == 0)
        #expect(summary.breakdown.gross == .zero)
        #expect(summary.projectedYearEndRevenue == .zero)
        #expect(summary.monthlyAverage == .zero)
    }
}
