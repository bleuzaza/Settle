import SwiftUI

struct NotesView: View {
    @EnvironmentObject private var store: EntryStore
    @State private var modalTheme: String?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                Text("Notes")
                    .font(SettleFonts.title(42))
                    .foregroundStyle(SettleColors.textPrimary)
                    .padding(.top, 6)

                let groups = store.noteGroups
                if groups.isEmpty {
                    Text("Rien pour l'instant. Dépose une pensée au centre.")
                        .font(SettleFonts.body(15))
                        .foregroundStyle(SettleColors.textSecondary)
                } else {
                    MosaicGrid(groups: groups) { theme in
                        modalTheme = theme
                    }
                }
            }
            .padding(.horizontal, AppConstants.horizontalPadding)
            .padding(.bottom, 48)
        }
        .background(SettleColors.bg)
        .sheet(item: Binding(
            get: { modalTheme.map { ThemeSheetItem(name: $0) } },
            set: { modalTheme = $0?.name }
        )) { item in
            ThemeNotesSheet(themeName: item.name)
        }
    }
}

private struct ThemeSheetItem: Identifiable {
    let name: String
    var id: String { name }
}

private struct MosaicGrid: View {
    let groups: [String: [Entry]]
    let onSelect: (String) -> Void

    var body: some View {
        let sorted = groups.keys.sorted { (groups[$0]?.count ?? 0) > (groups[$1]?.count ?? 0) }
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppConstants.stackGap) {
            ForEach(sorted, id: \.self) { theme in
                if let entries = groups[theme], let latest = entries.first {
                    BubbleView(
                        themeName: theme,
                        latestNote: latest,
                        count: entries.count,
                        height: bubbleHeight(count: entries.count),
                        onPress: { onSelect(theme) }
                    )
                }
            }
        }
    }

    private func bubbleHeight(count: Int) -> CGFloat {
        min(180, max(110, 90 + CGFloat(count) * 8))
    }
}

private struct ThemeNotesSheet: View {
    @EnvironmentObject private var store: EntryStore
    @Environment(\.dismiss) private var dismiss
    let themeName: String

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(store.noteGroups[themeName] ?? []) { entry in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(entry.text)
                                .font(SettleFonts.body(16))
                                .foregroundStyle(SettleColors.textPrimary)
                            Button("Retirer") {
                                store.delete(id: entry.id)
                                if (store.noteGroups[themeName]?.count ?? 0) == 0 {
                                    dismiss()
                                }
                            }
                            .font(SettleFonts.body(13))
                            .foregroundStyle(SettleColors.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(SettleColors.bgCard)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
                .padding(20)
            }
            .background(SettleColors.bg)
            .navigationTitle(themeName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
