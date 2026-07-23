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
      style={[styles.button, light && styles.buttonLight]}
      onPress={() => router.push("/notificaciones" as any)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Abrir notificaciones"
    >
      <Icon name="bell" size={21} color={light ? MC.white : MC.primaryDark} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      ) : null}
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
    borderColor: themed("#CDEDEA", "#1F4C4A"),
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
    borderColor: MC.card,
  },
  badgeText: {
    color: MC.white,
    fontSize: 9,
    fontWeight: "900",
  },
});
