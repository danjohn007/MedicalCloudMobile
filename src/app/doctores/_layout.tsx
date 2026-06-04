import { Stack } from 'expo-router';

export default function DoctoresLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/agendar" />
      <Stack.Screen name="[id]/confirmar" />
      <Stack.Screen name="[id]/pago" />
    </Stack>
  );
}