import Foundation
import PeculeCore

/// Assemble les calculs du coeur métier pour une liste d'encaissements donnée.
///
/// Point d'entrée unique des vues : elles n'instancient jamais un calculateur
/// directement, ce qui garantit que tous les écrans lisent les mêmes chiffres.
struct Ledger {

    let entries: [RevenueEntry]
    let settings: MicroSettings
    let referenceDate: Date

    private let calculator = ProvisionCalculator()
    private let statistics = RevenueStatistics()
    private let monitor = ThresholdMonitor()
    private let scheduler = DeadlineScheduler()

    init(entries: [RevenueEntry], settings: MicroSettings, referenceDate: Date = Date()) {
        self.entries = entries
        self.settings = settings
        self.referenceDate = referenceDate
    }

    var yearSummary: YearSummary {
        statistics.yearSummary(entries: entries, settings: settings, referenceDate: referenceDate)
    }

    var monthlyBreakdown: [MonthlyRevenue] {
        statistics.monthlyBreakdown(entries: entries, settings: settings, endingAt: referenceDate)
    }

    var thresholds: [ThresholdProgress] {
        monitor.progress(
            yearToDateRevenue: yearSummary.breakdown.netOfVAT,
            settings: settings,
            referenceDate: referenceDate
        )
    }

    var warnings: [ThresholdProgress] {
        thresholds.filter(\.status.isWarning)
    }

    var upcomingDeadlines: [Deadline] {
        scheduler.upcomingDeadlines(entries: entries, settings: settings, from: referenceDate)
    }

    var nextDeadline: Deadline? {
        upcomingDeadlines.first
    }

    var topClients: [(client: String, amount: Money)] {
        statistics.revenueByClient(entries: statistics.entriesOfYear(entries, containing: referenceDate))
    }

    func breakdown(for entry: RevenueEntry) -> ProvisionBreakdown {
        calculator.breakdown(for: entry, settings: settings)
    }

    /// Simulation à la volée pendant la saisie.
    func simulate(gross: Money) -> ProvisionBreakdown {
        calculator.breakdown(gross: gross, rates: settings.rates, settings: settings)
    }
}
