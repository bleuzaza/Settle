import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutAnimation, Platform, ScrollView, StyleSheet, Text, UIManager, ViewStyle } from "react-native";
import { ScreenFrame } from "../components/ScreenFrame";
import { WeekBlock } from "../components/WeekBlock";
import { deleteEntry, Entry, getAllEntries } from "../storage";
import { colors, fonts, H_PAD } from "../theme";
import {
  buildWeekMondays,
  formatWeekLabel,
  isoDate,
  mondayOf,
  weekKind,
} from "../utils/dates";

type Props = {
  style?: ViewStyle;
  refreshKey: number;
};

function weekKey(monday: Date): string {
  return isoDate(monday);
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function AgendaScreen({ style, refreshKey }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const todayIso = isoDate(new Date());
  const weeks = useMemo(() => buildWeekMondays(6, 4), []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const current = weekKey(mondayOf(new Date()));
    return { [current]: true };
  });

  const load = useCallback(async () => {
    const all = await getAllEntries();
    setEntries(all.filter((e) => e.scheduledDate));
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const entriesForWeek = useCallback(
    (monday: Date) => {
      const start = isoDate(monday);
      const endDate = new Date(monday);
      endDate.setDate(endDate.getDate() + 6);
      const end = isoDate(endDate);
      return entries.filter((e) => e.scheduledDate && e.scheduledDate >= start && e.scheduledDate <= end);
    },
    [entries],
  );

  const toggleWeek = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = useCallback(
    async (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await deleteEntry(id);
      await load();
    },
    [load],
  );

  return (
    <ScreenFrame style={[styles.screen, style]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Agenda</Text>

        {weeks.map((monday) => {
          const kind = weekKind(monday);
          const key = weekKey(monday);
          const weekEntries = entriesForWeek(monday);
          return (
            <WeekBlock
              key={key}
              monday={monday}
              entries={weekEntries}
              kind={kind}
              label={formatWeekLabel(monday)}
              todayIso={todayIso}
              open={expanded[key] ?? false}
              onToggle={() => toggleWeek(key)}
              onDeleteEntry={(id) => void handleDelete(id)}
            />
          );
        })}
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: H_PAD,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 42,
    color: colors.textPrimary,
    paddingTop: 6,
    paddingBottom: 18,
  },
});
