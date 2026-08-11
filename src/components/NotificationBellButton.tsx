import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { MC, themed } from "@/constants/theme";
import * as api from "@/services/api";
import { setAppNotificationBadgeCount } from "@/services/push-notifications";

export function NotificationBellButton({ light = false }: { light?: boolean }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.getNotifications();
      const count = (response.data || []).filter((item) => item.is_read === false).length;
      setUnreadCount(count);
      void setAppNotificationBadgeCount(count);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUnreadCount();
    }, [loadUnreadCount]),
  );

  return (
    <Pressable
      style={[
        styles.button,
        !light && { backgroundColor: MC.primaryLight, borderColor: themed("#CDEDEA", "#1F4C4A") },
        light && styles.buttonLight,
      ]}
      onPress={() => router.push("/notificaciones" as any)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Abrir notificaciones"
    >
      <Icon name="bell" size={21} color={light ? MC.white : MC.primaryDark} />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { borderColor: MC.card }]}>
          <Text style={[styles.badgeText, { color: MC.white }]}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Nota: los colores dependientes de tema (MC.xxx / themed()) se aplican
// inline arriba, NO aqui. StyleSheet.create() corre una sola vez al importar
// el modulo — si un color de MC quedara horneado aqui, se congelaria con la
// paleta que tuviera MC en ese momento y nunca reflejaria un cambio de modo
// posterior (este componente se usa en pantallas montadas desde el arranque,
// como Mis Citas, asi que corria ese riesgo).
const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  buttonLight: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
  },
});
