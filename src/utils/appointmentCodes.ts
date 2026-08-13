const APPOINTMENT_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const CODE_KEYS = ["code", "checkin_code", "checkout_code", "checkinCode", "checkoutCode"];

function cleanCandidate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return APPOINTMENT_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeAppointmentCode(value: string): string | null {
  const raw = value.trim();
  const direct = cleanCandidate(raw);
  if (direct) {
    return direct;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of CODE_KEYS) {
      const candidate = cleanCandidate(parsed?.[key]);
      if (candidate) {
        return candidate;
      }
    }
  } catch {
    // The patient QR currently contains the plain code; JSON is only a compatibility fallback.
  }

  try {
    const url = new URL(raw);
    for (const key of CODE_KEYS) {
      const candidate = cleanCandidate(url.searchParams.get(key));
      if (candidate) {
        return candidate;
      }
    }
  } catch {
    // It is normal for a QR to contain a plain code instead of a URL.
  }

  const tokens = raw.split(/[^A-Za-z0-9]+/);
  for (const token of tokens) {
    const candidate = cleanCandidate(token);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export function isAppointmentCode(value: string): boolean {
  return APPOINTMENT_CODE_PATTERN.test(value.trim().toUpperCase());
}
