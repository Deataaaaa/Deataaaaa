import Foundation
import Testing
@testable import PeculeCore

@Suite("Calendrier des échéances")
struct DeadlineSchedulerTests {

    let scheduler = DeadlineScheduler()

    /// Le 15 mai : le 1er trimestre est déclaré, le 2e est en cours.
    let today = Fixture.date(2026, 5, 15)

    private func quarterEntries() -> [RevenueEntry] {
        [
            Fixture.entry(3_000, on: Fixture.date(2026, 4, 10)),
            Fixture.entry(2_000, on: Fixture.date(2026, 5, 3)),
            Fixture.entry(9_999, on: Fixture.date(2026, 8, 1))   // hors trimestre
        ]
    }

    @Test("Le trimestre avril-juin se déclare le 31 juillet, pas le 31 août")
    func échéanceTrimestrielle() throws {
        let deadlines = scheduler.upcomingDeadlines(
            entries: quarterEntries(), settings: Fixture.settings(), from: today
        )
        let q2 = try #require(deadlines.first { $0.periodLabel == "2ᵉ trimestre 2026" })
        #expect(q2.dueDate == Fixture.date(2026, 7, 31))
    }

    @Test("Le montant annoncé ne compte que les encaissements du trimestre")
    func montantLimitéÀLaPériode() throws {
        let deadlines = scheduler.upcomingDeadlines(
            entries: quarterEntries(), settings: Fixture.settings(), from: today
        )
        let q2 = try #require(deadlines.first { $0.periodLabel == "2ᵉ trimestre 2026" })

        // 5 000 € encaissés : 26,1 % + 0,2 % + 2,2 % de versement libératoire.
        #expect(q2.estimatedAmount == Money(1_425))
    }

    @Test("Au barème, le versement libératoire ne fait pas partie de l'appel URSSAF")
    func barèmeExcluDeLAppelURSSAF() throws {
        let settings = Fixture.settings(taxMode: .marginalBracket(Rate(basisPoints: 3000)))
        let deadlines = scheduler.upcomingDeadlines(entries: quarterEntries(), settings: settings, from: today)
        let q2 = try #require(deadlines.first { $0.kind == .urssaf })

        // 5 000 € x (26,1 % + 0,2 %) = 1 315 €, sans impôt.
        #expect(q2.estimatedAmount == Money(1_315))
    }

    @Test("Une déclaration mensuelle est due le dernier jour du mois suivant")
    func échéanceMensuelle() throws {
        let entries = [Fixture.entry(1_000, on: Fixture.date(2026, 5, 20))]
        let deadlines = scheduler.upcomingDeadlines(
            entries: entries, settings: Fixture.settings(periodicity: .monthly), from: today
        )
        let mai = try #require(deadlines.first { $0.periodLabel == "Mai 2026" })
        #expect(mai.dueDate == Fixture.date(2026, 6, 30))
    }

    @Test("Le mois de janvier se déclare le 28 février, dernier jour du mois")
    func moisSuivantPlusCourt() throws {
        let janvier = Fixture.date(2026, 1, 10)
        let deadlines = scheduler.upcomingDeadlines(
            entries: [Fixture.entry(1_000, on: janvier)],
            settings: Fixture.settings(periodicity: .monthly),
            from: janvier
        )
        let mois = try #require(deadlines.first { $0.periodLabel == "Janvier 2026" })
        #expect(mois.dueDate == Fixture.date(2026, 2, 28))
    }

    @Test("Les échéances déjà passées ne sont plus proposées")
    func échéancesPasséesÉcartées() {
        let deadlines = scheduler.upcomingDeadlines(
            entries: quarterEntries(), settings: Fixture.settings(), from: today
        )
        #expect(deadlines.allSatisfy { $0.dueDate >= today })
        #expect(!deadlines.contains { $0.periodLabel == "1ᵉʳ trimestre 2026" })
    }

    @Test("Les échéances sont triées et la première est bien la plus proche")
    func triChronologique() throws {
        let deadlines = scheduler.upcomingDeadlines(
            entries: quarterEntries(), settings: Fixture.settings(), from: today
        )
        #expect(deadlines == deadlines.sorted { $0.dueDate < $1.dueDate })

        let next = try #require(scheduler.nextDeadline(
            entries: quarterEntries(), settings: Fixture.settings(), from: today
        ))
        #expect(next.dueDate == Fixture.date(2026, 7, 31))
    }

    @Test("Sans assujettissement, aucune échéance de TVA n'apparaît")
    func pasDeTVASansAssujettissement() {
        let deadlines = scheduler.upcomingDeadlines(
            entries: quarterEntries(), settings: Fixture.settings(), from: today
        )
        #expect(!deadlines.contains { $0.kind == .vat })
    }

    @Test("Assujetti, la TVA d'un mois se déclare le 24 du mois suivant")
    func échéanceTVA() throws {
        let entries = [Fixture.entry(1_200, on: Fixture.date(2026, 6, 5))]
        let deadlines = scheduler.upcomingDeadlines(
            entries: entries, settings: Fixture.settings(vatRegistered: true), from: today
        )
        let tva = try #require(deadlines.first { $0.kind == .vat })
        #expect(tva.dueDate == Fixture.date(2026, 7, 24))
        #expect(tva.estimatedAmount == Money(200))
    }

    @Test("La CFE n'apparaît qu'après la première année et si un montant est saisi")
    func cfe() throws {
        var settings = Fixture.settings()
        #expect(!scheduler.upcomingDeadlines(entries: [], settings: settings, from: today)
            .contains { $0.kind == .cfe })

        settings.expectedCFE = Money(430)
        let cfe = try #require(
            scheduler.upcomingDeadlines(entries: [], settings: settings, from: today)
                .first { $0.kind == .cfe }
        )
        #expect(cfe.dueDate == Fixture.date(2026, 12, 15))
        #expect(cfe.estimatedAmount == Money(430))
    }

    @Test("Une première année d'activité est exonérée de CFE")
    func cfeExonéréePremièreAnnée() {
        var settings = Fixture.settings()
        settings.activityStartYear = 2026
        settings.expectedCFE = Money(430)

        // Horizon de 24 mois : l'échéance de report tombe en décembre 2027,
        // hors de la fenêtre de 12 mois par défaut.
        let deadlines = scheduler.upcomingDeadlines(
            entries: [], settings: settings, from: today, horizonMonths: 24
        )
        #expect(!deadlines.contains { $0.id == "cfe-2026" })
        #expect(deadlines.contains { $0.id == "cfe-2027" })
    }

    @Test("Le compte à rebours distingue une échéance à venir d'une échéance dépassée")
    func compteÀRebours() {
        let deadline = Deadline(
            id: "t", kind: .urssaf, periodLabel: "Test",
            periodRange: Fixture.date(2026, 4, 1)..<Fixture.date(2026, 7, 1),
            dueDate: Fixture.date(2026, 7, 31), estimatedAmount: Money(100)
        )
        #expect(deadline.daysRemaining(from: today) == 77)
        #expect(!deadline.isOverdue(on: today))
        #expect(deadline.isOverdue(on: Fixture.date(2026, 8, 1)))
    }
}
