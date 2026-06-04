import { Tabs } from 'expo-router';

import { Icon, IconName } from '@/components/Icon';
import { MC } from '@/constants/theme';

interface TabIconProps {
  name: IconName;
  focused: boolean;
  badge?: number;
}

function TabIcon({ name, focused, badge }: TabIconProps) {
  const color = focused ? MC.primary : MC.textMuted;
  return (
    <Icon
      name={name}
      size={focused ? 26 : 24}
      color={color}
      strokeWidth={focused ? 2 : 1.5}
    />
  );
}

export default function TabsLayout() {
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
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <TabIcon name="house" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: 'Citas',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mensajes"
        options={{
          title: 'Mensajes',
          tabBarIcon: ({ focused }) => <TabIcon name="chat-circle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
