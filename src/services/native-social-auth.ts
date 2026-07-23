import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

const GOOGLE_WEB_CLIENT_ID = "1085913898548-41hl49foqh4q8r1rfroovtqcet78d07n.apps.googleusercontent.com";

let googleConfigured = false;

function configureGoogle(): void {
  if (googleConfigured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  googleConfigured = true;
}

export async function getNativeGoogleIdentity(): Promise<{ idToken: string; name?: string }> {
  configureGoogle();
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) {
    throw new Error("Inicio de sesión con Google cancelado.");
  }
  const idToken = result.data.idToken;
  if (!idToken) {
    throw new Error("Google no devolvió el token de inicio de sesión.");
  }
  return { idToken, name: result.data.user.name ?? undefined };
}

export async function getNativeAppleIdentity(): Promise<{ idToken: string; name?: string }> {
  if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync())) {
    throw new Error("Iniciar sesión con Apple solo está disponible en dispositivos iPhone o iPad compatibles.");
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error("Apple no devolvió el token de inicio de sesión.");
  }
  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
  return { idToken: credential.identityToken, name: name || undefined };
}
