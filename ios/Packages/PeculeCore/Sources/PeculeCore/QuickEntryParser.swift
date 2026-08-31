import Foundation

/// Le résultat d'une saisie en langage naturel.
public struct ParsedEntry: Hashable, Sendable {
    public var amount: Money?
    public var date: Date?
    public var client: String?
    public var reference: String?

    public var isUsable: Bool { amount?.isPositive == true }

    public init(amount: Money? = nil, date: Date? = nil, client: String? = nil, reference: String? = nil) {
        self.amount = amount
        self.date = date
        self.client = client
        self.reference = reference
    }
}

/// Transforme « virement Dupont 1 250,50 € facture 2026-014 le 12/03 » en
/// encaissement structuré.
///
/// Entièrement déterministe : pas de modèle, pas de réseau, donc un résultat
/// reproductible et testable. C'est aussi ce qui permet à la saisie de
/// fonctionner hors ligne et sans latence.
public struct QuickEntryParser: Sendable {

    private let calendar: Calendar

    public init(calendar: Calendar = .gregorianUTC) {
        self.calendar = calendar
    }

    /// Mots qui décrivent la transaction plutôt que le client : les retirer
    /// évite de nommer un client « Virement ».
    private static let noiseWords: Set<String> = [
        "virement", "vir", "paiement", "paye", "payé", "payee", "payée",
        "recu", "reçu", "encaissement", "encaisse", "encaissé", "facture",
        "fact", "ref", "réf", "de", "du", "le", "la", "les", "pour", "chez",
        "client", "eur", "euro", "euros", "cb", "espèces", "especes", "chèque",
        "cheque", "acompte", "solde"
    ]

    public func parse(_ input: String, referenceDate: Date = Date()) -> ParsedEntry {
        var working = input
        var result = ParsedEntry()

        // L'ordre compte : on retire d'abord la date et la référence, sinon
        // leurs chiffres seraient pris pour le montant.
        result.date = extractDate(from: &working, referenceDate: referenceDate)
        result.reference = extractReference(from: &working)
        result.amount = extractAmount(from: &working)
        result.client = extractClient(from: working)

        return result
    }

    // MARK: - Date

    private func extractDate(from text: inout String, referenceDate: Date) -> Date? {
        let pattern = #/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/#
        guard let match = text.firstMatch(of: pattern) else {
            return extractRelativeDate(from: &text, referenceDate: referenceDate)
        }

        let day = Int(match.output.1) ?? 0
        let month = Int(match.output.2) ?? 0
        guard (1...31).contains(day), (1...12).contains(month) else { return nil }

        var year = calendar.component(.year, from: referenceDate)
        if let rawYear = match.output.3, let parsed = Int(rawYear) {
            year = parsed < 100 ? 2000 + parsed : parsed
        }

        text.replaceSubrange(match.range, with: " ")
        return calendar.date(from: DateComponents(year: year, month: month, day: day))
    }

    private func extractRelativeDate(from text: inout String, referenceDate: Date) -> Date? {
        let today = calendar.startOfDay(for: referenceDate)

        // Les index sont pris sur `text` lui-même : un `String.Index` calculé
        // sur une copie minusculée n'est pas valide ici, la casse pouvant
        // changer la longueur de la chaîne.
        // « avant-hier » contient « hier », donc l'ordre des tests compte.
        let offsets: [(needle: String, days: Int)] = [
            ("aujourd'hui", 0), ("aujourdhui", 0),
            ("avant-hier", -2),
            ("hier", -1)
        ]

        for (needle, days) in offsets {
            guard let range = text.range(of: needle, options: [.caseInsensitive, .diacriticInsensitive]) else {
                continue
            }
            text.replaceSubrange(range, with: " ")
            return calendar.date(byAdding: .day, value: days, to: today)
        }
        return nil
    }

    // MARK: - Référence

    private func extractReference(from text: inout String) -> String? {
        let pattern = #/(?:facture|fact\.?|ref\.?|réf\.?|n°|no\.?)\s*:?\s*([A-Za-z0-9][A-Za-z0-9\-_\/]{1,})/#
            .ignoresCase()
        guard let match = text.firstMatch(of: pattern) else { return nil }
        let reference = String(match.output.1)
        text.replaceSubrange(match.range, with: " ")
        return reference
    }

    // MARK: - Montant

    private func extractAmount(from text: inout String) -> Money? {
        // Deux formes acceptées : groupes de milliers complets (« 1 250 »,
        // « 1.250 ») ou suite brute de chiffres (« 1250 »).
        //
        // Le groupe de milliers exige exactement trois chiffres et au moins une
        // répétition, faute de quoi « 3500 » serait tronqué en « 350 ». Le
        // `(?!\d)` final interdit de s'arrêter au milieu d'un nombre, ce qui
        // ferait lire « 12 3500 » comme un unique « 12 350 ».
        let pattern = #/(\d{1,3}(?:[\u{00A0}\u{202F}\u{0020}.]\d{3})+|\d+)(?:[.,](\d{1,2}))?(?!\d)\s*(?:€|eur|euros?)?/#
            .ignoresCase()

        var best: (value: Decimal, range: Range<String.Index>)?
        for match in text.matches(of: pattern) {
            guard let value = decimalValue(integerPart: String(match.output.1),
                                           decimalPart: match.output.2.map(String.init)) else { continue }
            // En cas de plusieurs nombres, le plus grand est le montant :
            // les petits nombres résiduels sont des numéros ou des quantités.
            if best == nil || value > best!.value {
                best = (value, match.range)
            }
        }

        guard let best, best.value > 0 else { return nil }
        text.replaceSubrange(best.range, with: " ")
        return Money(best.value)
    }

    private func decimalValue(integerPart: String, decimalPart: String?) -> Decimal? {
        let digits = integerPart.filter(\.isNumber)
        guard !digits.isEmpty, var value = Decimal(string: digits) else { return nil }
        if let decimalPart, let fraction = Decimal(string: decimalPart) {
            let scale = Decimal(sign: .plus, exponent: -decimalPart.count, significand: 1)
            value += fraction * scale
        }
        return value
    }

    // MARK: - Client

    private func extractClient(from text: String) -> String? {
        let words = text
            .split(whereSeparator: { !$0.isLetter && $0 != "-" && $0 != "'" })
            .map(String.init)
            .filter { word in
                word.count > 1 && !Self.noiseWords.contains(word.lowercased())
            }
        guard !words.isEmpty else { return nil }
        return words.joined(separator: " ")
    }
}
