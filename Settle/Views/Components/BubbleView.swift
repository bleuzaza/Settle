import SwiftUI

struct BubbleView: View {
    let themeName: String
    let latestNote: Entry
    let count: Int
    let height: CGFloat
    let onPress: () -> Void

    private var style: BubbleThemeStyle { SettleTheme.bubbleStyle(for: themeName) }

    var body: some View {
        Button(action: onPress) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(themeName)
                        .font(SettleFonts.body(15))
                        .foregroundStyle(style.accent)
                    Spacer()
                    if count > 1 {
                        Text("\(count)")
                            .font(SettleFonts.body(12))
                            .foregroundStyle(SettleColors.textSecondary)
                    }
                }
                Text(latestNote.text)
                    .font(SettleFonts.body(14))
                    .foregroundStyle(SettleColors.textPrimary.opacity(0.85))
                    .lineLimit(4)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .topLeading)
            .background(style.bg)
            .clipShape(RoundedRectangle(cornerRadius: SettleTheme.radiusBubble, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SettleTheme.radiusBubble, style: .continuous)
                    .stroke(style.accent.opacity(0.25), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
