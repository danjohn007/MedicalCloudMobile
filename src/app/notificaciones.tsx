import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";
import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function NotificacionesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Icon name="arrow-left" size={24} color={MC.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notificaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Icon name="bell-slash" size={56} color={MC.textMuted} />
        </View>
        <Text style={styles.emptyText}>No tienes notificaciones</Text>
        <Text style={styles.emptySubtext}>
          Las notificaciones aparecerán aquí
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MC.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MC.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: MC.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: MC.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: MC.textSecondary },
  emptySubtext: { fontSize: 13, color: MC.textMuted },
});
