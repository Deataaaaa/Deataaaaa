import Foundation
import Testing
@testable import PeculeCore

@Suite("Montants et taux")
struct MoneyTests {

    @Test("Les additions décimales ne dérivent pas, contrairement au binaire flottant")
    func pasDeDérive() {
        // 0,1 + 0,2 == 0,3 est faux en Double ; c'est la raison d'être de Decimal ici.
        let total = Money(cents: 10) + Money(cents: 20)
        #expect(total == Money(cents: 30))

        var cumul = Money.zero
        for _ in 0..<10 { cumul += Money(cents: 10) }
        #expect(cumul == Money(1))
    }

    @Test("L'arrondi au centime est commercial")
    func arrondiAuCentime() {
        #expect(Money(Decimal(string: "10.005")!).rounded == Money(cents: 1_001))
        #expect(Money(Decimal(string: "10.004")!).rounded == Money(cents: 1_000))
    }

    @Test("L'arrondi à l'euro sert à afficher les provisions")
    func arrondiÀLEuro() {
        #expect(Money(Decimal(string: "1425.49")!).roundedToEuro == Money(1_425))
        #expect(Money(Decimal(string: "1425.50")!).roundedToEuro == Money(1_426))
    }

    @Test("Un montant négatif est ramené à zéro quand le contexte l'exige")
    func bornéÀZéro() {
        #expect(Money(-50).clampedToZero == .zero)
        #expect(Money(50).clampedToZero == Money(50))
    }

    @Test("Les montants se comparent et se somment")
    func comparaisonEtSomme() {
        #expect(Money(10) < Money(20))
        #expect(Money.total([Money(10), Money(20), Money(cents: 550)]) == Money(cents: 3_550))
        #expect(Money.total([Money]()) == .zero)
    }

    @Test("Un taux se construit en points de base sans passer par un flottant")
    func tauxEnPointsDeBase() {
        #expect(Rate(basisPoints: 2120).fraction == Decimal(string: "0.212"))
        #expect(Rate(basisPoints: 2120).percent == Decimal(string: "21.2"))
        #expect(Rate(basisPoints: 0).isZero)
    }

    @Test("Appliquer un taux arrondit au centime")
    func applicationDUnTaux() {
        #expect(Money(1_000).applying(Rate(basisPoints: 2120)) == Money(212))
        #expect(Money(333).applying(Rate(basisPoints: 2120)) == Money(cents: 7_060))  // 70,596 -> 70,60
    }

    @Test("Le taux effectif décrit la part réellement prélevée")
    func tauxEffectif() {
        #expect(Rate.effective(part: Money(285), of: Money(1_000)) == Rate(basisPoints: 2850))
        // Une base nulle ne doit pas produire de division par zéro.
        #expect(Rate.effective(part: Money(285), of: .zero) == .zero)
    }

    @Test("Les taux s'additionnent")
    func sommeDeTaux() {
        #expect(Rate(basisPoints: 2610) + Rate(basisPoints: 20) == Rate(basisPoints: 2630))
    }

    @Test("L'ACRE réduit les cotisations sans toucher aux autres postes")
    func réductionACRE() {
        let base = RateTable.defaults(for: .prestationBNC)
        let reduced = base.applyingACRE(reduction: Rate(basisPoints: 5000))

        #expect(reduced.socialContributions == Rate(basisPoints: 1305))
        #expect(reduced.flatIncomeTax == base.flatIncomeTax)
        #expect(reduced.microCeiling == base.microCeiling)
    }

    @Test("Changer d'activité réaligne les taux par défaut")
    func changementDActivité() {
        var settings = MicroSettings(activity: .prestationBNC)
        settings.changeActivity(to: .venteMarchandises, keepingCustomRates: true)

        #expect(settings.rates.socialContributions == Rate(basisPoints: 1230))
        #expect(settings.rates.microCeiling == Money(188_700))
    }

    @Test("Des taux personnalisés survivent au changement d'activité si on le demande")
    func tauxPersonnalisésConservés() {
        var settings = MicroSettings(activity: .prestationBNC)
        settings.rates.socialContributions = Rate(basisPoints: 2500)   // personnalisé

        settings.changeActivity(to: .venteMarchandises, keepingCustomRates: true)
        #expect(settings.rates.socialContributions == Rate(basisPoints: 2500))

        settings.changeActivity(to: .prestationBIC, keepingCustomRates: false)
        #expect(settings.rates.socialContributions == Rate(basisPoints: 2120))
    }
}
