import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="doctores" />
        <Stack.Screen name="doctores/[id]" />
        <Stack.Screen name="doctores/[id]/agendar" />
        <Stack.Screen name="doctores/[id]/confirmar" />
        <Stack.Screen name="doctores/[id]/pago" />
        <Stack.Screen name="confirmacion" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="videoconsulta/[id]" />
      </Stack>
    </>
  );
}
