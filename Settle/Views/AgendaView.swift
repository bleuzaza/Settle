import SwiftUI

struct AgendaView: View {
    @EnvironmentObject private var store: EntryStore
    @State private var expandedWeeks: Set<String> = [WeekHelper.weekKey(for: WeekHelper.mondayOf(Date()))]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                Text("Agenda")
                    .font(SettleFonts.title(42))
                    .foregroundStyle(SettleColors.textPrimary)
                    .padding(.top, 6)

                ForEach(WeekHelper.buildWeekMondays(past: 6, future: 4), id: \.self) { monday in
                    WeekBlockView(
                        monday: monday,
                        entries: entries(for: monday),
                        isOpen: expandedWeeks.contains(WeekHelper.weekKey(for: monday)),
                        onToggle: {
                            let key = WeekHelper.weekKey(for: monday)
                            if expandedWeeks.contains(key) {
                                expandedWeeks.remove(key)
                            } else {
                                expandedWeeks.insert(key)
                            }
                        },
                        onDelete: { store.delete(id: $0) }
                    )
                }
            }
            .padding(.horizontal, AppConstants.horizontalPadding)
            .padding(.bottom, 48)
        }
        .background(SettleColors.bg)
    }

    private func entries(for monday: Date) -> [Entry] {
        let start = WeekHelper.isoDate(monday)
        guard let endDate = Calendar.current.date(byAdding: .day, value: 6, to: monday) else { return [] }
        let end = WeekHelper.isoDate(endDate)
        return store.agendaEntries.filter { entry in
            guard let d = entry.scheduledDate else { return false }
            return d >= start && d <= end
        }
    }
}

private struct WeekBlockView: View {
    let monday: Date
    let entries: [Entry]
    let isOpen: Bool
    let onToggle: () -> Void
    let onDelete: (UUID) -> Void

    private var kind: WeekKind { WeekHelper.weekKind(monday) }
    private var todayIso: String { WeekHelper.isoDate(Date()) }

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onToggle) {
                HStack {
                    Text(WeekHelper.formatWeekLabel(monday))
                        .font(SettleFonts.body(16))
                        .foregroundStyle(kind == .past ? SettleColors.textSecondary : SettleColors.textPrimary)
                    Spacer()
                    Text("\(entries.count)")
                        .font(SettleFonts.body(13))
                        .foregroundStyle(SettleColors.textTertiary)
                    Image(systemName: isOpen ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(SettleColors.textTertiary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
            .buttonStyle(.plain)

            if isOpen {
                VStack(spacing: 8) {
                    if entries.isEmpty {
                        Text("Rien cette semaine.")
                            .font(SettleFonts.body(14))
                            .foregroundStyle(SettleColors.textTertiary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 12)
                    } else {
                        ForEach(entries) { entry in
                            HStack(alignment: .top, spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(entry.text)
                                        .font(SettleFonts.body(15))
                                        .foregroundStyle(SettleColors.textPrimary)
                                    if let date = entry.scheduledDate {
                                        let dayLabel = date == todayIso ? "Aujourd'hui" : date
                                        let timeLabel = entry.scheduledTime.map { TemporalParser.formatAgendaTime($0) }
                                        Text([dayLabel, timeLabel].compactMap { $0 }.joined(separator: " · "))
                                            .font(SettleFonts.body(12))
                                            .foregroundStyle(SettleColors.textSecondary)
                                    }
                                }
                                Spacer()
                                Button {
                                    onDelete(entry.id)
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(SettleColors.textTertiary)
                                }
                            }
                            .padding(14)
                            .background(kind == .past ? SettleColors.bgCardDeep : SettleColors.bgCard)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .padding(.horizontal, 10)
                        }
                        .padding(.bottom, 10)
                    }
                }
            }
        }
        .background(kind == .past ? SettleColors.bgCardDeep : SettleColors.bgCard)
        .clipShape(RoundedRectangle(cornerRadius: SettleTheme.radiusWeek, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SettleTheme.radiusWeek, style: .continuous)
                .stroke(SettleColors.border, lineWidth: 1)
        )
    }
}

enum WeekKind {
    case past
    case current
    case future
}

enum WeekHelper {
    static func isoDate(_ date: Date) -> String {
        let c = Calendar.current
        return String(format: "%04d-%02d-%02d", c.component(.year, from: date), c.component(.month, from: date), c.component(.day, from: date))
    }

    static func mondayOf(_ date: Date) -> Date {
        var cal = Calendar.current
        cal.firstWeekday = 2
        let weekday = cal.component(.weekday, from: date)
        let diff = weekday == 1 ? -6 : 2 - weekday
        return cal.date(byAdding: .day, value: diff, to: cal.startOfDay(for: date)) ?? date
    }

    static func weekKey(for monday: Date) -> String {
        isoDate(monday)
    }

    static func buildWeekMondays(past: Int, future: Int) -> [Date] {
        let current = mondayOf(Date())
        var result: [Date] = []
        for offset in stride(from: -past, through: future, by: 1) {
            if let d = Calendar.current.date(byAdding: .day, value: offset * 7, to: current) {
                result.append(d)
            }
        }
        return result
    }

    static func weekKind(_ monday: Date) -> WeekKind {
        let current = mondayOf(Date())
        if monday < current { return .past }
        if monday > current { return .future }
        return .current
    }

    static func formatWeekLabel(_ monday: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.dateFormat = "d MMM"
        guard let sunday = Calendar.current.date(byAdding: .day, value: 6, to: monday) else {
            return formatter.string(from: monday)
        }
        return "\(formatter.string(from: monday)) – \(formatter.string(from: sunday))"
    }
}
