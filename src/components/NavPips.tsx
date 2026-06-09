import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "../theme";

type Props = {
  count?: number;
  activeIndex: number;
};

function Pip({ active }: { active: boolean }) {
  const width = useRef(new Animated.Value(active ? 24 : 6)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: active ? 24 : 6,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [active, width]);

  return (
    <Animated.View
      style={[
        styles.pip,
        {
          width,
          backgroundColor: active ? colors.accent : "rgba(255,255,255,0.12)",
        },
      ]}
    />
  );
}

export function NavPips({ count = 3, activeIndex }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <Pip key={i} active={i === activeIndex} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pip: {
    height: 4,
    borderRadius: 100,
  },
});
