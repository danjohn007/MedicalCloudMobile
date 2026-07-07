import { useEffect, useRef } from "react";
import { BackHandler, Platform, ToastAndroid } from "react-native";

export function useRootBackExit() {
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const now = Date.now();

      if (now - lastBackPressRef.current < 1800) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      ToastAndroid.show("Presiona atras otra vez para salir.", ToastAndroid.SHORT);
      return true;
    });

    return () => subscription.remove();
  }, []);
}
