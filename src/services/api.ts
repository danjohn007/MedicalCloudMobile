import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://doctorcloud.digital/api/mobile';

// ── Token storage ─────────────────────────────────────────
const TOKEN_KEY = 'mc_jwt_token';
const USER_KEY  = 'mc_user';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function saveUser(user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getSavedUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
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
  address?: string;
  duration_minutes?: number;
}

export interface Appointment {
  id: number;
  scheduled_at: string;
  type: string;
  status: string;
  fee: number;
  doctor_name: string;
  specialty: string;
  doctor_photo: string | null;
  location: string;
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

// ── Core fetch ────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (authenticated) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  return json as T;
}

// ── Auth ──────────────────────────────────────────────────
export async function login(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    false,
  );
}

export async function register(name: string, email: string, password: string, phone?: string) {
  return request<{ token: string; user: AuthUser }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ name, email, password, phone }) },
    false,
  );
}

// ── Especialidades ────────────────────────────────────────
export async function getSpecialties(): Promise<{ data: { name: string; icon: string }[] }> {
  return request('/specialties', {}, false);
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
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
  return request<{ data: Doctor[]; total: number; page: number; total_pages: number }>(
    `/doctors${qs ? '?' + qs : ''}`,
    {},
    false,
  );
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
export async function getAppointments(status: 'upcoming' | 'past' = 'upcoming') {
  return request<{ data: Appointment[] }>(`/appointments?status=${status}`);
}

export async function createAppointment(data: {
  doctor_id: number;
  date: string;
  time: string;
  type: 'presencial' | 'videoconsulta' | 'domicilio';
  notes?: string;
}) {
  return request<{ id: number; status: string; fee: number }>(
    '/appointments',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function cancelAppointment(id: number) {
  return request<{ message: string }>(`/appointments/${id}/cancel`, { method: 'POST' });
}

// ── Mensajes ──────────────────────────────────────────────
export async function getMessages() {
  return request<{ data: Message[] }>('/messages');
}

export async function getConversation(id: number) {
  return request<{ data: any[] }>(`/messages/${id}`);
}

export async function sendMessage(conversationId: number, message: string) {
  return request<{ id: number }>(`/messages/${conversationId}`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// ── Perfil ────────────────────────────────────────────────
export async function getProfile() {
  return request<AuthUser & { birth_date?: string; gender?: string; blood_type?: string; city?: string }>('/profile');
}

export async function updateProfile(data: Partial<{
  name: string;
  phone: string;
  birth_date: string;
  gender: string;
  blood_type: string;
  address: string;
  city: string;
}>) {
  return request<{ message: string }>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
