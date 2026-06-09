import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: EntryStore
    @EnvironmentObject private var speech: SpeechService

    let onSaved: () -> Void

    @State private var text = ""
    @State private var depositing = false
    @State private var usedVoice = false
    @State private var inputOpacity = 1.0

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width - AppConstants.horizontalPadding * 2, geo.size.height * 0.42)
            let half = side / 2
            let hasText = !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

            VStack(spacing: 0) {
                Spacer()

                Text("settle")
                    .font(SettleFonts.title(64))
                    .foregroundStyle(SettleColors.textPrimary)
                    .padding(.bottom, 24)

                VStack(spacing: 0) {
                    ZStack(alignment: .topLeading) {
                        if text.isEmpty && !speech.isListening {
                            Text("dépose une pensée…")
                                .font(SettleFonts.body(16))
                                .foregroundStyle(Color.white.opacity(0.15))
                                .padding(16)
                        }
                        TextEditor(text: $text)
                            .font(SettleFonts.body(16))
                            .foregroundStyle(SettleColors.textPrimary)
                            .scrollContentBackground(.hidden)
                            .padding(12)
                            .onChange(of: speech.transcript) { _, newValue in
                                if speech.isListening {
                                    usedVoice = true
                                    text = newValue
                                }
                            }
                            .onChange(of: text) { _, _ in
                                speech.clearError()
                            }
                    }
                    .frame(width: side, height: half)
                    .opacity(inputOpacity)
                    .background(SettleColors.bgCard)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(SettleColors.border).frame(height: 1)
                    }

                    HStack(spacing: 0) {
                        actionButton(
                            title: speech.isListening ? "Arrêter" : "Dicter",
                            icon: speech.isListening ? "stop.fill" : "mic.fill",
                            width: half,
                            height: half,
                            background: speech.isListening ? SettleColors.accentMuted : SettleColors.accent,
                            borderRight: true
                        ) {
                            Task {
                                if speech.isListening {
                                    await speech.stop()
                                } else {
                                    usedVoice = true
                                    await speech.start(from: text)
                                }
                            }
                        }

                        actionButton(
                            title: depositing ? "…" : "Déposer",
                            icon: "arrow.down",
                            width: half,
                            height: half,
                            background: hasText ? SettleColors.accentSoft : SettleColors.bgCardDeep,
                            foreground: hasText ? SettleColors.textPrimary : Color.white.opacity(0.4),
                            disabled: !hasText || depositing
                        ) {
                            Task { await deposit() }
                        }
                    }
                }
                .frame(width: side, height: side)
                .clipShape(RoundedRectangle(cornerRadius: SettleTheme.radiusCard, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: SettleTheme.radiusCard, style: .continuous)
                        .stroke(SettleColors.accentBorder, lineWidth: 1)
                )

                if let error = speech.errorMessage {
                    Text(error)
                        .font(SettleFonts.body(11))
                        .foregroundStyle(SettleColors.textSecondary)
                        .padding(.top, 10)
                }

                Spacer()
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, AppConstants.horizontalPadding)
            .background(SettleColors.bg)
        }
    }

    @ViewBuilder
    private func actionButton(
        title: String,
        icon: String,
        width: CGFloat,
        height: CGFloat,
        background: Color,
        foreground: Color = SettleColors.textPrimary,
        borderRight: Bool = false,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .medium))
                Text(title)
                    .font(SettleFonts.body(15))
            }
            .foregroundStyle(foreground)
            .frame(width: width, height: height)
            .background(background)
            .overlay(alignment: .trailing) {
                if borderRight {
                    Rectangle().fill(SettleColors.border).frame(width: 1)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.45 : 1)
    }

    private func deposit() async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !depositing else { return }
        await speech.stop()
        depositing = true
        defer { depositing = false }

        let source: Entry.EntrySource = (usedVoice || speech.isListening) ? .voice : .text
        let entries = EntryClassifier.classifyAndBuildEntries(
            text: trimmed,
            source: source,
            existingThemes: store.existingThemes
        )
        store.saveMany(entries)
        onSaved()

        withAnimation(.easeOut(duration: AppConstants.animDuration)) {
            inputOpacity = 0
        }
        try? await Task.sleep(nanoseconds: 250_000_000)
        text = ""
        usedVoice = false
        speech.transcript = ""
        withAnimation(.easeOut(duration: AppConstants.animDuration)) {
            inputOpacity = 1
        }
    }
}
