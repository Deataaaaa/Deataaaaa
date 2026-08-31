import Foundation
import Testing
@testable import PeculeCore

@Suite("Surveillance des seuils")
struct ThresholdMonitorTests {

    let monitor = ThresholdMonitor()
    let midYear = Fixture.date(2026, 7, 1)

    @Test("Un libéral non assujetti suit trois seuils")
    func troisSeuilsAvantTVA() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(10_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress.map(\.id) == ["vat-franchise", "vat-increased", "micro-ceiling"])
    }

    @Test("Une fois la TVA facturée, les seuils de franchise disparaissent")
    func seuilsMasquésUneFoisAssujetti() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(50_000),
            settings: Fixture.settings(vatRegistered: true),
            referenceDate: midYear
        )
        #expect(progress.map(\.id) == ["micro-ceiling"])
    }

    @Test("En dessous des trois quarts du seuil, aucune alerte")
    func situationConfortable() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(10_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress[0].status == .comfortable)
        #expect(progress[0].remaining == Money(27_500))
    }

    @Test("À 80 % du seuil de franchise, l'alerte se déclenche")
    func alerteÀLApproche() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(30_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress[0].status == .approaching)
    }

    @Test("Exactement aux trois quarts, le seuil alerte déjà")
    func alerteExactementAuSeuil() {
        // 37 500 x 0,75 = 28 125 : la borne est inclusive, un euro de moins
        // doit rester confortable.
        let settings = Fixture.settings()
        #expect(
            monitor.progress(yearToDateRevenue: Money(28_125), settings: settings, referenceDate: midYear)[0].status
                == .approaching
        )
        #expect(
            monitor.progress(yearToDateRevenue: Money(28_124), settings: settings, referenceDate: midYear)[0].status
                == .comfortable
        )
    }

    @Test("Franchise dépassée mais seuil majoré encore tenu")
    func franchiseDépasséeSeuilMajoréTenu() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(40_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress[0].status == .exceeded)
        #expect(progress[0].remaining == .zero)
        #expect(progress[1].status == .approaching)
        #expect(progress[1].remaining == Money(1_250))
    }

    @Test("Un seuil dépassé n'a plus de date de franchissement à projeter")
    func pasDeProjectionAprèsDépassement() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(40_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress[0].projectedCrossing == nil)
    }

    @Test("Au rythme constaté, la date de franchissement est projetée dans l'année")
    func projectionDansLAnnée() throws {
        // 20 000 € au 1er juillet (182e jour) : environ 110 €/jour, il reste
        // 17 500 € avant la franchise, soit environ 159 jours.
        let progress = monitor.progress(
            yearToDateRevenue: Money(20_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        let crossing = try #require(progress[0].projectedCrossing)
        #expect(Fixture.calendar.component(.year, from: crossing) == 2026)
        #expect(crossing > midYear)
    }

    @Test("Un rythme trop faible pour atteindre le seuil dans l'année ne projette rien")
    func pasDeProjectionSiRythmeTropFaible() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(1_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress[0].projectedCrossing == nil)
    }

    @Test("Sans aucun encaissement, la jauge est vide et rien n'est projeté")
    func aucunEncaissement() {
        let progress = monitor.progress(
            yearToDateRevenue: .zero,
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress[0].completion == 0)
        #expect(progress[0].projectedCrossing == nil)
        #expect(progress[0].status == .comfortable)
    }

    @Test("La jauge est bornée à 100 % même largement au-dessus du seuil")
    func jaugeBornée() {
        let progress = monitor.progress(
            yearToDateRevenue: Money(500_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(progress.allSatisfy { $0.completion <= 1 })
        #expect(progress[0].completion == 1)
    }

    @Test("Seuls les seuils en alerte remontent dans les avertissements")
    func filtrageDesAvertissements() {
        let warnings = monitor.warnings(
            yearToDateRevenue: Money(40_000),
            settings: Fixture.settings(),
            referenceDate: midYear
        )
        #expect(warnings.map(\.id) == ["vat-franchise", "vat-increased"])
    }
}
