import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme } from "react-native";

import {
  addPushResponseListener,
  getLastPushResponseData,
  registerDeviceForPushNotifications,
  type PushNotificationData,
} from "@/services/push-notifications";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function numberValue(value: unknown): number {
  const parsed = Number.parseInt(textValue(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function routeFromPushData(data: PushNotificationData, role?: string | null): string {
  const source = textValue(data.source).toLowerCase();
  const type = textValue(data.type).toLowerCase();
  const relatedType = textValue(data.related_type).toLowerCase();
  const route = textValue(data.route).toLowerCase();
  const threadId =
    numberValue(data.thread_id) ||
    (relatedType === "chat_thread" ? numberValue(data.related_id) : 0);

  if ((route === "chat" || source.includes("chat") || type.includes("message")) && threadId > 0) {
    return `/chat/${threadId}`;
  }

  const appointmentId =
    numberValue(data.appointment_id) ||
    (relatedType === "appointment" ? numberValue(data.related_id) : 0);

  if ((route === "appointment" || relatedType === "appointment" || type.includes("appointment")) && appointmentId > 0) {
    return role === "doctor" ? `/doctor/appointments/${appointmentId}` : `/(tabs)/citas?appointmentId=${appointmentId}`;
  }

  if (relatedType === "support_ticket" && numberValue(data.related_id) > 0) {
    return `/soporte/${numberValue(data.related_id)}`;
  }

  const highlight = textValue(data.notification_id) || `${source || type || "notification"}-${textValue(data.related_id) || ""}`;
  return `/notificaciones?highlight=${encodeURIComponent(highlight)}`;
}

export default function RootLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.user?.role);
  const [doctorAccessChecked, setDoctorAccessChecked] = useState(true);
  const handledLastPushRef = useRef(false);
  const systemScheme = useColorScheme();
  const themeLoaded = useThemeStore((state) => state.loaded);
  const resolvedTheme = useThemeStore((state) => state.resolved);
  const loadTheme = useThemeStore((state) => state.load);
  const syncSystemTheme = useThemeStore((state) => state.syncSystem);

  useEffect(() => { void loadTheme(systemScheme); }, [loadTheme, systemScheme]);
  useEffect(() => { syncSystemTheme(systemScheme); }, [syncSystemTheme, systemScheme]);

  const openFromPush = useCallback(
    (data: PushNotificationData) => {
      router.push(routeFromPushData(data, userRole) as any);
    },
    [router, userRole],
  );

  useEffect(() => {
    const subscription = addPushResponseListener(openFromPush);

    return () => subscription.remove();
  }, [openFromPush]);

  useEffect(() => {
    if (!isAuthenticated || handledLastPushRef.current) {
      return;
    }

    handledLastPushRef.current = true;
    void getLastPushResponseData().then((data) => {
      if (data) {
        setTimeout(() => openFromPush(data), 250);
      }
    });
  }, [isAuthenticated, openFromPush]);

  useEffect(() => {
    if (isAuthenticated) {
      void registerDeviceForPushNotifications().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || userRole !== "doctor") {
      setDoctorAccessChecked(true);
      return;
    }

    let active = true;
    setDoctorAccessChecked(false);
    void api
      .getDoctorMobileAccess()
      .then(({ data }) => {
        if (!active) return;
        setDoctorAccessChecked(true);
        if (!data.can_access_mobile) {
          router.replace("/subscription-required" as any);
        }
      })
      .catch(() => {
        if (!active) return;
        setDoctorAccessChecked(true);
        router.replace("/subscription-required" as any);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, router, userRole]);

  if (!themeLoaded || !doctorAccessChecked) {
    return null;
  }

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(doctor-tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="doctores" />
        <Stack.Screen name="notificaciones" />
        <Stack.Screen name="soporte" />
        <Stack.Screen name="ai/chat" />
        <Stack.Screen name="confirmacion" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="videoconsulta/[id]" />
        <Stack.Screen name="patient" />
        <Stack.Screen name="doctor" />
        <Stack.Screen name="stripe-connect" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="account" />
        <Stack.Screen name="subscription-required" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
