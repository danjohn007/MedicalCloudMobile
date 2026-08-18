import { Platform } from "react-native";

import * as api from "@/services/api";

/**
 * Compras dentro de la app (App Store / Google Play).
 *
 * Apple rechazó la versión 7.0.0 (28) por Guideline 3.1.1: el acceso de doctor
 * solo se podía comprar en la web. Aquí se contrata con las pasarelas nativas.
 *
 * El módulo nativo no existe en Expo Go ni en web, así que se carga de forma
 * perezosa igual que Firebase Messaging: importarlo arriba rompería esos dos
 * entornos al abrir cualquier pantalla.
 */

type IapModule = typeof import("expo-iap");

let iapModule: IapModule | null | undefined;
let connected = false;

export type StorePlatform = "apple" | "google";

export interface StorePlanProduct {
  period: "monthly" | "annual";
  product_id: string;
}

/** Oferta comprable, ya cruzada con el precio real de la tienda. */
export interface StoreOffer {
  period: "monthly" | "annual";
  productId: string;
  /** Precio formateado por la tienda, en la moneda del usuario. */
  displayPrice: string;
  /** Google Play exige el token de la oferta al iniciar la compra. */
  offerToken?: string;
}

export interface StorePlanOffer {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  reference_price: number;
  is_popular: boolean;
  features: Record<string, boolean>;
  offers: StoreOffer[];
}

export function storePlatform(): StorePlatform | null {
  if (Platform.OS === "ios") return "apple";
  if (Platform.OS === "android") return "google";
  return null;
}

function getIapModule(): IapModule | null {
  if (Platform.OS === "web") return null;
  if (iapModule !== undefined) return iapModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    iapModule = require("expo-iap") as IapModule;
  } catch {
    iapModule = null;
  }

  return iapModule;
}

export function isIapAvailable(): boolean {
  return getIapModule() !== null && storePlatform() !== null;
}

async function ensureConnection(): Promise<IapModule> {
  const module = getIapModule();
  if (!module) {
    throw new Error(
      "Las compras dentro de la app no están disponibles en esta versión. Instala la app desde App Store o Google Play.",
    );
  }

  if (!connected) {
    await module.initConnection();
    connected = true;
  }

  return module;
}

export async function endIapConnection(): Promise<void> {
  const module = getIapModule();
  if (!module || !connected) return;

  try {
    await module.endConnection();
  } finally {
    connected = false;
  }
}

/**
 * Une los planes del backend con los precios reales de la tienda.
 *
 * El precio mostrado tiene que ser el de la tienda, no el de la BD: Apple lo
 * exige y es el único que refleja moneda e impuestos del país del usuario.
 */
export async function loadPlansWithPrices(): Promise<StorePlanOffer[]> {
  const platform = storePlatform();
  if (!platform) {
    throw new Error("Las suscripciones solo se pueden contratar desde la app móvil.");
  }

  const module = await ensureConnection();
  const { data: plans } = await api.getStoreSubscriptionPlans(platform);

  const skus = plans.flatMap((plan) => plan.products.map((p) => p.product_id));
  if (skus.length === 0) return [];

  const products = (await module.fetchProducts({ skus, type: "subs" })) as any[];

  return plans
    .map((plan) => {
      const offers = plan.products
        .map((product): StoreOffer | null => {
          const match = products?.find((p) => p?.id === product.product_id);
          if (!match) return null;

          return {
            period: product.period,
            productId: product.product_id,
            displayPrice: String(match.displayPrice ?? ""),
            // En Android una suscripción se compra a través de una oferta concreta.
            offerToken: match.subscriptionOffers?.[0]?.offerToken ?? undefined,
          };
        })
        .filter((o): o is StoreOffer => o !== null);

      const { products: _ignored, ...rest } = plan;
      return { ...rest, offers };
    })
    // Un plan cuyo producto no existe en la tienda no se puede comprar; mostrarlo
    // solo llevaría al usuario a un error al tocar "Suscribirme".
    .filter((plan) => plan.offers.length > 0);
}

/**
 * Compra una suscripción y la activa en el servidor.
 *
 * `requestPurchase` es event-based: el resultado llega por los listeners, no por
 * el valor de retorno. El acuse (`finishTransaction`) se manda solo después de
 * que el backend validó el recibo; si se acusara antes y la validación fallara,
 * el usuario habría pagado sin acceso y la tienda ya no reintentaría la entrega.
 */
export async function purchaseSubscription(offer: StoreOffer): Promise<void> {
  const platform = storePlatform();
  if (!platform) {
    throw new Error("Las suscripciones solo se pueden contratar desde la app móvil.");
  }

  const module = await ensureConnection();

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      updated.remove();
      failed.remove();
    };

    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const updated = module.purchaseUpdatedListener(async (purchase: any) => {
      const token = String(purchase?.purchaseToken ?? "");
      if (!token) {
        settle(new Error("La tienda no devolvió un comprobante de compra válido."));
        return;
      }

      try {
        await api.verifyStoreSubscription({
          platform,
          product_id: String(purchase?.productId ?? offer.productId),
          token,
        });
        await module.finishTransaction({ purchase, isConsumable: false });
        settle();
      } catch (e: any) {
        settle(new Error(e?.message ?? "No pudimos activar tu suscripción."));
      }
    });

    const failed = module.purchaseErrorListener((error: any) => {
      settle(new Error(error?.message ?? "La compra no se completó."));
    });

    module
      .requestPurchase({
        request: {
          apple: { sku: offer.productId },
          google: {
            skus: [offer.productId],
            subscriptionOffers: offer.offerToken
              ? [{ sku: offer.productId, offerToken: offer.offerToken }]
              : [],
          },
        },
        type: "subs",
      })
      .catch((e: any) => settle(new Error(e?.message ?? "No se pudo abrir el pago.")));
  });
}

/**
 * Restaura compras previas. Apple rechaza las apps con suscripción que no
 * ofrecen esta opción: sin ella, quien reinstala pierde lo que ya pagó.
 *
 * @returns cuántas suscripciones se reactivaron.
 */
export async function restorePurchases(): Promise<number> {
  const platform = storePlatform();
  if (!platform) return 0;

  const module = await ensureConnection();
  const purchases = (await module.getAvailablePurchases()) as any[];

  let restored = 0;
  for (const purchase of purchases ?? []) {
    const token = String(purchase?.purchaseToken ?? "");
    const productId = String(purchase?.productId ?? purchase?.id ?? "");
    if (!token || !productId) continue;

    try {
      await api.verifyStoreSubscription({ platform, product_id: productId, token });
      restored += 1;
    } catch {
      // Un recibo caduco o de otra cuenta no debe abortar el resto.
    }
  }

  return restored;
}

/** Enlace profundo a la gestión de la suscripción en la tienda. */
export function manageSubscriptionsUrl(): string {
  return Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";
}
