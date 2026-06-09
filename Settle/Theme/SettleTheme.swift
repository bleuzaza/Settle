import SwiftUI

enum SettleColors {
    static let bg = Color(hex: 0x0D0D0D)
    static let bgCard = Color(hex: 0x141414)
    static let bgCardDeep = Color(hex: 0x111111)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.6)
    static let textTertiary = Color.white.opacity(0.25)
    static let accent = Color(hex: 0x002FE6)
    static let accentMuted = Color(hex: 0x002FE6).opacity(0.38)
    static let accentBorder = Color(hex: 0x002FE6).opacity(0.22)
    static let accentSoft = Color(hex: 0x002FE6).opacity(0.10)
    static let border = Color.white.opacity(0.06)
}

enum SettleFonts {
    static func title(_ size: CGFloat) -> Font {
        .custom("Smirnoft", size: size)
    }

    static func body(_ size: CGFloat) -> Font {
        .custom("Coolvetica Rg", size: size)
    }
}

struct BubbleThemeStyle {
    let bg: Color
    let accent: Color
}

enum SettleTheme {
    static let radiusCard: CGFloat = 20
    static let radiusBubble: CGFloat = 20
    static let radiusWeek: CGFloat = 18

    private static let presets: [String: BubbleThemeStyle] = [
        "Paperasse": .init(bg: Color(hex: 0x1A1408), accent: Color(hex: 0xB8956C)),
        "Courses": .init(bg: Color(hex: 0x0A1812), accent: Color(hex: 0x6D9A6A)),
        "Santé": .init(bg: Color(hex: 0x1A1012), accent: Color(hex: 0xC4898E)),
        "Temps": .init(bg: Color(hex: 0x0B1228), accent: Color(hex: 0x6E92C4)),
        "Travail": .init(bg: Color(hex: 0x101418), accent: Color(hex: 0x6D8299)),
        "Relations": .init(bg: Color(hex: 0x1A120C), accent: Color(hex: 0xD49A6E)),
        "Scénario": .init(bg: Color(hex: 0x0B1228), accent: Color(hex: 0x3B6BFF)),
        "Texte de rap": .init(bg: Color(hex: 0x140D1E), accent: Color(hex: 0xA78BFA)),
        "Projets": .init(bg: Color(hex: 0x0A1812), accent: Color(hex: 0x34D399)),
        "Pensées": .init(bg: Color(hex: 0x1A1408), accent: Color(hex: 0xE8B84A)),
        "Rêves": .init(bg: Color(hex: 0x0A1424), accent: Color(hex: 0x5B9FFF)),
    ]

    private static let fallbackAccents: [Color] = [
        Color(hex: 0xF472B6), Color(hex: 0xFB923C), Color(hex: 0xA3E635),
        Color(hex: 0x22D3EE), Color(hex: 0x818CF8), Color(hex: 0xE879F9),
        Color(hex: 0xFBBF24),
    ]

    static func bubbleStyle(for themeName: String) -> BubbleThemeStyle {
        if let preset = presets[themeName] { return preset }
        let hash = themeName.utf8.reduce(0) { ($0 &* 31 &+ Int($1)) }
        let accent = fallbackAccents[abs(hash) % fallbackAccents.count]
        return BubbleThemeStyle(bg: SettleColors.bgCard, accent: accent)
    }
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
