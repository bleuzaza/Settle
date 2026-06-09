import SwiftUI

@main
struct SettleApp: App {
    @StateObject private var store = EntryStore.shared
    @StateObject private var speech = SpeechService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .environmentObject(speech)
                .preferredColorScheme(.dark)
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}
