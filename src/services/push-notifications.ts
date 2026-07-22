import Constants from "expo-constants";
import * as Device from "expo-device";
import { PermissionsAndroid, Platform } from "react-native";

import { registerPushToken, unregisterPushToken } from "@/services/api";
import { getSecure, removeSecure, setSecure } from "@/services/storage";

const PUSH_TOKEN_KEY = "doctorcloud_fcm_push_token";
const INSTALLATION_ID_KEY = "doctorcloud_push_installation_id";

type MessagingModule = typeof import("@react-native-firebase/messaging");
type MessagingInstance = ReturnType<MessagingModule["getMessaging"]>;
type RemoteMessage = Awaited<ReturnType<MessagingModule["getInitialNotification"]>>;
type PushSubscription = { remove: () => void };
export type PushNotificationData = Record<string, unknown>;

let messagingModule: MessagingModule | null | undefined;
let tokenRefreshSubscription: (() => void) | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function getMessagingModule(): MessagingModule | null {
  if (Platform.OS === "web" || isExpoGo()) {
    return null;
  }

  if (messagingModule !== undefined) {
    return messagingModule;
  }

  try {
    // React Native Firebase is native code and is unavailable in Expo Go/web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    messagingModule = require("@react-native-firebase/messaging") as MessagingModule;
  } catch {
    messagingModule = null;
  }

  return messagingModule;
}

function getMessaging(): { module: MessagingModule; messaging: MessagingInstance } | null {
  const module = getMessagingModule();
  if (!module) {
    return null;
  }

  return { module, messaging: module.getMessaging() };
}

function appVersion(): string | null {
  return Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || null;
}

async function deviceId(): Promise<string> {
  const existing = await getSecure(INSTALLATION_ID_KEY);
  if (existing) {
    return existing;
  }

  // This identifies this app installation, not the person's physical device.
  // It survives normal app updates and lets the API retire only its old token.
  const installationId = `dc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  await setSecure(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

function pushDataFromMessage(message: RemoteMessage): PushNotificationData | null {
  if (!message) {
    return null;
  }

  return {
    ...(message.data ?? {}),
    title: message.notification?.title,
    body: message.notification?.body,
    message_id: message.messageId,
    sent_time: message.sentTime,
  };
}

function isAuthorized(status: unknown, module: MessagingModule): boolean {
  const authorizationStatus = module.AuthorizationStatus;
  return (
    status === authorizationStatus.AUTHORIZED ||
    status === authorizationStatus.PROVISIONAL ||
    status === true
  );
}

function pushRegistrationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (Platform.OS === "android" && (lower.includes("fcm registration failed") || lower.includes("messaging/unknown"))) {
    return "Android no pudo registrarse en Firebase FCM. Revisa que el google-services.json sea del paquete com.doctorcloud.app y que la API key de Google/Firebase permita esta firma SHA-1/SHA-256 de la build instalada.";
  }
  if (Platform.OS === "android" && lower.includes("service_not_available")) {
    return "Firebase FCM no esta disponible en este dispositivo o Google Play Services no pudo responder. Revisa conexion, Play Services y vuelve a intentar.";
  }
  if (message.trim() !== "") {
    return message;
  }
  return "No se pudo registrar el dispositivo en Firebase FCM.";
}

async function requestNotificationPermission(module: MessagingModule, messaging: MessagingInstance): Promise<boolean> {
  if (Platform.OS === "android") {
    const androidVersion = Number(Platform.Version);
    if (androidVersion >= 33) {
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      const current = await PermissionsAndroid.check(permission);
      if (!current) {
        const result = await PermissionsAndroid.request(permission);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }
    }

    return true;
  }

  const status = await module.requestPermission(messaging);
  return isAuthorized(status, module);
}

async function saveTokenToApi(token: string): Promise<void> {
  await setSecure(PUSH_TOKEN_KEY, token);
  await registerPushToken({
    token,
    platform: Platform.OS,
    device_id: await deviceId(),
    app_version: appVersion(),
  });
}

function ensureTokenRefreshListener(module: MessagingModule, messaging: MessagingInstance): void {
  if (tokenRefreshSubscription) {
    return;
  }

  tokenRefreshSubscription = module.onTokenRefresh(messaging, (token) => {
    if (token) {
      void saveTokenToApi(token).catch(() => {});
    }
  });
}

export function getPushRuntimeStatus(): {
  canUseRemotePush: boolean;
  isExpoGo: boolean;
  isDevice: boolean;
  platform: string;
  provider: "fcm";
  reason?: string;
} {
  const expoGo = isExpoGo();

  if (Platform.OS === "web") {
    return {
      canUseRemotePush: false,
      isExpoGo: expoGo,
      isDevice: Device.isDevice,
      platform: Platform.OS,
      provider: "fcm",
      reason: "Las push remotas FCM no se prueban desde web.",
    };
  }

  if (expoGo) {
    return {
      canUseRemotePush: false,
      isExpoGo: true,
      isDevice: Device.isDevice,
      platform: Platform.OS,
      provider: "fcm",
      reason: "Firebase Messaging requiere un build nativo instalado; no funciona dentro de Expo Go.",
    };
  }

  if (!Device.isDevice) {
    return {
      canUseRemotePush: false,
      isExpoGo: expoGo,
      isDevice: false,
      platform: Platform.OS,
      provider: "fcm",
      reason: "Las push remotas requieren un telefono fisico.",
    };
  }

  if (!getMessagingModule()) {
    return {
      canUseRemotePush: false,
      isExpoGo: expoGo,
      isDevice: Device.isDevice,
      platform: Platform.OS,
      provider: "fcm",
      reason: "Firebase Messaging no esta incluido en este build. Reinstala la app con un build nuevo.",
    };
  }

  return {
    canUseRemotePush: true,
    isExpoGo: expoGo,
    isDevice: Device.isDevice,
    platform: Platform.OS,
    provider: "fcm",
  };
}

export async function registerDeviceForPushNotifications(): Promise<string | null> {
  try {
    const status = getPushRuntimeStatus();
    if (!status.canUseRemotePush) {
      return null;
    }

    const context = getMessaging();
    if (!context) {
      return null;
    }

    const { module, messaging } = context;
    const granted = await requestNotificationPermission(module, messaging);
    if (!granted) {
      return null;
    }

    if (typeof module.registerDeviceForRemoteMessages === "function") {
      await module.registerDeviceForRemoteMessages(messaging);
    }

    const token = await module.getToken(messaging);
    if (!token) {
      return null;
    }

    await saveTokenToApi(token);
    ensureTokenRefreshListener(module, messaging);

    return token;
  } catch (error) {
    throw new Error(pushRegistrationErrorMessage(error));
  }
}

export async function unregisterDeviceForPushNotifications(): Promise<void> {
  const token = await getSecure(PUSH_TOKEN_KEY);
  if (token) {
    await unregisterPushToken(token);
    await removeSecure(PUSH_TOKEN_KEY);
  }

  if (tokenRefreshSubscription) {
    tokenRefreshSubscription();
    tokenRefreshSubscription = null;
  }
}

export function addPushResponseListener(onOpen: (data: PushNotificationData) => void): PushSubscription {
  const context = getMessaging();
  if (!context) {
    return { remove: () => {} };
  }

  const unsubscribe = context.module.onNotificationOpenedApp(context.messaging, (message) => {
    const data = pushDataFromMessage(message);
    if (data) {
      onOpen(data);
    }
  });

  return { remove: unsubscribe };
}

export async function getLastPushResponseData(maxAgeMs = 15000): Promise<PushNotificationData | null> {
  const context = getMessaging();
  if (!context) {
    return null;
  }

  try {
    const message = await context.module.getInitialNotification(context.messaging);
    const data = pushDataFromMessage(message);
    if (!data) {
      return null;
    }

    const sentTime = Number(message?.sentTime ?? 0);
    const isRecent = !sentTime || Date.now() - sentTime <= maxAgeMs;
    return isRecent ? data : null;
  } catch {
    return null;
  }
}

export async function setAppNotificationBadgeCount(_count: number): Promise<void> {
  // Badge updates now come from the FCM/APNs payload sent by the server.
}
