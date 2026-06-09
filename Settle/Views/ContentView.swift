import SwiftUI

struct ContentView: View {
    @State private var page = 1

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $page) {
                NotesView().tag(0)
                HomeView(onSaved: {}).tag(1)
                AgendaView().tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .background(SettleColors.bg)

            NavPipsView(activeIndex: page)
                .padding(.bottom, 8)
                .allowsHitTesting(false)
        }
        .background(SettleColors.bg)
    }
}

#Preview {
    ContentView()
        .environmentObject(EntryStore.shared)
        .environmentObject(SpeechService())
}
