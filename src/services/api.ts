// ── Storage ──────────────────────────────────────────────
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { getSecure, removeSecure, setSecure } from "@/services/storage";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "mc_jwt_token";
const USER_KEY = "mc_user";

export async function saveToken(token: string): Promise<void> {
  await setSecure(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return getSecure(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await removeSecure(TOKEN_KEY);
  await removeSecure(USER_KEY);
}

export async function saveUser(user: AuthUser): Promise<void> {
  await setSecure(USER_KEY, JSON.stringify(user));
}

export async function getSavedUser(): Promise<AuthUser | null> {
  const raw = await getSecure(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── Types ─────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

export interface PendingGoogleRegistration {
  pending_token: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export type GoogleLoginResult =
  | {
      status: "authenticated";
      token: string;
      user: AuthUser;
    }
  | {
      status: "pending_profile";
      pending: PendingGoogleRegistration;
    };

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  photo: string | null;
  rating: number;
  reviews_count: number;
  consultation_fee: number;
  city: string;
  is_verified: boolean;
  bio?: string;
  subspecialty?: string;
  telemedicine_fee?: number;
  home_visit_fee?: number;
  address?: string;
  state?: string;
  duration_minutes?: number;
  lat?: number | null;
  lng?: number | null;
  distance_meters?: number | null;
  profile_score?: number | null;
  avatar_url?: string | null;
  email?: string;
  cedula?: string | null;
}

export interface Appointment {
  id: number;
  doctor_id: number;
  scheduled_at: string;
  end_at?: string;
  type:
    | "presencial"
    | "videoconsulta"
    | "domicilio"
    | "presential"
    | "virtual"
    | "home_visit"
    | string;
  status: string;
  fee: number;
  doctor_name: string;
  specialty: string;
  doctor_photo: string | null;
  location: string;
  payment_status?: string;
  reason?: string | null;
  notes?: string | null;
  duration_minutes?: number;
  room_name?: string | null;
  meeting_url?: string | null;
  jitsi_room?: string | null;
  jitsi_url?: string | null;
  pay_deadline?: string | null;
}

export interface MobileRegisterPayload {
  role: "doctor" | "patient";
  name: string;
  email: string;
  password: string;
  phone?: string;
  cedula?: string;
  specialty?: string;
  city?: string;
  state?: string;
}

export type MobileRegisterResult =
  | {
      ok?: boolean;
      status: "authenticated";
      token: string;
      user: AuthUser;
    }
  | {
      ok?: boolean;
      status: "pending_approval";
      message: string;
    };

export interface AppointmentDetail {
  data: Appointment & {
    date?: string;
    time?: string;
  };
}

export interface AppointmentPaymentInfo {
  ok?: boolean;
  stripe_publishable_key?: string;
  appointment: {
    id: number;
    doctor_name: string;
    specialty: string;
    type: string;
    scheduled_at: string;
    pay_deadline: string | null;
    amount: number;
    reason?: string;
  };
  methods: {
    stripe_card: boolean;
    paypal: boolean;
  };
}

export interface AppointmentStripeIntent {
  ok?: boolean;
  publishable_key: string;
  client_secret: string;
  payment_method: string;
  amount: number;
  appt_id: number;
}

export interface Message {
  id: number;
  doctor_id: number;
  doctor_name: string;
  doctor_photo: string | null;
  last_message: string | null;
  unread: number;
  updated_at: string;
}

export interface ClinicalNote {
  id: number;
  appointment_id: number | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosis_text: string | null;
  diagnosis_cie10: string | null;
  doctor_name: string;
  created_at: string;
  signed_at: string | null;
}

export interface ProfileData extends AuthUser {
  phone?: string;
  birth_date?: string;
  gender?: string;
  blood_type?: string;
  address?: string;
  city?: string;
  state?: string;
  occupation?: string;
  height_cm?: number;
  weight_kg?: number;
  lat?: number | null;
  lng?: number | null;
  doctor_access_code?: string | null;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface ExpedienteData {
  profile: Record<string, any> | null;
  record: Record<string, any> | null;
  consultations: ClinicalNote[];
  history?: any[];
  prescriptions?: any[];
  documents: any[];
}

export interface PatientDocument {
  id: number;
  document_type: string;
  title: string;
  file_path: string;
  file_url: string | null;
  file_mime: string | null;
  file_size_kb: number;
  notes: string | null;
  created_at?: string;
  uploader_name?: string | null;
}

export interface FinancialPayment {
  id: number;
  appointment_id: number | null;
  doctor_name: string | null;
  amount: number;
  currency: string;
  method: string | null;
  status: string | null;
  paypal_order_id: string | null;
  created_at: string | null;
}

export interface FinancialHistory {
  summary: {
    this_month: number;
    this_year: number;
  };
  payments: FinancialPayment[];
}

export interface DoctorDashboardStats {
  total_patients: number;
  today_appts: number;
  week_appts: number;
  month_appts: number;
  pending_appts: number;
  completed_total: number;
  no_show_rate: number;
  new_patients: number;
  month_revenue: number;
  year_revenue: number;
  avg_rating: number;
  review_count: number;
  active_rx: number;
  unread_chats: number;
}

export interface DoctorDashboardProfile {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  specialty: string;
  subspecialty?: string | null;
}

export interface DoctorAppointmentItem {
  id: number;
  patient_id: number;
  scheduled_at: string;
  end_at?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  pay_deadline?: string | null;
  type: string;
  status: string;
  reason?: string | null;
  fee: number;
  payment_status?: string | null;
  patient_name: string;
  patient_avatar?: string | null;
  patient_phone?: string | null;
  location: string;
  specialty?: string | null;
}

export type DoctorAppointmentScope =
  | "today"
  | "upcoming"
  | "completed"
  | "in_consultation";

export interface DoctorPatientSummary {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  phone?: string | null;
  birth_date?: string | null;
  age?: number | null;
  gender?: string | null;
  blood_type?: string | null;
  city?: string | null;
  address?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  current_medications?: string | null;
  last_appointment?: string | null;
  total_appointments: number;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export interface DoctorSettingsResponse {
  ok?: boolean;
  data: Doctor;
}

export interface DoctorLinkPatientResult {
  ok?: boolean;
  message: string;
  patient?: DoctorPatientSummary;
}

export interface DoctorRegisterPatientPayload {
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  state?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface DoctorDashboardData {
  ok?: boolean;
  doctor: DoctorDashboardProfile;
  stats: DoctorDashboardStats;
  upcoming: DoctorAppointmentItem[];
  today: DoctorAppointmentItem[];
  recent_patients: DoctorPatientSummary[];
}

export interface DoctorAvailabilityScheduleEntry {
  day_of_week: number;
  start_time?: string | null;
  end_time?: string | null;
  slot_duration_minutes?: number;
  is_active?: number;
  break_start?: string | null;
  break_end?: string | null;
}

export interface DoctorAvailabilityOverrideEntry {
  override_date: string;
  start_time?: string | null;
  end_time?: string | null;
  is_off?: number;
  reason?: string | null;
}

export interface DoctorAvailabilitySettingsData {
  ok?: boolean;
  schedule: DoctorAvailabilityScheduleEntry[];
  overrides: DoctorAvailabilityOverrideEntry[];
}

export interface DoctorPatientSnapshot {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  birth_date?: string | null;
  age?: number | null;
  gender?: string | null;
  blood_type?: string | null;
  phone?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  occupation?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  current_medications?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export interface DoctorHistoryEntry {
  id?: number;
  category?: string | null;
  description?: string | null;
  date_recorded?: string | null;
  created_at?: string | null;
  doctor_name?: string | null;
}

export interface DoctorPrescriptionEntry {
  id: number;
  patient_id?: number | null;
  patient_name?: string | null;
  appointment_id?: number | null;
  diagnosis?: string | null;
  medications?: string | null;
  instructions?: string | null;
  valid_days?: number | null;
  issued_date?: string | null;
  status?: string | null;
  doctor_name?: string | null;
  appt_date?: string | null;
  appt_type?: string | null;
}

export interface DoctorNoteEntry {
  id: number;
  patient_id?: number | null;
  patient_name?: string | null;
  patient_avatar_url?: string | null;
  appointment_id?: number | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan_text?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_signed?: boolean;
  signed_at?: string | null;
  scheduled_at?: string | null;
  appt_type?: string | null;
  appt_reason?: string | null;
}

export interface DoctorSoapEntry {
  id: number;
  appointment_id?: number | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan_text?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_signed?: boolean;
  signed_at?: string | null;
  scheduled_at?: string | null;
  appt_type?: string | null;
  appt_reason?: string | null;
}

export interface DoctorPatientSnapshotData {
  ok?: boolean;
  patient: DoctorPatientSnapshot;
  record: Record<string, any> | null;
  age?: number | null;
  updatedAt?: string;
}

export interface DoctorPatientHistoryData {
  ok?: boolean;
  patient: DoctorPatientSnapshot;
  notes: DoctorSoapEntry[];
  prescriptions: DoctorPrescriptionEntry[];
  history: DoctorHistoryEntry[];
}

export interface DoctorAppointmentDetailData {
  ok?: boolean;
  data: DoctorAppointmentItem & {
    patient_email?: string | null;
    patient_birth_date?: string | null;
    patient_age?: number | null;
    patient_gender?: string | null;
    patient_blood_type?: string | null;
    patient_allergies?: string | null;
    patient_current_medications?: string | null;
    video_room_id?: string | null;
    note?: DoctorSoapEntry | null;
    prescription?: DoctorPrescriptionEntry | null;
    prior_consultations?: number;
  };
}

export type DoctorAppointmentStatusAction =
  | "confirmed"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show";

export interface DoctorAppointmentSoapData {
  ok?: boolean;
  appointment: DoctorAppointmentDetailData["data"];
  medical_record: Record<string, any> | null;
  note: DoctorSoapEntry | null;
  prescription: DoctorPrescriptionEntry | null;
}

export interface DoctorPrescriptionsData {
  ok?: boolean;
  summary: {
    total: number;
    active: number;
    this_month: number;
    linked_to_appointments: number;
  };
  data: DoctorPrescriptionEntry[];
}

export interface DoctorNotesData {
  ok?: boolean;
  data: DoctorNoteEntry[];
}

export interface DoctorPatientDocumentsData {
  ok?: boolean;
  patient?: {
    id: number;
    name: string;
    avatar_url?: string | null;
  } | null;
  data: PatientDocument[];
}

export interface DoctorPatientDocumentUploadInput {
  uri: string;
  name: string;
  type: string;
  title?: string;
  document_type?: string;
  notes?: string;
}

export interface DoctorConsultationTemplate {
  id: number;
  label: string;
  tone: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosis: string;
  usage_notes: string;
  source: "custom" | "default";
  is_active?: boolean;
  sort_order?: number;
}

export interface DoctorConsultationTemplatesData {
  ok?: boolean;
  storage_ready?: boolean;
  data: DoctorConsultationTemplate[];
  defaults: DoctorConsultationTemplate[];
  library: DoctorConsultationTemplate[];
}

export interface DoctorConsultationTemplatePayload {
  template_id?: number;
  name: string;
  color_hex?: string;
  usage_notes?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnosis?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface DoctorFinancialConsultationEntry {
  id: number;
  appointment_id?: number | null;
  patient_name?: string | null;
  amount: number;
  currency: string;
  method?: string | null;
  status?: string | null;
  created_at?: string | null;
  scheduled_at?: string | null;
  appointment_type?: string | null;
  paypal_order_id?: string | null;
}

export interface DoctorFinancialSubscriptionEntry {
  id: number;
  amount: number;
  currency: string;
  method?: string | null;
  status?: string | null;
  created_at?: string | null;
  paypal_order_id?: string | null;
}

export interface DoctorFinancialHistoryData {
  ok?: boolean;
  summary: {
    this_month: number;
    this_year: number;
    total_consultations: number;
  };
  consultations: DoctorFinancialConsultationEntry[];
  subscriptions: DoctorFinancialSubscriptionEntry[];
}

export interface DoctorSoapPayload {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan_text?: string;
  rx_diagnosis?: string;
  rx_medications?: string;
  rx_instructions?: string;
  rx_valid_days?: number;
}

export interface DoctorSoapAutosaveResult {
  ok?: boolean;
  message: string;
  note: DoctorSoapEntry | null;
  saved_at?: string | null;
}

export interface DoctorSignNoteResult {
  ok?: boolean;
  message: string;
  signed_at?: string | null;
}

export interface DoctorCreateAppointmentPayload {
  patient_id: number;
  date: string;
  time: string;
  type: "presential" | "virtual";
  reason: string;
  notes?: string;
  waive_payment?: boolean;
}

export interface DoctorCreateAppointmentResult {
  ok?: boolean;
  id: number;
  status: string;
  payment_status: string;
  fee: number;
  message: string;
}

export interface DoctorAppointmentCheckinResult {
  ok?: boolean;
  message: string;
  in_consultation: boolean;
}

export interface DoctorAppointmentCompletePayload {
  checkout_code?: string;
  force?: boolean;
}

export interface DoctorAppointmentCompleteResult {
  ok?: boolean;
  message: string;
  status: string;
}

export interface DoctorAvailabilitySavePayload {
  schedule: {
    day: number;
    enabled: boolean;
    start: string;
    end: string;
    duration?: number;
    break_start?: string | null;
    break_end?: string | null;
  }[];
}

export interface DoctorAvailabilityOverridePayload {
  date: string;
  clear?: boolean;
  is_off?: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export interface DoctorCreateNotePayload {
  patient_id: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan_text?: string;
}

export interface DoctorCreatePrescriptionPayload {
  patient_id: number;
  diagnosis: string;
  medications: string;
  instructions?: string;
  valid_days?: number;
}

const API_BASE = "https://doctorcloud.digital/app/api/mobile";

function getWebBaseUrl(): string {
  return API_BASE.replace(/\/api\/mobile\/?$/, "/");
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAppointment(raw: Record<string, any>): Appointment {
  const locationParts = [raw.address, raw.city, raw.state]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return {
    ...raw,
    id: Number(raw.id),
    doctor_id: Number(raw.doctor_id),
    scheduled_at: String(raw.scheduled_at ?? ""),
    status: String(raw.status ?? ""),
    type: String(raw.type ?? ""),
    fee: toNumber(raw.fee ?? raw.consultation_fee),
    doctor_name: String(raw.doctor_name ?? ""),
    specialty: String(raw.specialty ?? ""),
    doctor_photo: raw.doctor_photo ?? null,
    location:
      String(raw.location ?? "").trim() ||
      (locationParts.length ? locationParts.join(", ") : ""),
  };
}

// ── Core fetch ────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (authenticated) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`El servidor no respondió con JSON. Status: ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  return json as T;
}

// ── Auth ──────────────────────────────────────────────────
export async function login(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
}

export async function loginWithGoogle(): Promise<GoogleLoginResult> {
  const redirectUri = Linking.createURL("login");
  const startUrl = `${getWebBaseUrl()}auth/google?mobile=1&redirect_uri=${encodeURIComponent(redirectUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Inicio de sesion con Google cancelado.");
  }

  if (result.type !== "success" || !result.url) {
    throw new Error("No se pudo completar el inicio de sesion con Google.");
  }

  const parsed = Linking.parse(result.url);
  const params = parsed.queryParams ?? {};
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const isPendingGoogle = params.pending_google === "1";

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (isPendingGoogle) {
    const pendingToken =
      typeof params.pending_token === "string" ? params.pending_token : "";
    const name = typeof params.name === "string" ? params.name : "";
    const email = typeof params.email === "string" ? params.email : "";
    const avatarUrl =
      typeof params.avatar_url === "string" && params.avatar_url.trim() !== ""
        ? params.avatar_url
        : null;

    if (!pendingToken || !name || !email) {
      throw new Error("Google respondio sin los datos necesarios para completar tu registro.");
    }

    return {
      status: "pending_profile",
      pending: {
        pending_token: pendingToken,
        name,
        email,
        avatar_url: avatarUrl,
      },
    };
  }

  const token = typeof params.token === "string" ? params.token : "";
  const idRaw = typeof params.id === "string" ? params.id : "";
  const name = typeof params.name === "string" ? params.name : "";
  const email = typeof params.email === "string" ? params.email : "";
  const role = typeof params.role === "string" ? params.role : "";
  const avatarUrl =
    typeof params.avatar_url === "string" && params.avatar_url.trim() !== ""
      ? params.avatar_url
      : null;

  if (!token || !idRaw || !name || !email || !role) {
    throw new Error("Google respondio sin los datos de autenticacion completos.");
  }

  return {
    status: "authenticated",
    token,
    user: {
      id: Number.parseInt(idRaw, 10),
      name,
      email,
      avatar_url: avatarUrl,
      role,
    },
  };
}

export async function completeGoogleRegistration(input: {
  pending_token: string;
  role: "doctor" | "patient";
  name?: string;
  cedula?: string;
  specialty?: string;
  city?: string;
  state?: string;
  birth_date?: string;
  gender?: string;
  phone?: string;
}) {
  return request<
    | {
        ok?: boolean;
        status: "authenticated";
        token: string;
        user: AuthUser;
      }
    | {
        ok?: boolean;
        status: "pending_approval";
        message: string;
      }
  >(
    "/auth/google/complete",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false,
  );
}

export async function register(input: MobileRegisterPayload) {
  return request<MobileRegisterResult>(
    "/auth/register",
    { method: "POST", body: JSON.stringify(input) },
    false,
  );
}

// ── Especialidades ────────────────────────────────────────
export async function getSpecialties(): Promise<{
  data: { name: string; icon: string }[];
}> {
  return request("/specialties", {}, false);
}

// ── Doctores ─────────────────────────────────────────────
export async function getDoctors(params: {
  specialty?: string;
  search?: string;
  city?: string;
  lat?: number;
  lng?: number;
  page?: number;
}) {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
  return request<{
    data: Doctor[];
    total: number;
    page: number;
    total_pages: number;
  }>(`/doctors${qs ? "?" + qs : ""}`, {}, false);
}

export async function getDoctorProfile(id: number) {
  return request<{ data: Doctor; reviews: any[] }>(`/doctors/${id}`, {}, false);
}

export async function getDoctorAvailability(id: number, date: string) {
  return request<{ date: string; slots: string[] }>(
    `/doctors/${id}/availability?date=${date}`,
    {},
    false,
  );
}

// ── Citas ─────────────────────────────────────────────────
export async function getAppointments(
  status: "upcoming" | "past" = "upcoming",
) {
  const response = await request<{ data: Record<string, any>[] }>(
    `/appointments?status=${status}`,
  );

  return {
    ...response,
    data: response.data.map((item) => normalizeAppointment(item)),
  };
}

export async function getAppointmentDetail(id: number) {
  const response = await request<{ data: Record<string, any> }>(`/appointments/${id}`);

  return {
    ...response,
    data: normalizeAppointment(response.data),
  };
}

export async function getAppointmentPaymentInfo(id: number) {
  return request<AppointmentPaymentInfo>(`/appointments/${id}/payment-info`);
}

export async function createAppointment(data: {
  doctor_id: number;
  date: string;
  time: string;
  type: "presencial" | "videoconsulta" | "domicilio";
  reason?: string;
  notes?: string;
}) {
  return request<{ id: number; status: string; fee: number }>("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelAppointment(id: number) {
  return request<{ message: string }>(`/appointments/${id}/cancel`, {
    method: "POST",
  });
}

// ── Mensajes ──────────────────────────────────────────────
export async function getMessages() {
  return request<{ data: Message[] }>("/messages");
}

export async function getConversation(id: number) {
  return request<{ data: any[] }>(`/messages/${id}`);
}

export async function sendMessage(conversationId: number, message: string) {
  return request<{ id: number }>(`/messages/${conversationId}`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// ── Perfil ────────────────────────────────────────────────
export async function getProfile() {
  return request<ProfileData>("/profile");
}

export async function updateProfile(
  data: Partial<{
    name: string;
    phone: string;
    birth_date: string;
    gender: string;
    blood_type: string;
    address: string;
    city: string;
    state: string;
    occupation: string;
    height_cm: number;
    weight_kg: number;
    lat: number | null;
    lng: number | null;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  }>,
) {
  return request<{ message: string }>("/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(input: {
  uri: string;
  name: string;
  type: string;
}) {
  const form = new FormData();
  form.append("avatar", {
    uri: input.uri,
    name: input.name,
    type: input.type,
  } as any);

  return request<{ success: boolean; url: string }>("/avatar", {
    method: "POST",
    body: form,
  });
}

export async function removeAvatar() {
  return request<{ success: boolean }>("/avatar/remove", { method: "POST" });
}

// ── QR / Check-in / Checkout ────────────────────────────
export async function getAppointmentQr(id: number) {
  return request<{
    data: {
      id: number;
      checkin_code: string | null;
      checkin_expires: string | null;
      checked_in: boolean;
      checkout_code: string | null;
      checkout_expires: string | null;
    };
  }>(`/appointments/${id}/qr`);
}

export async function checkinAppointment(id: number, code: string) {
  return request<{ message: string; in_consultation: boolean }>(
    `/appointments/${id}/checkin`,
    { method: "POST", body: JSON.stringify({ code }) },
  );
}

export async function checkoutAppointment(id: number) {
  return request<{ data: { checkout_code: string; expires_at: string } }>(
    `/appointments/${id}/checkout`,
    { method: "POST" },
  );
}

export async function updateExpediente(data: Record<string, any>) {
  return request<{ message: string }>("/expediente", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Expediente (historial médico) ─────────────────────────
export async function getExpediente() {
  return request<ExpedienteData>("/expediente");
}

export async function getDocuments() {
  return request<{ data: PatientDocument[] }>("/documents");
}

export async function uploadDocument(input: {
  uri: string;
  name: string;
  type: string;
  title?: string;
  document_type?: string;
  notes?: string;
}) {
  const form = new FormData();
  form.append("document_file", {
    uri: input.uri,
    name: input.name,
    type: input.type,
  } as any);
  if (input.title) form.append("title", input.title);
  if (input.document_type) form.append("document_type", input.document_type);
  if (input.notes) form.append("notes", input.notes);

  return request<{ id: number; document: PatientDocument }>(
    "/documents/upload",
    { method: "POST", body: form },
  );
}

export async function deleteDocument(id: number) {
  return request<{ message: string }>(`/documents/${id}/delete`, {
    method: "POST",
  });
}

export async function getFinancialHistory() {
  return request<FinancialHistory>("/financial-history");
}

// ── Dashboard Stats ──────────────────────────────────────
export async function getDashboardStats() {
  return request<{
    data: {
      upcoming: number;
      pendingPayment: number;
      completed: number;
      unreadMessages: number;
      totalDoctors: number;
    };
  }>("/dashboard/stats");
}

export interface Prescription {
  id: number;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  issued_date: string | null;
  doctor_name: string;
  specialty: string | null;
  appt_date: string | null;
}

export interface SoapNote {
  id: number;
  appointment_id: number | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosis_text: string | null;
  doctor_name: string;
  specialty: string | null;
  scheduled_at: string | null;
}

export interface NotificationItem {
  type: 'message' | 'system' | 'appointment';
  id: number;
  message: string;
  created_at: string;
  related_name: string | null;
  thread_id: number | null;
}

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicket {
  id: number;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  role: string;
  created_at: string | null;
  updated_at: string | null;
  message_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  is_closed: boolean;
}

export interface SupportTicketMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string | null;
  is_me: boolean;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
}

export interface SupportAttachmentInput {
  uri: string;
  name: string;
  type: string;
}

export async function getPrescriptions() {
  return request<{ data: Prescription[] }>("/prescriptions");
}

export async function getSoapNotes() {
  return request<{ data: SoapNote[] }>("/soap-notes");
}

export async function getNotifications() {
  return request<{ data: NotificationItem[] }>("/notifications");
}

export async function getSupportTickets() {
  return request<{ data: SupportTicket[] }>("/support");
}

export async function getSupportTicket(id: number) {
  return request<SupportTicketDetail>(`/support/${id}`);
}

export async function createSupportTicket(input: {
  subject: string;
  body: string;
  priority?: SupportTicketPriority;
  attachment?: SupportAttachmentInput | null;
}) {
  if (input.attachment) {
    const form = new FormData();
    form.append("subject", input.subject);
    form.append("body", input.body);
    form.append("priority", input.priority ?? "normal");
    form.append("attachment", {
      uri: input.attachment.uri,
      name: input.attachment.name,
      type: input.attachment.type,
    } as any);

    return request<{ message: string; ticket_id: number }>("/support", {
      method: "POST",
      body: form,
    });
  }

  return request<{ message: string; ticket_id: number }>("/support", {
    method: "POST",
    body: JSON.stringify({
      subject: input.subject,
      body: input.body,
      priority: input.priority ?? "normal",
    }),
  });
}

export async function replySupportTicket(
  id: number,
  input: {
    body: string;
    attachment?: SupportAttachmentInput | null;
  },
) {
  if (input.attachment) {
    const form = new FormData();
    form.append("body", input.body);
    form.append("attachment", {
      uri: input.attachment.uri,
      name: input.attachment.name,
      type: input.attachment.type,
    } as any);

    return request<{ message: string }>(`/support/${id}/reply`, {
      method: "POST",
      body: form,
    });
  }

  return request<{ message: string }>(`/support/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ body: input.body }),
  });
}

export async function closeSupportTicket(id: number) {
  return request<{ message: string }>(`/support/${id}/close`, {
    method: "POST",
  });
}

// ── PayPal Appointment Payment ────────────────────────────
export async function getDoctorDashboard() {
  return request<DoctorDashboardData>("/doctor/dashboard");
}

export async function getDoctorAppointments(
  scope: DoctorAppointmentScope = "upcoming",
) {
  return request<{
    ok?: boolean;
    scope: DoctorAppointmentScope;
    data: DoctorAppointmentItem[];
  }>(`/doctor/appointments?scope=${scope}`);
}

export async function getDoctorPatients() {
  return request<{ ok?: boolean; data: DoctorPatientSummary[] }>(
    "/doctor/patients",
  );
}

export async function linkDoctorPatient(accessCode: string) {
  return request<DoctorLinkPatientResult>("/doctor/patients/link", {
    method: "POST",
    body: JSON.stringify({ access_code: accessCode }),
  });
}

export async function registerDoctorPatient(
  payload: DoctorRegisterPatientPayload,
) {
  return request<{ ok?: boolean; message: string; patient_id?: number }>("/doctor/patients/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDoctorSettings() {
  return request<DoctorSettingsResponse>("/doctor/profile");
}

export async function updateDoctorProfile(
  data: Partial<{
    name: string;
    specialty: string;
    subspecialty: string;
    bio: string;
    consultation_fee: number;
    telemedicine_fee: number;
    home_visit_fee: number;
    duration_minutes: number;
    address: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
  }>,
) {
  return request<{ ok?: boolean; message: string }>("/doctor/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getDoctorAvailabilitySettings(month: string) {
  return request<DoctorAvailabilitySettingsData>(
    `/doctor/availability?month=${encodeURIComponent(month)}`,
  );
}

export async function updateDoctorAvailability(
  payload: DoctorAvailabilitySavePayload,
) {
  return request<{ ok?: boolean; message: string }>("/doctor/availability", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function saveDoctorAvailabilityOverride(
  payload: DoctorAvailabilityOverridePayload,
) {
  return request<{ ok?: boolean; message: string }>(
    "/doctor/availability/override",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getDoctorPatientSnapshot(patientId: number) {
  return request<DoctorPatientSnapshotData>(
    `/doctor/patients/${patientId}/snapshot`,
  );
}

export async function getDoctorPatientHistory(patientId: number) {
  return request<DoctorPatientHistoryData>(
    `/doctor/patients/${patientId}/history`,
  );
}

export async function getDoctorPatientDocuments(patientId: number) {
  return request<DoctorPatientDocumentsData>(
    `/doctor/patients/${patientId}/documents`,
  );
}

export async function uploadDoctorPatientDocument(
  patientId: number,
  input: DoctorPatientDocumentUploadInput,
) {
  const form = new FormData();
  form.append("document_file", {
    uri: input.uri,
    name: input.name,
    type: input.type,
  } as any);
  if (input.title) form.append("title", input.title);
  if (input.document_type) form.append("document_type", input.document_type);
  if (input.notes) form.append("notes", input.notes);

  return request<{ id: number; document: PatientDocument; message?: string }>(
    `/doctor/patients/${patientId}/documents/upload`,
    { method: "POST", body: form },
  );
}

export async function getDoctorConsultationTemplates() {
  return request<DoctorConsultationTemplatesData>(
    "/doctor/consultation-templates",
  );
}

export async function saveDoctorConsultationTemplate(
  payload: DoctorConsultationTemplatePayload,
) {
  return request<{
    ok?: boolean;
    message: string;
    template?: DoctorConsultationTemplate | null;
  }>("/doctor/consultation-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteDoctorConsultationTemplate(templateId: number) {
  return request<{ ok?: boolean; message: string }>(
    `/doctor/consultation-templates/${templateId}/delete`,
    {
      method: "POST",
    },
  );
}

export async function getDoctorNotes() {
  return request<DoctorNotesData>("/doctor/notes");
}

export async function createDoctorNote(payload: DoctorCreateNotePayload) {
  return request<{ ok?: boolean; message: string; id?: number }>(
    "/doctor/notes",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getDoctorAppointmentDetail(appointmentId: number) {
  return request<DoctorAppointmentDetailData>(
    `/doctor/appointments/${appointmentId}`,
  );
}

export async function updateDoctorAppointmentStatus(
  appointmentId: number,
  action: DoctorAppointmentStatusAction,
) {
  return request<{ ok?: boolean; status: string; message: string }>(
    `/doctor/appointments/${appointmentId}/status`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}

export async function getDoctorAppointmentSoap(appointmentId: number) {
  return request<DoctorAppointmentSoapData>(
    `/doctor/appointments/${appointmentId}/soap`,
  );
}

export async function saveDoctorAppointmentSoap(
  appointmentId: number,
  payload: DoctorSoapPayload,
) {
  return request<{ ok?: boolean; message: string; note_saved: boolean; prescription_saved: boolean }>(
    `/doctor/appointments/${appointmentId}/soap`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function autosaveDoctorAppointmentSoap(
  appointmentId: number,
  payload: Pick<
    DoctorSoapPayload,
    "subjective" | "objective" | "assessment" | "plan_text"
  >,
) {
  return request<DoctorSoapAutosaveResult>(
    `/doctor/appointments/${appointmentId}/soap/autosave`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function signDoctorNote(noteId: number) {
  return request<DoctorSignNoteResult>(`/doctor/notes/${noteId}/sign`, {
    method: "POST",
  });
}

export async function createDoctorAppointment(
  payload: DoctorCreateAppointmentPayload,
) {
  return request<DoctorCreateAppointmentResult>("/doctor/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function doctorCheckinAppointment(
  appointmentId: number,
  code: string,
) {
  return request<DoctorAppointmentCheckinResult>(
    `/doctor/appointments/${appointmentId}/checkin`,
    {
      method: "POST",
      body: JSON.stringify({ code }),
    },
  );
}

export async function completeDoctorAppointment(
  appointmentId: number,
  payload: DoctorAppointmentCompletePayload = {},
) {
  return request<DoctorAppointmentCompleteResult>(
    `/doctor/appointments/${appointmentId}/complete`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getDoctorPrescriptions() {
  return request<DoctorPrescriptionsData>("/doctor/prescriptions");
}

export async function createDoctorPrescription(
  payload: DoctorCreatePrescriptionPayload,
) {
  return request<{ ok?: boolean; message: string; id?: number }>(
    "/doctor/prescriptions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getDoctorFinancialHistory() {
  return request<DoctorFinancialHistoryData>("/doctor/financial-history");
}

export async function createAppointmentPayment(appointmentId: number) {
  return request<{ approve_url: string; order_id: string }>(
    `/appointments/${appointmentId}/pay`,
    { method: "POST" },
  );
}

export async function createAppointmentStripeIntent(appointmentId: number) {
  return request<AppointmentStripeIntent>(
    `/appointments/${appointmentId}/stripe/create-intent`,
    {
      method: "POST",
      body: JSON.stringify({ payment_method: "card" }),
    },
  );
}
