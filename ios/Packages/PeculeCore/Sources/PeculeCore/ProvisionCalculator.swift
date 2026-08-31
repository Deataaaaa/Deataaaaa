import Foundation

/// La décomposition d'un encaissement entre ce qui est dû et ce qui reste.
public struct ProvisionBreakdown: Hashable, Sendable {

    /// Le montant encaissé, tel qu'il arrive sur le compte.
    public let gross: Money

    /// TVA collectée pour le compte de l'État, à reverser.
    public let vat: Money

    /// Chiffre d'affaires hors taxes : l'assiette des cotisations.
    public let netOfVAT: Money

    /// Cotisations sociales URSSAF.
    public let socialContributions: Money

    /// Contribution à la formation professionnelle.
    public let trainingContribution: Money

    /// Impôt sur le revenu provisionné.
    public let incomeTax: Money

    /// Coussin de sécurité volontaire.
    public let safetyMargin: Money

    /// Le total à mettre de côté.
    public var provisionTotal: Money {
        vat + socialContributions + trainingContribution + incomeTax + safetyMargin
    }

    /// Ce qui est réellement disponible.
    public var available: Money {
        (gross - provisionTotal).clampedToZero
    }

    /// La part de l'encaissement qui part en provision.
    public var provisionRate: Rate {
        Rate.effective(part: provisionTotal, of: gross)
    }

    /// Les postes non nuls, pour affichage.
    public var lines: [(label: String, amount: Money)] {
        var result: [(label: String, amount: Money)] = []
        if !vat.isZero {
            result.append((label: "TVA collectée", amount: vat))
        }
        if !socialContributions.isZero {
            result.append((label: "Cotisations URSSAF", amount: socialContributions))
        }
        if !trainingContribution.isZero {
            result.append((label: "Formation professionnelle", amount: trainingContribution))
        }
        if !incomeTax.isZero {
            result.append((label: "Impôt sur le revenu", amount: incomeTax))
        }
        if !safetyMargin.isZero {
            result.append((label: "Marge de sécurité", amount: safetyMargin))
        }
        return result
    }

    public static let empty = ProvisionBreakdown(
        gross: .zero, vat: .zero, netOfVAT: .zero,
        socialContributions: .zero, trainingContribution: .zero,
        incomeTax: .zero, safetyMargin: .zero
    )

    public init(
        gross: Money, vat: Money, netOfVAT: Money,
        socialContributions: Money, trainingContribution: Money,
        incomeTax: Money, safetyMargin: Money
    ) {
        self.gross = gross
        self.vat = vat
        self.netOfVAT = netOfVAT
        self.socialContributions = socialContributions
        self.trainingContribution = trainingContribution
        self.incomeTax = incomeTax
        self.safetyMargin = safetyMargin
    }

    public static func + (lhs: ProvisionBreakdown, rhs: ProvisionBreakdown) -> ProvisionBreakdown {
        ProvisionBreakdown(
            gross: lhs.gross + rhs.gross,
            vat: lhs.vat + rhs.vat,
            netOfVAT: lhs.netOfVAT + rhs.netOfVAT,
            socialContributions: lhs.socialContributions + rhs.socialContributions,
            trainingContribution: lhs.trainingContribution + rhs.trainingContribution,
            incomeTax: lhs.incomeTax + rhs.incomeTax,
            safetyMargin: lhs.safetyMargin + rhs.safetyMargin
        )
    }
}

/// Traduit un encaissement brut en « ce qui est à toi » et « ce qu'il faut garder ».
///
/// C'est la seule brique qui connaît les règles de calcul ; l'interface se
/// contente de l'afficher.
public struct ProvisionCalculator: Sendable {

    public init() {}

    /// Décompose un encaissement unique.
    public func breakdown(for entry: RevenueEntry, settings: MicroSettings) -> ProvisionBreakdown {
        let activity = entry.resolvedActivity(using: settings)
        // Si la ligne porte une activité différente de l'activité principale,
        // ses propres taux par défaut s'appliquent : mélanger les taux d'une
        // vente et d'une prestation fausserait la provision.
        let rates = activity == settings.activity ? settings.rates : RateTable.defaults(for: activity)
        return breakdown(gross: entry.grossAmount, rates: rates, settings: settings)
    }

    /// Décompose un montant brut. Exposé séparément pour alimenter le
    /// simulateur temps réel de l'écran de saisie.
    public func breakdown(gross: Money, rates: RateTable, settings: MicroSettings) -> ProvisionBreakdown {
        guard gross.isPositive else { return .empty }

        // La TVA est incluse dans l'encaissement : on la retranche pour obtenir
        // l'assiette des cotisations, qui est le chiffre d'affaires hors taxes.
        let vat: Money
        if settings.isVATRegistered, !rates.vatRate.isZero {
            let divisor = 1 + rates.vatRate.fraction
            vat = Money(gross.amount * rates.vatRate.fraction / divisor).rounded
        } else {
            vat = .zero
        }
        let netOfVAT = (gross - vat).rounded

        let social = netOfVAT.applying(rates.socialContributions)
        let training = netOfVAT.applying(rates.trainingContribution)

        let incomeTax: Money
        switch settings.incomeTaxMode {
        case .flatRate:
            incomeTax = netOfVAT.applying(rates.flatIncomeTax)
        case .marginalBracket(let bracket):
            // Le revenu imposable est le CA diminué de l'abattement forfaitaire ;
            // c'est lui, et non le CA, qui subit la tranche marginale.
            let taxableBase = Money(netOfVAT.amount * (1 - rates.incomeAllowance.fraction)).rounded
            incomeTax = taxableBase.applying(bracket)
        case .notProvisioned:
            incomeTax = .zero
        }

        let beforeMargin = social + training + incomeTax
        let margin = settings.safetyMargin.isZero ? Money.zero : beforeMargin.applying(settings.safetyMargin)

        return ProvisionBreakdown(
            gross: gross,
            vat: vat,
            netOfVAT: netOfVAT,
            socialContributions: social,
            trainingContribution: training,
            incomeTax: incomeTax,
            safetyMargin: margin
        )
    }

    /// Agrège la décomposition d'un ensemble d'encaissements.
    public func breakdown(for entries: some Sequence<RevenueEntry>, settings: MicroSettings) -> ProvisionBreakdown {
        entries.reduce(ProvisionBreakdown.empty) { partial, entry in
            partial + breakdown(for: entry, settings: settings)
        }
    }
}
