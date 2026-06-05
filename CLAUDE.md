# MedicalCloudMobile — Estado Actual del Proyecto

## 📱 App Móvil (React Native / Expo)

### Rama: `main`
Último commit: `a37e5e4` — Dashboard rediseñado

### Estructura de Pantallas

```
src/app/
├── (auth)/
│   └── login.tsx             → Login con email/password
│
├── (tabs)/
│   ├── _layout.tsx            → Tab navigator (Inicio, Doctores, Citas, Mensajes, Perfil)
│   ├── index.tsx              → **HOME / DASHBOARD** ← REDISEÑADO
│   │   ├── Saludo personalizado
│   │   ├── Barra de búsqueda de doctores
│   │   ├── Acceso rápido (Perfil, Expediente, Citas, Mensajes)
│   │   ├── Especialidades en scroll horizontal (cargadas dinámicamente)
│   │   └── Doctores recomendados (rating, ciudad, precio)
│   ├── citas.tsx              → Listado de citas (próximas / pasadas con tabs)
│   ├── mensajes.tsx           → Listado de hilos de chat con doctores
│   └── perfil.tsx             → Perfil del paciente (datos + acceso a expediente)
│
├── doctores/
│   ├── _layout.tsx
│   ├── index.tsx              → **BÚSQUEDA / LISTADO DE DOCTORES**
│   │   ├── Barra de búsqueda (nombre/especialidad)
│   │   ├── Filtro por especialidad (chips horizontales)
│   │   └── Resultados con foto, nombre, especialidad, rating, ciudad, precio
│   │
│   └── [id]/
│       ├── index.tsx          → **PERFIL DEL DOCTOR**
│       │   ├── Foto, nombre, especialidad, rating
│       │   ├── Verificado / Bio / Subespecialidad
│       │   ├── Dirección y ubicación
│       │   ├── Precios (presencial, videoconsulta, domicilio)
│       │   ├── Reseñas de pacientes
│       │   └── Botón "Agendar cita"
│       │
│       ├── agendar.tsx        → **CALENDARIO / SELECCIÓN DE HORARIO**
│       │   ├── Calendario mensual navegable (mes anterior/siguiente)
│       │   ├── Días disponibles (no pasados)
│       │   └── Slots de horario disponibles (cargados desde API)
│       │
│       └── confirmar.tsx      → **CONFIRMAR CITA**
│           ├── Resumen: doctor, fecha, hora
│           ├── Tipo de consulta (presencial/videoconsulta/domicilio)
│           ├── Notas opcionales
│           └── Botón "Confirmar cita" → crea cita vía API
│
├── chat/
│   └── [id].tsx              → Conversación individual con un doctor
│
└── patient/
    ├── _layout.tsx
    ├── profile.tsx            → **PERFIL EDITABLE**
    │   ├── Datos personales (nombre, email, teléfono)
    │   ├── Información médica (sexo, fecha nacimiento, tipo sangre)
    │   ├── Altura / Peso / IMC
    │   ├── Dirección
    │   └── Contacto de emergencia
    │
    ├── expediente.tsx         → **EXPEDIENTE MÉDICO EDITABLE**
    │   ├── Antecedentes familiares (diabetes, hipertensión, cáncer, etc.)
    │   ├── Antecedentes personales (diabetes, HTA, asma, tiroides, etc.)
    │   ├── Alergias y reacciones
    │   ├── Medicamentos actuales, cirugías, hospitalizaciones
    │   ├── Vacunas (COVID, influenza, hepatitis B, tétanos, etc.)
    │   ├── Estilo de vida (tabaco, alcohol, ejercicio, dieta, sueño, estrés)
    │   ├── Salud mental
    │   ├── Discapacidades
    │   └── Historial de consultas (SOAP)
    │
    ├── checkin.tsx            → **CHECK-IN QR**
    │   ├── Código QR para check-in presencial
    │   ├── Código manual de 6 caracteres
    │   └── Botón para generar código de cierre (checkout)
    │
    └── cita-detalle.tsx       → Detalle de cita individual
```

### Servicios (`src/services/api.ts`)
- `login(email, password)` → POST /api/mobile/auth/login
- `register(name, email, password, phone)` → POST /api/mobile/auth/register
- `getSpecialties()` → GET /api/mobile/specialties
- `getDoctors({ page, search, specialty, city, max_fee })` → GET /api/mobile/doctors
- `getDoctorProfile(id)` → GET /api/mobile/doctors/:id
- `getDoctorAvailability(id, date)` → GET /api/mobile/doctors/:id/availability
- `createAppointment(doctor_id, date, time, type, notes)` → POST /api/mobile/appointments
- `getAppointments(status)` → GET /api/mobile/appointments
- `getAppointmentDetail(id)` → GET /api/mobile/appointments/:id
- `cancelAppointment(id)` → POST /api/mobile/appointments/:id/cancel
- `getMessages()` → GET /api/mobile/messages
- `getConversation(id)` → GET /api/mobile/messages/:id
- `sendMessage(id, message)` → POST /api/mobile/messages/:id
- `getProfile()` → GET /api/mobile/profile
- `updateProfile(data)` → PUT /api/mobile/profile
- `getExpediente()` → GET /api/mobile/expediente
- `updateExpediente(data)` → PUT /api/mobile/expediente
- `getAppointmentQr(id)` → GET /api/mobile/appointments/:id/qr
- `checkinAppointment(id, code)` → POST /api/mobile/appointments/:id/checkin
- `checkoutAppointment(id)` → POST /api/mobile/appointments/:id/checkout

### Tipos (`src/types/`)
- `Doctor` / `DoctorFull` — perfil de doctor
- `Appointment` / `AppointmentDetail` — citas
- `Message` / `Conversation` — mensajes
- `Specialty` — especialidades
- `ExpedienteData` — expediente médico

### Stores (`src/stores/`)
- `authStore` — maneja token JWT y datos del usuario logueado

### Tema (`src/constants/theme.ts`)
- `MC` — colores, fuentes, constantes de diseño

---

## 🔧 Backend (PHP / MySQL)

### Rama: `feature/dashboard-redesign`
Último commit: `1e0151f`

### Archivo clave: `app/controllers/MobileApiController.php`

**Endpoints API REST implementados:**

| Método | Ruta | Estado |
|--------|------|--------|
| POST | `/api/mobile/auth/login` | ✅ Completo |
| POST | `/api/mobile/auth/register` | ✅ Completo |
| GET | `/api/mobile/specialties` | ✅ Completo |
| GET | `/api/mobile/doctors` | ✅ Completo |
| GET | `/api/mobile/doctors/:id` | ✅ Completo |
| GET | `/api/mobile/doctors/:id/availability` | ✅ Completo |
| POST | `/api/mobile/appointments` | ✅ Completo |
| GET | `/api/mobile/appointments` | ✅ Completo |
| GET | `/api/mobile/appointments/:id` | ✅ Completo |
| POST | `/api/mobile/appointments/:id/cancel` | ✅ Completo |
| GET | `/api/mobile/messages` | ✅ Completo |
| GET | `/api/mobile/messages/:id` | ✅ Completo |
| POST | `/api/mobile/messages/:id` | ✅ Completo |
| GET | `/api/mobile/profile` | ✅ Completo |
| PUT | `/api/mobile/profile` | ✅ Completo |
| GET | `/api/mobile/expediente` | ✅ Completo |
| PUT | `/api/mobile/expediente` | ✅ Completo |
| GET | `/api/mobile/appointments/:id/qr` | ✅ Completo |
| POST | `/api/mobile/appointments/:id/checkin` | ✅ Completo |
| POST | `/api/mobile/appointments/:id/checkout` | ✅ Completo |

### Autenticación
- JWT (HS256) con expiración de 30 días
- Bearer token en header `Authorization`
- Fallback para Apache `REDIRECT_HTTP_AUTHORIZATION`
- Fallback para `getallheaders()` en PHP-FPM

---

## ✅ Lo que YA FUNCIONA (probado)

1. **Login/Registro** con email y contraseña
2. **Dashboard** con acceso rápido a todas las secciones
3. **Búsqueda de doctores** por nombre y especialidad
4. **Perfil de doctor** con toda la información
5. **Agendar cita** (calendario + horarios + confirmación)
6. **Listado de citas** (próximas y pasadas)
7. **Chat con doctores** (mensajes en tiempo real)
8. **Perfil de paciente editable** (datos personales + médicos)
9. **Expediente médico** completo y editable (guardado vía API)
10. **Check-in/Checkout QR** para citas presenciales

## 🐛 Bugs Fijos Recientes

### Disponibilidad de doctores (solo mostraba 1 hora)
**Archivo:** `app/controllers/MobileApiController.php` — método `doctorAvailability()`

**Problema original:** El endpoint tomaba el `start_time` del schedule como un slot único en vez de generar todos los slots del día.

**Solución:** Ahora genera slots iterando desde `start_time` hasta `end_time` usando `slot_duration_minutes` de la configuración del doctor, respetando descansos (`break_start`/`break_end`) y excluyendo citas ya agendadas.

**Flujo corregido:**
1. Obtiene el schedule del día (`schedule_json` de `doctor_profiles`)
2. Extrae `start_time`, `end_time`, `slot_duration_minutes`, `break_start`, `break_end`
3. Genera slots cada `duration` minutos desde `start` hasta `end`
4. Omite slots que caigan dentro del descanso (break)
5. Excluye slots ya agendados (status NO en `cancelled/rejected/missed/no_show`)
6. Para hoy, también excluye slots pasados (hora actual + duración mínima)

### Duración de cita hardcodeada a 45 min
**Problema:** `createAppointment()` siempre usaba `45 * 60` segundos para `end_at`.

**Solución:** Ahora usa `duration_minutes` del perfil del doctor (con fallback a 30).

---

## ⚠️ Pendiente / Por mejorar

1. **Notificaciones push** (Firebase Cloud Messaging)
2. **Pago de citas** in-app (Stripe/PayPal)
3. **Recordatorios locales** de citas
4. **Subida de documentos** al expediente (fotos, PDFs)
5. **Videoconsulta** integrada (Daily.co / Jitsi)
6. **Cancelar cita** desde el detalle
7. **Offline first** (caché de datos)
8. **Modo oscuro**