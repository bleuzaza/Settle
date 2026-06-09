import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Entry } from "../storage";
import { colors, fonts, radius, STACK_GAP } from "../theme";
import { addDays, dayNameShort, isoDate, WeekKind } from "../utils/dates";
import { formatAgendaTime } from "../utils/temporal";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DayData = {
  date: string;
  dateObj: Date;
  entries: Entry[];
};

type Props = {
  monday: Date;
  entries: Entry[];
  kind: WeekKind;
  label: string;
  todayIso: string;
  open: boolean;
  onToggle: () => void;
  onDeleteEntry: (id: string) => void;
};

function DayRow({
  day,
  kind,
  isToday,
  onDeleteEntry,
}: {
  day: DayData;
  kind: WeekKind;
  isToday: boolean;
  onDeleteEntry: (id: string) => void;
}) {
  const past = kind === "past";
  const current = kind === "current";

  const dayNameStyle = [
    styles.dayName,
    past && styles.dayNamePast,
    current && styles.dayNameCurrent,
    kind === "future" && styles.dayNameFuture,
  ];
  const dayNumStyle = [
    styles.dayNum,
    past && styles.dayNumPast,
    current && !isToday && styles.dayNumCurrent,
    current && isToday && styles.dayNumToday,
    kind === "future" && styles.dayNumFuture,
  ];
  const eventStyle = [
    styles.eventText,
    past && styles.eventTextPast,
    current && styles.eventTextCurrent,
    kind === "future" && styles.eventTextFuture,
  ];
  const emptyStyle = [
    styles.emptyDash,
    past && styles.emptyDashPast,
    current && styles.emptyDashCurrent,
    kind === "future" && styles.emptyDashFuture,
  ];
  const deleteStyle = [
    styles.eventDelete,
    past && styles.eventDeletePast,
    current && styles.eventDeleteCurrent,
    kind === "future" && styles.eventDeleteFuture,
  ];

  return (
    <View style={[styles.dayRow, past && styles.dayRowPast, current && styles.dayRowCurrent]}>
      <View style={styles.dayLabelCol}>
        <Text style={dayNameStyle}>{dayNameShort(day.dateObj)}</Text>
        <Text style={dayNumStyle}>{day.dateObj.getDate()}</Text>
      </View>
      <View style={styles.dayContent}>
        {day.entries.length === 0 ? (
          <Text style={emptyStyle}>—</Text>
        ) : (
          day.entries.map((entry) => {
            const timePrefix = entry.scheduledTime
              ? `à ${formatAgendaTime(entry.scheduledTime)} · `
              : "";
            return (
              <View key={entry.id} style={styles.eventRow}>
                <Text style={[eventStyle, styles.eventTextFlex]} numberOfLines={3}>
                  {timePrefix}
                  {entry.text}
                </Text>
                <TouchableOpacity onPress={() => onDeleteEntry(entry.id)} hitSlop={10}>
                  <Text style={deleteStyle}>Retirer</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

export function WeekBlock({
  monday,
  entries,
  kind,
  label,
  todayIso,
  open,
  onToggle,
  onDeleteEntry,
}: Props) {
  const days: DayData[] = Array.from({ length: 7 }, (_, i) => {
    const dateObj = addDays(monday, i);
    const date = isoDate(dateObj);
    return {
      date,
      dateObj,
      entries: entries
        .filter((e) => e.scheduledDate === date)
        .sort((a, b) => {
          const ta = a.scheduledTime || "99:99";
          const tb = b.scheduledTime || "99:99";
          if (ta !== tb) return ta.localeCompare(tb);
          return b.createdAt.localeCompare(a.createdAt);
        }),
    };
  });

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const past = kind === "past";
  const current = kind === "current";
  const future = kind === "future";

  const headStyle = [
    styles.weekHead,
    open && styles.weekHeadOpen,
    past && styles.weekHeadPast,
    current && styles.weekHeadCurrent,
    current && open && styles.weekHeadCurrentOpen,
    future && !open && styles.weekHeadFuture,
    future && open && styles.weekHeadFutureOpen,
  ];

  const bodyStyle = [
    styles.weekBody,
    past && styles.weekBodyPast,
    current && styles.weekBodyCurrent,
    future && styles.weekBodyFuture,
  ];

  const labelStyle = [
    styles.weekLabel,
    past && styles.weekLabelPast,
    current && styles.weekLabelCurrent,
    future && styles.weekLabelFuture,
  ];

  const countStyle = [
    styles.weekCount,
    past && styles.weekCountPast,
    current && styles.weekCountCurrent,
    future && styles.weekCountFuture,
  ];

  return (
    <View style={styles.block}>
      <TouchableOpacity activeOpacity={0.88} onPress={handleToggle} style={headStyle}>
        <Text style={labelStyle}>{label.toUpperCase()}</Text>
        <Text style={countStyle}>
          {entries.length} {open ? "↓" : "↑"}
        </Text>
      </TouchableOpacity>

      {open ? (
        <View style={bodyStyle}>
          {days.map((day) => (
            <DayRow
              key={day.date}
              day={day}
              kind={kind}
              isToday={day.date === todayIso}
              onDeleteEntry={onDeleteEntry}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: STACK_GAP,
  },
  weekHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radius.week,
    borderWidth: 1,
  },
  weekHeadOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  weekHeadPast: {
    backgroundColor: colors.bgPast,
    borderColor: colors.borderPast,
  },
  weekHeadCurrent: {
    backgroundColor: colors.bgCard,
    borderColor: colors.accentBorder,
  },
  weekHeadCurrentOpen: {
    borderBottomWidth: 0,
  },
  weekHeadFuture: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  weekHeadFutureOpen: {
    borderBottomWidth: 0,
  },
  weekLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    letterSpacing: 0.06 * 13,
    flex: 1,
  },
  weekLabelPast: { color: "rgba(255,255,255,0.2)" },
  weekLabelCurrent: { color: "rgba(255,255,255,0.7)" },
  weekLabelFuture: { color: "rgba(255,255,255,0.4)" },
  weekCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginLeft: 10,
  },
  weekCountPast: { color: "rgba(255,255,255,0.12)" },
  weekCountCurrent: { color: colors.textSecondary },
  weekCountFuture: { color: colors.textTertiary },
  weekBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.week,
    borderBottomRightRadius: radius.week,
    overflow: "hidden",
  },
  weekBodyPast: {
    backgroundColor: colors.bgPastDeep,
    borderColor: colors.borderPast,
  },
  weekBodyCurrent: {
    backgroundColor: colors.bgCardDeep,
    borderColor: colors.accentBorder,
  },
  weekBodyFuture: {
    backgroundColor: colors.bgCardDeep,
    borderColor: colors.border,
  },
  dayRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  dayRowPast: { borderTopColor: colors.borderPast },
  dayRowCurrent: { borderTopColor: colors.borderSubtle },
  dayLabelCol: { minWidth: 38 },
  dayName: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 0.06 * 11,
    textTransform: "uppercase",
  },
  dayNamePast: { color: "rgba(255,255,255,0.12)" },
  dayNameCurrent: { color: "rgba(255,255,255,0.25)" },
  dayNameFuture: { color: "rgba(255,255,255,0.25)" },
  dayNum: {
    fontFamily: fonts.body,
    fontSize: 19,
    marginTop: 3,
  },
  dayNumPast: { color: "rgba(255,255,255,0.18)" },
  dayNumCurrent: { color: "rgba(255,255,255,0.7)" },
  dayNumToday: { color: colors.accent },
  dayNumFuture: { color: "rgba(255,255,255,0.7)" },
  dayContent: { flex: 1, gap: 10, paddingTop: 3 },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  eventTextFlex: { flex: 1 },
  eventText: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 16 * 1.5,
  },
  eventTextPast: { color: "rgba(255,255,255,0.18)" },
  eventTextCurrent: { color: "rgba(255,255,255,0.6)" },
  eventTextFuture: { color: "rgba(255,255,255,0.6)" },
  eventDelete: {
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.08 * 10,
    textTransform: "uppercase",
    paddingTop: 4,
  },
  eventDeletePast: { color: "rgba(255,255,255,0.12)" },
  eventDeleteCurrent: { color: colors.textTertiary },
  eventDeleteFuture: { color: colors.textTertiary },
  emptyDash: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  emptyDashPast: { color: "rgba(255,255,255,0.08)" },
  emptyDashCurrent: { color: colors.textGhost },
  emptyDashFuture: { color: colors.textGhost },
});
