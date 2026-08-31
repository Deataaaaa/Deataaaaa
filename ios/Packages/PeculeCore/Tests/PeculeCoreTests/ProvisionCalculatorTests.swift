import Foundation
import Testing
@testable import PeculeCore

/// Fabriques partagées : une date fixe rend les tests indépendants du jour où
/// ils tournent.
enum Fixture {
    static let calendar = Calendar.gregorianUTC

    static func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day))!
    }

    static func settings(
        activity: ActivityKind = .prestationBNC,
        taxMode: IncomeTaxMode = .flatRate,
        vatRegistered: Bool = false,
        periodicity: DeclarationPeriodicity = .quarterly,
        margin: Rate = .zero
    ) -> MicroSettings {
        MicroSettings(
            activity: activity,
            periodicity: periodicity,
            incomeTaxMode: taxMode,
            isVATRegistered: vatRegistered,
            activityStartYear: 2020,
            safetyMargin: margin
        )
    }

    static func entry(_ amount: Int, on date: Date, client: String = "Client") -> RevenueEntry {
        RevenueEntry(date: date, grossAmount: Money(amount), client: client)
    }
}

@Suite("Décomposition d'un encaissement")
struct ProvisionCalculatorTests {

    let calculator = ProvisionCalculator()

    @Test("Un libéral au versement libératoire garde 71,5 % de son encaissement")
    func libéralVersementLibératoire() {
        let settings = Fixture.settings()
        let result = calculator.breakdown(gross: Money(1_000), rates: settings.rates, settings: settings)

        #expect(result.vat == .zero)
        #expect(result.netOfVAT == Money(1_000))
        #expect(result.socialContributions == Money(261))       // 26,1 %
        #expect(result.trainingContribution == Money(2))        //  0,2 %
        #expect(result.incomeTax == Money(22))                  //  2,2 %
        #expect(result.provisionTotal == Money(285))
        #expect(result.available == Money(715))
    }

    @Test("Au barème, l'impôt porte sur le revenu après abattement, pas sur le CA")
    func barèmeAppliquéAprèsAbattement() {
        let settings = Fixture.settings(taxMode: .marginalBracket(Rate(basisPoints: 3000)))
        let result = calculator.breakdown(gross: Money(1_000), rates: settings.rates, settings: settings)

        // 1 000 € - 34 % d'abattement = 660 € imposables, taxés à 30 %.
        #expect(result.incomeTax == Money(198))
        #expect(result.provisionTotal == Money(461))
        #expect(result.available == Money(539))
    }

    @Test("Sans provision d'impôt, seules les cotisations sont retenues")
    func sansImpôt() {
        let settings = Fixture.settings(taxMode: .notProvisioned)
        let result = calculator.breakdown(gross: Money(1_000), rates: settings.rates, settings: settings)

        #expect(result.incomeTax == .zero)
        #expect(result.provisionTotal == Money(263))
    }

    @Test("La TVA est extraite du montant encaissé avant de calculer les cotisations")
    func tvaExtraiteDuTTC() {
        let settings = Fixture.settings(vatRegistered: true)
        let result = calculator.breakdown(gross: Money(1_200), rates: settings.rates, settings: settings)

        // 1 200 € TTC à 20 % = 200 € de TVA et 1 000 € de CA hors taxes.
        #expect(result.vat == Money(200))
        #expect(result.netOfVAT == Money(1_000))
        #expect(result.socialContributions == Money(261))
        // Le disponible est identique au cas hors TVA : la TVA n'a jamais
        // appartenu à l'entrepreneur.
        #expect(result.available == Money(715))
    }

    @Test("La marge de sécurité s'applique aux provisions, pas au chiffre d'affaires")
    func margeDeSécurité() {
        let settings = Fixture.settings(margin: Rate(basisPoints: 1000))
        let result = calculator.breakdown(gross: Money(1_000), rates: settings.rates, settings: settings)

        // 10 % de 285 € de provisions.
        #expect(result.safetyMargin == Money(cents: 2_850))
        #expect(result.provisionTotal == Money(cents: 31_350))
        #expect(result.available == Money(cents: 68_650))
    }

    @Test("Une vente de marchandises est bien moins ponctionnée qu'une prestation")
    func venteDeMarchandises() {
        let settings = Fixture.settings(activity: .venteMarchandises)
        let result = calculator.breakdown(gross: Money(1_000), rates: settings.rates, settings: settings)

        #expect(result.socialContributions == Money(123))
        #expect(result.available == Money(866))
    }

    @Test("Un encaissement nul ou négatif ne produit aucune provision")
    func montantNonPositif() {
        let settings = Fixture.settings()
        #expect(calculator.breakdown(gross: .zero, rates: settings.rates, settings: settings) == .empty)
        #expect(calculator.breakdown(gross: Money(-500), rates: settings.rates, settings: settings) == .empty)
    }

    @Test("Une ligne portant sa propre activité utilise les taux de cette activité")
    func activitéMixte() {
        let settings = Fixture.settings(activity: .prestationBNC)
        let vente = RevenueEntry(
            date: Fixture.date(2026, 3, 10),
            grossAmount: Money(1_000),
            activity: .venteMarchandises
        )

        let result = calculator.breakdown(for: vente, settings: settings)

        // 12,3 % et non 26,1 % : mélanger les taux fausserait la provision.
        #expect(result.socialContributions == Money(123))
    }

    @Test("L'agrégat d'un ensemble d'encaissements est la somme des décompositions")
    func agrégation() {
        let settings = Fixture.settings()
        let entries = [
            Fixture.entry(1_000, on: Fixture.date(2026, 1, 15)),
            Fixture.entry(2_000, on: Fixture.date(2026, 2, 15)),
            Fixture.entry(500, on: Fixture.date(2026, 3, 15))
        ]

        let result = calculator.breakdown(for: entries, settings: settings)

        #expect(result.gross == Money(3_500))
        #expect(result.socialContributions == Money(cents: 91_350))
        #expect(result.available == Money(cents: 250_250))
    }

    @Test("Le détail n'affiche que les postes réellement dus")
    func lignesAffichées() {
        let settings = Fixture.settings(taxMode: .notProvisioned)
        let result = calculator.breakdown(gross: Money(1_000), rates: settings.rates, settings: settings)

        let labels = result.lines.map(\.label)
        #expect(labels == ["Cotisations URSSAF", "Formation professionnelle"])
    }
}
