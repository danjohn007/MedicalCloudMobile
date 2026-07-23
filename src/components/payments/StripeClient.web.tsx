import type { ReactNode } from "react";

export function StripeProvider({ children }: { children: ReactNode }) {
  return children;
}

export function CardField() {
  return null;
}

export function useConfirmPayment() {
  return {
    loading: false,
    confirmPayment: async () => ({
      error: {
        message: "El formulario de tarjeta está disponible en la app móvil.",
      },
    }),
  };
}
