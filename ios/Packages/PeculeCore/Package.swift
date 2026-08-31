// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PeculeCore",
    // Volontairement bas : le coeur métier n'utilise que Foundation, ce qui
    // permet de lancer `swift test` sur n'importe quelle plateforme en CI.
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "PeculeCore", targets: ["PeculeCore"])
    ],
    targets: [
        .target(
            name: "PeculeCore",
            swiftSettings: [.swiftLanguageMode(.v6)]
        ),
        .testTarget(
            name: "PeculeCoreTests",
            dependencies: ["PeculeCore"],
            swiftSettings: [.swiftLanguageMode(.v6)]
        )
    ]
)
