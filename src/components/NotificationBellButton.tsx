import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { Icon } from "@/components/Icon";
import { MC } from "@/constants/theme";

export function NotificationBellButton({ light = false }: { light?: boolean }) {
  const router = useRouter();

  return (
    <Pressable
      style={[styles.button, light && styles.buttonLight]}
      onPress={() => router.push("/notificaciones" as any)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Abrir notificaciones"
    >
      <Icon name="bell" size={21} color={light ? MC.white : MC.primaryDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MC.primaryLight,
    borderWidth: 1,
    borderColor: "#CDEDEA",
  },
  buttonLight: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.22)",
  },
});
