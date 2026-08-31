import Foundation
import PeculeCore

extension Money {
    /// « 1 250,50 € »
    var formatted: String {
        amount.formatted(.currency(code: "EUR").precision(.fractionLength(2)))
    }

    /// « 1 251 € » — sur un tableau de bord, les centimes sont du bruit.
    var formattedRounded: String {
        amount.formatted(.currency(code: "EUR").precision(.fractionLength(0)))
    }

    /// « 12,5 k€ » pour les grands nombres, sinon le montant entier.
    var formattedCompact: String {
        if amount >= 10_000 {
            let thousands = (amount / 1_000)
            return "\(thousands.formatted(.number.precision(.fractionLength(1)))) k€"
        }
        return formattedRounded
    }
}

extension Rate {
    var formatted: String {
        "\(percent.formatted(.number.precision(.fractionLength(0...2)))) %"
    }
}

extension Date {
    /// « 12 mars 2026 »
    var longDate: String {
        formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "fr_FR")))
    }

    /// « 12 mars »
    var shortDate: String {
        formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "fr_FR")))
    }
}

extension Int {
    /// Accord automatique du pluriel : « 1 jour », « 12 jours ».
    func pluralized(_ singular: String, _ plural: String? = nil) -> String {
        let word = abs(self) <= 1 ? singular : (plural ?? singular + "s")
        return "\(self) \(word)"
    }
}
