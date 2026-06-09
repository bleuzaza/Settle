import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bubble } from "../components/Bubble";
import { ScreenFrame } from "../components/ScreenFrame";
import { deleteEntry, Entry, getEntriesByTheme } from "../storage";
import { colors, fonts, H_PAD } from "../theme";
import { getHomeButtonSize } from "../utils/layoutMetrics";
import { buildMosaicLayout } from "../utils/mosaicLayout";

type Props = {
  style?: ViewStyle;
  refreshKey: number;
};

export function NotesScreen({ style, refreshKey }: Props) {
  const [grouped, setGrouped] = useState<Record<string, Entry[]>>({});
  const [modalTheme, setModalTheme] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const mosaicWidth = screenW - H_PAD * 2;

  const load = useCallback(async () => {
    setGrouped(await getEntriesByTheme());
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const mosaic = useMemo(() => {
    const cellSize = getHomeButtonSize(screenW, screenH, insets.top, insets.bottom);
    return buildMosaicLayout(grouped, mosaicWidth, { cellSize });
  }, [grouped, refreshKey, screenW, screenH, insets.top, insets.bottom, mosaicWidth]);

  const modalEntries = modalTheme ? grouped[modalTheme] ?? [] : [];

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    await load();
    if (modalTheme && (grouped[modalTheme]?.length ?? 0) <= 1) {
      setModalTheme(null);
    }
  };

  return (
    <ScreenFrame style={[styles.screen, style]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Notes</Text>

        {mosaic.items.length === 0 ? (
          <Text style={styles.empty}>Rien pour l'instant. Dépose une pensée au centre.</Text>
        ) : (
          <View style={[styles.mosaic, { width: mosaicWidth, height: mosaic.totalHeight }]}>
            {mosaic.items.map((item) => (
              <Bubble
                key={item.themeName}
                themeName={item.themeName}
                latestNote={item.entries[0]}
                count={item.entries.length}
                width={item.width}
                height={item.height}
                onPress={() => setModalTheme(item.themeName)}
                style={{
                  position: "absolute",
                  left: item.x,
                  top: item.y,
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalTheme !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalTheme(null)}
      >
        <View style={[styles.modal, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={() => setModalTheme(null)} hitSlop={12}>
            <Text style={styles.modalClose}>Fermer</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{modalTheme}</Text>
          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {modalEntries.map((entry) => (
              <View key={entry.id} style={styles.modalCard}>
                <Text style={styles.modalText}>{entry.text}</Text>
                <TouchableOpacity onPress={() => void handleDelete(entry.id)}>
                  <Text style={styles.modalDelete}>Retirer</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
    paddingBottom: 20,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
  mosaic: {
    position: "relative",
    alignSelf: "center",
  },
  modal: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: H_PAD,
  },
  modalClose: {
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.08 * 10,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: fonts.body,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: 24,
  },
  modalList: {
    gap: 12,
    paddingBottom: 24,
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  modalText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 15 * 1.6,
    color: colors.textSecondary,
  },
  modalDelete: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.08 * 10,
  },
});
