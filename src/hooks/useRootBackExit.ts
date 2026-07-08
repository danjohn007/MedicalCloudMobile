import { useEffect, useRef } from "react";
import { useSegments } from "expo-router";
import { BackHandler, Platform, ToastAndroid } from "react-native";

export function useRootBackExit(groupName: "(tabs)" | "(doctor-tabs)", rootScreens: string[]) {
  const lastBackPressRef = useRef(0);
  const segments = useSegments() as readonly string[];
  const isTabRoot =
    segments[0] === groupName &&
    (segments.length === 1 || (segments.length === 2 && rootScreens.includes(String(segments[1]))));

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isTabRoot) {
        return false;
      }

      const now = Date.now();

      if (now - lastBackPressRef.current < 1800) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      ToastAndroid.show("Presiona atrás otra vez para salir.", ToastAndroid.SHORT);
      return true;
    });

    return () => subscription.remove();
  }, [isTabRoot]);
}
