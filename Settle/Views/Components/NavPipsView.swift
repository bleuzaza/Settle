import SwiftUI

struct NavPipsView: View {
    let activeIndex: Int

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(index == activeIndex ? SettleColors.accent : SettleColors.textTertiary)
                    .frame(width: index == activeIndex ? 8 : 6, height: index == activeIndex ? 8 : 6)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(SettleColors.bg.opacity(0.6))
        .clipShape(Capsule())
    }
}
