import { Tabs } from "expo-router";

import { Icon, type IconName } from "@/components/Icon";
import { MC } from "@/constants/theme";
import { useRootBackExit } from "@/hooks/useRootBackExit";

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

export default function DoctorTabsLayout() {
  useRootBackExit();

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
