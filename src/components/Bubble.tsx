import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Entry } from "../storage";
import { fonts, getBubbleTheme, radius } from "../theme";
import { hexToRgba } from "../utils/colorUtils";
import { previewLinesForHeight } from "../utils/mosaicLayout";

type Props = {
  themeName: string;
  latestNote: Entry;
  count: number;
  width: number;
  height: number;
  onPress: () => void;
  style?: ViewStyle;
};

export function Bubble({
  themeName,
  latestNote,
  count,
  width,
  height,
  onPress,
  style,
}: Props) {
  const theme = getBubbleTheme(themeName);
  const compact = Math.min(width, height) < 108;
  const lines = previewLinesForHeight(height, width);
  const label =
    compact && themeName.length > 11
      ? `${themeName.slice(0, 10).toUpperCase()}…`
      : themeName.toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.bubble,
        compact && styles.bubbleCompact,
        {
          backgroundColor: theme.bg,
          borderColor: hexToRgba(theme.accent, 0.38),
          width,
          height,
          borderRadius: compact ? 14 : radius.bubble,
        },
        style,
      ]}
    >
      <Text
        style={[styles.bubbleTitle, compact && styles.bubbleTitleCompact, { color: theme.accent }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.bubblePreview,
          compact && styles.bubblePreviewCompact,
          { color: hexToRgba(theme.accent, 0.52) },
        ]}
        numberOfLines={lines}
      >
        {latestNote.text}
      </Text>
      <Text style={[styles.bubbleCount, compact && styles.bubbleCountCompact]}>{count}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderWidth: 1,
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  bubbleCompact: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  bubbleTitle: {
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.1 * 10,
  },
  bubbleTitleCompact: {
    fontSize: 9,
    letterSpacing: 0.08 * 9,
  },
  bubblePreview: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 14 * 1.45,
    flex: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  bubblePreviewCompact: {
    fontSize: 12,
    lineHeight: 12 * 1.4,
    marginTop: 5,
    marginBottom: 4,
  },
  bubbleCount: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
  },
  bubbleCountCompact: {
    fontSize: 9,
  },
});
