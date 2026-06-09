import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { PIPS_ZONE } from "../utils/layoutMetrics";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Respecte encoche, Dynamic Island et barre d'accueil sur tous les iPhone. */
export function ScreenFrame({ children, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.frame,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + PIPS_ZONE,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
