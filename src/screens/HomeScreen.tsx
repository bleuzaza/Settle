import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { classifyAndSave } from "../ai";
import { ScreenFrame } from "../components/ScreenFrame";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { ANIM_DURATION, colors, fonts, H_PAD, radius } from "../theme";
import { getMainSquareSide } from "../utils/layoutMetrics";

type Props = {
  style?: ViewStyle;
  onSaved: () => void;
};

function ScaleButton({
  onPress,
  disabled,
  width,
  height,
  variant,
  active,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  width: number;
  height: number;
  variant: "dictate" | "deposit";
  active?: boolean;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, friction: 8, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  };

  const visual =
    variant === "dictate"
      ? [styles.btnDictate, active && styles.btnDictateActive]
      : [styles.btnDeposit, active && styles.btnDepositReady];

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={{ width, height }}
    >
      <Animated.View
        style={[
          visual,
          styles.btnFill,
          { transform: [{ scale }] },
          disabled && styles.btnDisabled,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

export function HomeScreen({ style, onSaved }: Props) {
  const [text, setText] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const inputOpacity = useRef(new Animated.Value(1)).current;
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { side, half } = useMemo(() => {
    const s = getMainSquareSide(screenW, screenH, insets.top, insets.bottom);
    return { side: s, half: s / 2 };
  }, [screenW, screenH, insets.top, insets.bottom]);

  const getText = useCallback(() => text, [text]);
  const { listening, error, start, stop, clearError } = useVoiceRecognition(getText, (t) => {
    setUsedVoice(true);
    setText(t);
  });

  const clearInputAnimated = useCallback(() => {
    Animated.timing(inputOpacity, {
      toValue: 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setText("");
      setUsedVoice(false);
      Animated.timing(inputOpacity, {
        toValue: 1,
        duration: ANIM_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [inputOpacity]);

  const handleDeposit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || depositing) return;
    await stop();

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDepositing(true);
    try {
      await classifyAndSave(trimmed, usedVoice || listening ? "voice" : "text");
      clearInputAnimated();
      onSaved();
    } finally {
      setDepositing(false);
    }
  }, [text, depositing, listening, usedVoice, stop, clearInputAnimated, onSaved]);

  const hasText = Boolean(text.trim());

  return (
    <ScreenFrame style={[styles.screen, style]}>
      <View style={styles.content}>
        <View style={styles.titleZone}>
          <Text style={styles.title}>settle</Text>
        </View>

        <View style={styles.squareRow}>
          <View style={[styles.mainSquare, { width: side, height: side }]}>
            <Animated.View
              style={[
                styles.inputWrap,
                { width: side, height: half, opacity: inputOpacity },
              ]}
            >
              <TextInput
                multiline
                value={text}
                onChangeText={(t) => {
                  clearError();
                  setText(t);
                }}
                placeholder="dépose une pensée…"
                placeholderTextColor="rgba(255,255,255,0.15)"
                selectionColor={colors.accent}
                style={styles.input}
                textAlignVertical="top"
              />
            </Animated.View>

            <View style={[styles.actions, { width: side, height: half }]}>
              <ScaleButton
                onPress={() => void start()}
                width={half}
                height={half}
                variant="dictate"
                active={listening}
              >
                {listening ? (
                  <Text style={styles.btnDictateIcon}>■</Text>
                ) : (
                  <Feather name="mic" size={22} color={colors.textPrimary} />
                )}
                <Text style={styles.btnDictateLabel}>{listening ? "Arrêter" : "Dicter"}</Text>
              </ScaleButton>

              <ScaleButton
                onPress={() => void handleDeposit()}
                disabled={!hasText || depositing}
                width={half}
                height={half}
                variant="deposit"
                active={hasText}
              >
                <Text style={[styles.btnDepositIcon, hasText && styles.btnDepositIconReady]}>↓</Text>
                <Text style={[styles.btnDepositLabel, hasText && styles.btnDepositLabelReady]}>
                  {depositing ? "…" : "Déposer"}
                </Text>
              </ScaleButton>
            </View>
          </View>
        </View>

        <View style={styles.bottomZone}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: H_PAD,
  },
  content: {
    flex: 1,
  },
  titleZone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 64,
    lineHeight: 68,
    color: colors.textPrimary,
    textAlign: "center",
  },
  squareRow: {
    alignItems: "center",
  },
  bottomZone: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 8,
  },
  mainSquare: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    overflow: "hidden",
    backgroundColor: colors.bgCard,
  },
  inputWrap: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 16,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 16 * 1.55,
    padding: 0,
  },
  actions: {
    flexDirection: "row",
  },
  btnFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnDictate: {
    backgroundColor: colors.accent,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  btnDictateActive: {
    backgroundColor: colors.accentMuted,
  },
  btnDictateIcon: {
    fontFamily: fonts.body,
    fontSize: 20,
    color: colors.textPrimary,
  },
  btnDictateLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    letterSpacing: 0.04 * 15,
    color: colors.textPrimary,
    textAlign: "center",
  },
  btnDeposit: {
    backgroundColor: colors.bgCardDeep,
  },
  btnDepositReady: {
    backgroundColor: colors.accentSoft,
  },
  btnDepositIcon: {
    fontFamily: fonts.body,
    fontSize: 20,
    color: "rgba(255,255,255,0.35)",
  },
  btnDepositIconReady: {
    color: colors.accent,
  },
  btnDepositLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    letterSpacing: 0.04 * 15,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  btnDepositLabelReady: {
    color: colors.textPrimary,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
