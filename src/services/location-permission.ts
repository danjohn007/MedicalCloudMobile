import * as Location from "expo-location";
import { Alert } from "react-native";

async function confirmLocationDisclosure(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      "Ubicación para funciones cercanas",
      "Doctor Cloud recopila tu ubicación precisa únicamente cuando eliges buscar doctores cercanos, completar una dirección o validar un consultorio. Las coordenadas se envían cifradas al servidor para ordenar resultados y guardar sólo la ubicación que confirmes. No se usan en segundo plano ni para publicidad.",
      [
        { text: "Ahora no", style: "cancel", onPress: () => resolve(false) },
        { text: "Continuar", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export async function requestForegroundLocationWithDisclosure(): Promise<Location.LocationPermissionResponse> {
  const current = await Location.getForegroundPermissionsAsync();
  if (
    current.granted ||
    current.status !== Location.PermissionStatus.UNDETERMINED ||
    !current.canAskAgain
  ) {
    return current;
  }

  const accepted = await confirmLocationDisclosure();
  if (!accepted) {
    return current;
  }

  return Location.requestForegroundPermissionsAsync();
}
