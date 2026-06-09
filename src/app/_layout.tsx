import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="doctores" />
        <Stack.Screen name="notificaciones" />
        <Stack.Screen name="confirmacion" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="videoconsulta/[id]" />
        <Stack.Screen name="patient" />
      </Stack>
    </>
  );
}
