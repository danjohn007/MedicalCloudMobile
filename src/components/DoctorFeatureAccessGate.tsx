import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

import { MC } from "@/constants/theme";
import type { DoctorMobileAccess } from "@/services/api";
import * as api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

type DoctorFeature = Exclude<keyof DoctorMobileAccess["features"], "mobile_app">;

type Props = {
  feature: DoctorFeature;
  children: ReactNode;
};

/**
 * Applies the paid-module check before rendering doctor-only functionality.
 * The API enforces the same entitlement, so this component handles only UX.
 */
export function DoctorFeatureAccessGate({ feature, children }: Props) {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const [checking, setChecking] = useState(role === "doctor");

  useEffect(() => {
    if (role !== "doctor") {
      setChecking(false);
      return;
    }

    let active = true;
    setChecking(true);
    void api
      .getDoctorMobileAccess()
      .then(({ data }) => {
        if (!active) return;
        if (!data.can_access_mobile) {
          router.replace("/subscription-required" as any);
          return;
        }
        if (!data.features[feature]) {
          router.replace(`/subscription-required?feature=${feature}` as any);
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (active) router.replace(`/subscription-required?feature=${feature}` as any);
      });

    return () => {
      active = false;
    };
  }, [feature, role, router]);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: MC.background,
        }}
      >
        <ActivityIndicator size="large" color={MC.primary} />
      </View>
    );
  }

  return <>{children}</>;
}
