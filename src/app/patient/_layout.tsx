import { Stack } from "expo-router";

export default function PatientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile" />
      <Stack.Screen name="expediente" />
      <Stack.Screen name="checkin" />
      <Stack.Screen name="documentos" />
      <Stack.Screen name="finanzas" />
    </Stack>
  );
}
