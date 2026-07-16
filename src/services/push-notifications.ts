import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { registerPushToken, unregisterPushToken } from "@/services/api";
import { getSecure, removeSecure, setSecure } from "@/services/storage";

const PUSH_TOKEN_KEY = "doctorcloud_expo_push_token";

type NotificationsModule = typeof import("expo-notifications");
type PushSubscription = { remove: () => void };
export type PushNotificationData = Record<string, unknown>;

let notificationsModule: NotificationsModule | null | undefined;
let notificationHandlerReady = false;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function getNotificationsModule(): NotificationsModule | null {
  if (Platform.OS === "web" || isExpoGo()) {
    return null;
  }

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    // expo-notifications remote push is intentionally not loaded in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require("expo-notifications") as NotificationsModule;
  } catch {
    notificationsModule = null;
  }

  if (notificationsModule && !notificationHandlerReady) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerReady = true;
  }

  return notificationsModule;
}

function projectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.expoConfig?.extra?.projectId
  );
}

export async function registerDeviceForPushNotifications(): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications || !Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "DoctorCloud",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#208AEF",
      sound: "default",
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const id = projectId();
  if (!id) {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  await setSecure(PUSH_TOKEN_KEY, token);
  await registerPushToken({
    token,
    platform: Platform.OS,
    device_id: Device.osInternalBuildId || Device.deviceName || null,
    app_version: Constants.expoConfig?.version || null,
  });

  return token;
}

export async function unregisterDeviceForPushNotifications(): Promise<void> {
  const token = await getSecure(PUSH_TOKEN_KEY);
  if (token) {
    await unregisterPushToken(token);
    await removeSecure(PUSH_TOKEN_KEY);
  }
}

export function addPushResponseListener(onOpen: (data: PushNotificationData) => void): PushSubscription {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return { remove: () => {} };
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen(response.notification.request.content.data ?? {});
  });
}

export async function getLastPushResponseData(): Promise<PushNotificationData | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification.request.content.data ?? null;
  } catch {
    return null;
  }
}

export async function setAppNotificationBadgeCount(count: number): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {}
}
