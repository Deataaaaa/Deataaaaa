import Foundation
import Testing
@testable import PeculeCore

@Suite("Saisie en langage naturel")
struct QuickEntryParserTests {

    let parser = QuickEntryParser()
    let today = Fixture.date(2026, 5, 15)

    @Test("Une phrase complète est décomposée en quatre champs")
    func phraseComplète() {
        let result = parser.parse("virement Dupont 1 250,50 € facture 2026-014 le 12/03", referenceDate: today)

        #expect(result.amount == Money(cents: 125_050))
        #expect(result.date == Fixture.date(2026, 3, 12))
        #expect(result.client == "Dupont")
        #expect(result.reference == "2026-014")
        #expect(result.isUsable)
    }

    @Test("Un montant sans séparateur de milliers n'est pas tronqué")
    func montantSansSéparateur() {
        // Le piège : un motif de milliers trop permissif lirait « 350 ».
        #expect(parser.parse("3500 Martin", referenceDate: today).amount == Money(3_500))
        #expect(parser.parse("Martin 90", referenceDate: today).amount == Money(90))
        #expect(parser.parse("12345 Martin", referenceDate: today).amount == Money(12_345))
    }

    @Test("Les séparateurs français, insécables compris, sont reconnus")
    func séparateursDeMilliers() {
        #expect(parser.parse("1 250 €").amount == Money(1_250))
        #expect(parser.parse("1\u{00A0}250 €").amount == Money(1_250))
        #expect(parser.parse("1\u{202F}250 €").amount == Money(1_250))
        #expect(parser.parse("1.250 €").amount == Money(1_250))
        #expect(parser.parse("12 500,25").amount == Money(cents: 1_250_025))
    }

    @Test("Le point comme le virgule séparent les décimales")
    func décimales() {
        #expect(parser.parse("1250.50").amount == Money(cents: 125_050))
        #expect(parser.parse("1250,5").amount == Money(cents: 125_050))
        #expect(parser.parse("1,50 €").amount == Money(cents: 150))
    }

    @Test("Entre plusieurs nombres, le plus grand est retenu comme montant")
    func plusieursNombres() {
        // « 12 3500 » ne doit surtout pas se lire « 12 350 ».
        #expect(parser.parse("12 3500", referenceDate: today).amount == Money(3_500))
    }

    @Test("Les dates relatives sont résolues par rapport à aujourd'hui")
    func datesRelatives() {
        #expect(parser.parse("hier 800 Durand", referenceDate: today).date == Fixture.date(2026, 5, 14))
        #expect(parser.parse("avant-hier 800 Durand", referenceDate: today).date == Fixture.date(2026, 5, 13))
        #expect(parser.parse("aujourd'hui 800 Durand", referenceDate: today).date == Fixture.date(2026, 5, 15))
    }

    @Test("« avant-hier » n'est pas lu comme « hier »")
    func avantHierPrioritaire() {
        let result = parser.parse("avant-hier 500", referenceDate: today)
        #expect(result.date == Fixture.date(2026, 5, 13))
    }

    @Test("Une date sur deux chiffres d'année est ramenée au siècle courant")
    func annéeAbrégée() {
        #expect(parser.parse("500 le 03/02/26", referenceDate: today).date == Fixture.date(2026, 2, 3))
        #expect(parser.parse("500 le 03/02/2025", referenceDate: today).date == Fixture.date(2025, 2, 3))
    }

    @Test("Une date impossible est ignorée plutôt qu'inventée")
    func dateInvalide() {
        #expect(parser.parse("500 le 45/99", referenceDate: today).date == nil)
    }

    @Test("Les mots décrivant la transaction ne deviennent pas des noms de client")
    func motsParasitesÉcartés() {
        #expect(parser.parse("virement reçu de 900", referenceDate: today).client == nil)
        #expect(parser.parse("paiement client Lefebvre 900", referenceDate: today).client == "Lefebvre")
    }

    @Test("Un client en plusieurs mots est conservé entier")
    func clientComposé() {
        #expect(parser.parse("1200 Studio Bergamote", referenceDate: today).client == "Studio Bergamote")
    }

    @Test("Une saisie vide ou sans montant n'est pas exploitable")
    func saisieInexploitable() {
        #expect(!parser.parse("", referenceDate: today).isUsable)
        #expect(!parser.parse("virement de Dupont", referenceDate: today).isUsable)
        #expect(parser.parse("", referenceDate: today).amount == nil)
    }

    @Test("Un montant seul suffit")
    func montantSeul() {
        let result = parser.parse("450", referenceDate: today)
        #expect(result.amount == Money(450))
        #expect(result.client == nil)
        #expect(result.date == nil)
        #expect(result.isUsable)
    }
}
