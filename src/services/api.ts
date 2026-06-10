// ── Storage ──────────────────────────────────────────────
import { getSecure, removeSecure, setSecure } from "@/services/storage";

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
  duration_minutes?: number;
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
}

export interface AppointmentDetail {
  data: Appointment & {
    date?: string;
    time?: string;
  };
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

const API_BASE = "https://doctorcloud.digital/app/api/mobile";

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

export async function register(
  name: string,
  email: string,
  password: string,
  phone?: string,
) {
  return request<{ token: string; user: AuthUser }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify({ name, email, password, phone }) },
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
  return request<{ data: Appointment[] }>(`/appointments?status=${status}`);
}

export async function getAppointmentDetail(id: number) {
  return request<AppointmentDetail>(`/appointments/${id}`);
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

export async function getPrescriptions() {
  return request<{ data: Prescription[] }>("/prescriptions");
}

export async function getSoapNotes() {
  return request<{ data: SoapNote[] }>("/soap-notes");
}

export async function getNotifications() {
  return request<{ data: NotificationItem[] }>("/notifications");
}

// ── PayPal Appointment Payment ────────────────────────────
export async function createAppointmentPayment(appointmentId: number) {
  return request<{ approve_url: string; order_id: string }>(
    `/appointments/${appointmentId}/pay`,
    { method: "POST" },
  );
}
