import { Tabs, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { MC } from "@/constants/theme";
import { useRootBackExit } from "@/hooks/useRootBackExit";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Icon
      name={name}
      size={focused ? 26 : 24}
      color={focused ? MC.primary : MC.textMuted}
      strokeWidth={focused ? 2 : 1.5}
    />
  );
}

const DOCTOR_ROOT_SCREENS = ["index", "pacientes", "citas", "mensajes", "perfil"];

export default function DoctorTabsLayout() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [checkingAccess, setCheckingAccess] = useState(true);
  useRootBackExit("(doctor-tabs)", DOCTOR_ROOT_SCREENS);

  useEffect(() => {
    if (user?.role !== "doctor") {
      setCheckingAccess(false);
      return;
    }

    let active = true;
    void api
      .getDoctorMobileAccess()
      .then(({ data }) => {
        if (!active) return;
        if (!data.can_access_mobile) {
          router.replace("/subscription-required" as any);
          return;
        }
        setCheckingAccess(false);
      })
      .catch(() => {
        if (active) router.replace("/subscription-required" as any);
      });

    return () => {
      active = false;
    };
  }, [router, user?.role]);

  if (checkingAccess) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: MC.background }}>
        <ActivityIndicator size="large" color={MC.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MC.primary,
        tabBarInactiveTintColor: MC.textMuted,
        tabBarStyle: {
          backgroundColor: MC.background,
          borderTopColor: MC.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ focused }) => <TabIcon name="house" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pacientes"
        options={{
          title: "Pacientes",
          tabBarIcon: ({ focused }) => <TabIcon name="user-circle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: "Consultas",
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mensajes"
        options={{
          title: "Mensajes",
          tabBarIcon: ({ focused }) => <TabIcon name="chat-circle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
