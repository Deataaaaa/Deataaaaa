import SwiftUI
import UIKit
import PeculeCore

/// Les couleurs sémantiques de l'application.
///
/// Une seule règle : le vert est ce qui appartient à l'utilisateur, l'orange
/// ce qui appartient à l'administration. Cette distinction porte toute la
/// lecture de l'app, il ne faut jamais l'inverser.
enum Palette {
    static let available = Color.green
    static let provision = Color.orange
    static let danger = Color.red
    static let neutral = Color.secondary
}

extension ThresholdStatus {
    var color: Color {
        switch self {
        case .comfortable: Palette.available
        case .approaching: Palette.provision
        case .exceeded: Palette.danger
        }
    }

    var symbolName: String {
        switch self {
        case .comfortable: "checkmark.circle.fill"
        case .approaching: "exclamationmark.triangle.fill"
        case .exceeded: "xmark.octagon.fill"
        }
    }

    var label: String {
        switch self {
        case .comfortable: "Sous le seuil"
        case .approaching: "Seuil proche"
        case .exceeded: "Seuil dépassé"
        }
    }
}

/// Une carte, brique visuelle de base de l'application.
struct Card<Content: View>: View {
    var title: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

/// Une jauge de seuil avec sa légende.
struct ThresholdGauge: View {
    let progress: ThresholdProgress

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label(progress.title, systemImage: progress.status.symbolName)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(progress.status.color)
                Spacer()
                Text(progress.current.formattedCompact)
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            ProgressView(value: progress.completion)
                .tint(progress.status.color)

            HStack {
                if progress.status == .exceeded {
                    Text("Seuil de \(progress.limit.formattedCompact) franchi")
                } else {
                    Text("Il reste \(progress.remaining.formattedCompact)")
                }
                Spacer()
                if let crossing = progress.projectedCrossing {
                    Text("atteint vers le \(crossing.shortDate)")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }
}

/// Un état vide explicite plutôt qu'un écran blanc.
struct EmptyStateView: View {
    let symbol: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: symbol)
        } description: {
            Text(message)
        } actions: {
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(.borderedProminent)
            }
        }
    }
}
