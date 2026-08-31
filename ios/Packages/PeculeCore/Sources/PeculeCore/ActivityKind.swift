import Foundation

/// La nature de l'activité exercée en micro-entreprise.
///
/// C'est elle qui détermine le taux de cotisations, l'abattement fiscal, le
/// plafond de chiffre d'affaires et le seuil de franchise de TVA.
public enum ActivityKind: String, CaseIterable, Sendable, Codable, Identifiable {

    /// Achat-revente de marchandises, vente à consommer sur place, hébergement.
    case venteMarchandises

    /// Prestations de services relevant des BIC (artisanat, services commerciaux).
    case prestationBIC

    /// Prestations de services relevant des BNC (professions libérales).
    case prestationBNC

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .venteMarchandises: "Vente de marchandises"
        case .prestationBIC: "Prestation de services (BIC)"
        case .prestationBNC: "Profession libérale (BNC)"
        }
    }

    public var shortLabel: String {
        switch self {
        case .venteMarchandises: "Vente"
        case .prestationBIC: "Services BIC"
        case .prestationBNC: "Libéral BNC"
        }
    }

    public var explanation: String {
        switch self {
        case .venteMarchandises:
            "Tu achètes et tu revends des biens, ou tu fais de l'hébergement."
        case .prestationBIC:
            "Tu vends une prestation de nature commerciale ou artisanale."
        case .prestationBNC:
            "Tu vends une prestation intellectuelle ou libérale (conseil, dev, design…)."
        }
    }
}
