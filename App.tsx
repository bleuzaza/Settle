import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavPips } from "./src/components/NavPips";
import { AgendaScreen } from "./src/screens/AgendaScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { NotesScreen } from "./src/screens/NotesScreen";
import { colors } from "./src/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function App() {
  const [fontsLoaded] = useFonts({
    Smirnoft: require("./smirnoft/Smirnoft.ttf"),
    Coolvetica: require("./coolvetica/Coolvetica Rg.otf"),
  });
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, y: 0, animated: false });
  }, [fontsLoaded]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    setActiveIndex(index);
  }, []);

  const onSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <SafeAreaProvider>
      {!fontsLoaded ? (
        <LoadingView />
      ) : (
        <AppShell
          scrollRef={scrollRef}
          activeIndex={activeIndex}
          refreshKey={refreshKey}
          onScroll={onScroll}
          onSaved={onSaved}
        />
      )}
    </SafeAreaProvider>
  );
}

type AppShellProps = {
  scrollRef: React.RefObject<ScrollView | null>;
  activeIndex: number;
  refreshKey: number;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onSaved: () => void;
};

function AppShell({ scrollRef, activeIndex, refreshKey, onScroll, onSaved }: AppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentOffset={{ x: SCREEN_WIDTH, y: 0 }}
        style={styles.pager}
      >
        <NotesScreen style={{ width: SCREEN_WIDTH }} refreshKey={refreshKey} />
        <HomeScreen style={{ width: SCREEN_WIDTH }} onSaved={onSaved} />
        <AgendaScreen style={{ width: SCREEN_WIDTH }} refreshKey={refreshKey} />
      </ScrollView>
      <View
        pointerEvents="none"
        style={[styles.pipsOverlay, { paddingBottom: insets.bottom + 8 }]}
      >
        <NavPips activeIndex={activeIndex} />
      </View>
    </View>
  );
}

function LoadingView() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.loading, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator color={colors.accent} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pager: {
    flex: 1,
  },
  pipsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
