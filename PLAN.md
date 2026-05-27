# Medical Cloud Mobile — Plan de Desarrollo iOS (Pacientes)

> **SOLO PACIENTES** — Fase inicial  
> Conectado al backend existente en línea (MedicalUniverse PHP)

---

## Estado del Backend Existente

| Lo que ya existe | Estado |
|-----------------|--------|
| Auth con sesiones PHP (`/login`, `/register/patient`) | ✅ Online |
| `PatientController@findDoctor` (búsqueda de doctores) | ✅ Online |
| `AppointmentController` (crear, ver, cancelar citas) | ✅ Online |
| `ChatController` (mensajes) | ✅ Online |
| Auth con JWT para móvil | ❌ **HAY QUE CREAR** |
| Endpoints REST `/api/mobile/*` | ❌ **HAY QUE CREAR** |

> **La app móvil NO puede usar sesiones PHP**. Necesita JWT.  
> Se creará un `MobileApiController.php` con sus propias rutas `/api/mobile/*`.

---

## Arquitectura de Integración

```
iPhone/iPad (React Native)
        ↕  HTTPS + Bearer JWT
tu-dominio.com/api/mobile/*
        ↕
MobileApiController.php  ←── NUEVO
        ↕
Modelos existentes (DoctorProfile, User, Appointment...)
        ↕
MySQL (misma base de datos)
```

---

## Endpoints del Backend a Crear (`/api/mobile/`)

| Método | Ruta | Qué hace |
|--------|------|----------|
| POST | `/api/mobile/auth/login` | Login → devuelve JWT |
| POST | `/api/mobile/auth/register` | Registro paciente |
| POST | `/api/mobile/auth/refresh` | Renovar JWT |
| GET | `/api/mobile/specialties` | Lista de especialidades disponibles |
| GET | `/api/mobile/doctors?specialty=&search=&page=` | Buscar doctores |
| GET | `/api/mobile/doctors/:id` | Perfil completo del doctor |
| GET | `/api/mobile/doctors/:id/availability?date=` | Horas disponibles |
| POST | `/api/mobile/appointments` | Crear cita |
| GET | `/api/mobile/appointments` | Mis citas (paciente autenticado) |
| GET | `/api/mobile/appointments/:id` | Detalle de cita |
| POST | `/api/mobile/appointments/:id/cancel` | Cancelar cita |
| GET | `/api/mobile/messages` | Lista de conversaciones |
| GET | `/api/mobile/messages/:id` | Mensajes de una conversación |
| POST | `/api/mobile/messages/:id` | Enviar mensaje |
| GET | `/api/mobile/profile` | Perfil del paciente |
| PUT | `/api/mobile/profile` | Actualizar perfil |

---

> App para pacientes: iPhone y iPad  
> Stack: React Native + Expo SDK 56 + Expo Router + TypeScript  
> Build: EAS Build → TestFlight → App Store

---

## Diseño / Design System

### Paleta de Colores
```
Primary (Teal):     #1BA8A0   ← botones principales, tabs activos, badges
Primary Dark:       #148C85
Primary Light:      #E8F8F7   ← fondos suaves, chips seleccionados
Background:         #FFFFFF
Surface:            #F7F9FC   ← fondos de tarjetas, inputs
Border:             #E5E7EB
Text Primary:       #111827
Text Secondary:     #6B7280
Text Placeholder:   #9CA3AF
Star/Rating:        #F59E0B   ← amarillo dorado
Success:            #10B981
Error:              #EF4444
White:              #FFFFFF
```

### Tipografía
```
Font Family:  System font (SF Pro en iOS — automático)
Sizes:
  xs:   11px
  sm:   13px
  base: 15px
  md:   17px (body principal)
  lg:   19px
  xl:   22px
  2xl:  26px
  3xl:  30px
Weight: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
```

### Espaciado
```
xs:  4px
sm:  8px
md:  12px
lg:  16px
xl:  20px
2xl: 24px
3xl: 32px
```

### Componentes Base Reutilizables
| Componente | Descripción |
|-----------|-------------|
| `PrimaryButton` | Botón teal redondeado, texto blanco, ancho completo |
| `SecondaryButton` | Botón outline teal |
| `DoctorCard` | Tarjeta con foto, nombre, especialidad, rating, distancia, precio |
| `SearchBar` | Input con ícono lupa, fondo gris claro, bordes redondeados |
| `SpecialtyChip` | Ícono + texto, fondo blanco con sombra |
| `StarRating` | Estrellas doradas + número de reseñas |
| `TabBar` | Bottom nav: Inicio, Citas, Mensajes, Perfil |
| `AppointmentCard` | Tarjeta de cita con foto doc, fecha prominente |
| `Avatar` | Imagen circular con fallback de iniciales |
| `BackHeader` | Header con flecha atrás + título centrado |

---

## Estructura de Navegación

```
app/
├── index.tsx                    ← Splash (pantalla 1)
├── _layout.tsx                  ← Root layout
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx                ← Login
│   └── register.tsx             ← Registro
└── (tabs)/
    ├── _layout.tsx              ← Tab bar (Inicio, Citas, Mensajes, Perfil)
    ├── index.tsx                ← Inicio/Buscar (pantalla 2)
    ├── citas.tsx                ← Mis Citas (pantalla 9)
    ├── mensajes.tsx             ← Mensajes (pantalla 10)
    └── perfil.tsx               ← Perfil de Usuario (pantalla 12)

app/
├── doctores/
│   ├── [specialty].tsx          ← Lista de Doctores (pantalla 3)
│   └── [id]/
│       ├── index.tsx            ← Perfil del Doctor (pantalla 4)
│       ├── agendar.tsx          ← Seleccionar Fecha y Hora (pantalla 5)
│       ├── confirmar.tsx        ← Confirmar Cita (pantalla 6)
│       └── pago.tsx             ← Pago (pantalla 7)
├── confirmacion.tsx             ← Confirmación (pantalla 8)
├── videoconsulta/
│   └── [id].tsx                 ← Videoconsulta (pantalla 11)
└── chat/
    └── [id].tsx                 ← Chat individual
```

---

## Pantallas — Detalle de Diseño

---

### Pantalla 1 — Splash / Bienvenida

**Ruta:** `app/index.tsx`

**Diseño:**
- Fondo blanco
- Centro: logo "Medical Cloud" (ícono nube con ECG + texto)
- Debajo del logo: subtítulo "Tu salud, nuestra prioridad" (gris)
- Imagen circular grande de doctora con tablet (parte inferior, recortada)
- Botón primario teal: **"Comenzar"** (ancho completo, parte inferior)
- Link secundario debajo: **"Iniciar sesión"** (texto teal, sin fondo)

**Comportamiento:**
- Auto-redirect si hay sesión activa → tabs/index
- "Comenzar" → (auth)/register
- "Iniciar sesión" → (auth)/login

---

### Pantalla 2 — Inicio / Buscar

**Ruta:** `(tabs)/index.tsx`

**Diseño:**
- Header: ícono hamburger (izq) + ícono campana notificaciones (der)
- Saludo: **"¡Hola, [Nombre]!"** (bold, grande) + subtítulo "¿Qué especialista necesitas?"
- `SearchBar`: "Buscar especialidad, médico..." + ícono lupa teal
- Sección **"Especialidades populares"** + link "Ver todas"
  - Grid 3×2 de `SpecialtyChip`:
    - Medicina general (ícono cruz)
    - Pediatría (ícono bebé)
    - Ginecología (ícono femenino)
    - Dermatología (ícono piel)
    - Psicología (ícono cerebro)
    - Traumatología (ícono hueso)
- Sección **"Doctores recomendados"** + link "Ver todas"
  - Lista horizontal scroll de `DoctorCard` compactas

**Comportamiento:**
- Buscar → doctores/[specialty] con query
- Chip especialidad → doctores/[specialty]
- "Ver todas" especialidades → /especialidades
- Tap doctor → doctores/[id]

---

### Pantalla 3 — Lista de Doctores

**Ruta:** `app/doctores/[specialty].tsx`

**Diseño:**
- Header: flecha atrás (izq) + título especialidad centrado + ícono filtro (der, embudo)
- `SearchBar`: "Buscar en [Especialidad]..."
- Lista vertical de `DoctorCard`:
  ```
  [Foto circular] [Nombre]              [Precio]
                  [Especialidad]         Desde
                  ★ 4.9 (128)           $700
                  ● Verificado  📍 1.2km
  [ícono corazón/favorito — der]
  ```
- Separador línea entre cards

**Comportamiento:**
- Tap corazón → agregar/quitar favorito
- Tap card → doctores/[id]
- Filtro → modal bottom sheet con filtros (precio, distancia, calificación, disponibilidad)

---

### Pantalla 4 — Perfil del Doctor

**Ruta:** `app/doctores/[id]/index.tsx`

**Diseño:**
- Header: flecha atrás (izq) + ícono compartir (der)
- **Foto grande** del doctor (hero image, ~240px altura, bordes redondeados)
- Nombre + badge verificado (✓ teal): **"Dra. Mariana López ✓"**
- Especialidad (texto gris)
- `StarRating`: ★ 4.9 (128 opiniones)
- Row de 3 stats con íconos:
  - 📅 Experiencia: 8 años
  - 📍 Ubicación: A 1.2km
  - 🌐 Idiomas: Español, Inglés
- Sección **"Sobre mí"** con texto + "Ver más" teal
- Sección **"Servicios"** con lista + "Ver más" teal:
  - • Acné
  - • Manchas en la piel
  - • Rejuvenecimiento facial
- Footer fijo: ícono corazón (izq, outline) + botón **"Agendar cita"** (teal, flex-1)

---

### Pantalla 5 — Seleccionar Fecha y Hora

**Ruta:** `app/doctores/[id]/agendar.tsx`

**Diseño:**
- Header con flecha atrás + título "Agendar cita"
- **Calendario mensual:**
  - Navegación mes: `< Mayo 2024 >`
  - Grid L M M J V S D
  - Día seleccionado: círculo teal sólido con número blanco
  - Días normales: número gris oscuro
  - Días pasados/no disponibles: número gris claro
- Sección **"Horas disponibles"** (debajo del calendario):
  - Grid de chips horarios: `09:00 | 10:00 | 11:00 | 12:00`
  - Segunda fila: `16:00 | 17:00 | 18:00 | 19:00`
  - Chip seleccionado: fondo teal, texto blanco
  - Chip no seleccionado: fondo blanco, borde gris, texto gris
- Botón fijo inferior: **"Continuar"** (teal, deshabilitado si no hay selección)

---

### Pantalla 6 — Confirmar Cita

**Ruta:** `app/doctores/[id]/confirmar.tsx`

**Diseño:**
- Header con flecha atrás + título "Confirmar cita"
- Card doctor: foto circular + nombre + especialidad
- Separador
- Lista de detalles con label + valor:
  ```
  Fecha          Jueves 16 de mayo, 2024
  Hora           11:00 AM
  Tipo de consulta   Presencial
  Ubicación      Clínica del Valle,
                 Av. Insurgentes Sur 1234,
                 Col. Del Valle, CDMX
  ```
- Separador
- **Resumen de pago:**
  ```
  Consulta                    $700.00
  ─────────────────────────────────
  Total                       $700.00
  ```
- Botón fijo inferior: **"Confirmar y pagar"** (teal)

---

### Pantalla 7 — Pago

**Ruta:** `app/doctores/[id]/pago.tsx`

**Diseño:**
- Header con flecha atrás + título "Método de pago"
- Tabs: **Tarjeta** | Otras opciones (tab activo con subrayado teal)
- **Tarjeta de crédito visual** (fondo teal oscuro/degradado):
  ```
  VISA                            ◉
  ★★★★  ★★★★  ★★★★  4242
  Vence  06/26
  ```
- Campos del formulario:
  - "Nombre en la tarjeta" → input con valor: Andrea Michel Segura
  - "CVV" → input password (•••) con ícono info
- Toggle: **"Guardar tarjeta"** (teal cuando activo)
- Botón fijo inferior: **"Pagar $700.00"** (teal)

**Seguridad:**
- Campos de tarjeta NO se almacenan localmente
- Integración con Stripe SDK (tokenización)
- CVV nunca se envía al backend propio

---

### Pantalla 8 — Confirmación

**Ruta:** `app/confirmacion.tsx`

**Diseño:**
- Fondo blanco, centrado verticalmente
- Animación/ícono de éxito: círculo teal con ✓ blanco grande + destellos animados
- Título: **"¡Cita confirmada!"** (bold, grande)
- Subtítulo: "Hemos enviado los detalles de tu cita a tu correo y a tu teléfono."
- Card resumen:
  - Foto doc circular + nombre + especialidad
  - Fecha: Jueves 16 de mayo, 2024
  - Hora: 11:00 AM
  - Tipo de consulta: Presencial
- Botón primario: **"Ver mis citas"** → (tabs)/citas
- Link secundario: **"Agregar al calendario"** (teal)

---

### Pantalla 9 — Mis Citas

**Ruta:** `(tabs)/citas.tsx`

**Diseño:**
- Header: título "Mis citas" centrado
- Tabs: **Próximas** | Pasadas (tab activo con subrayado teal)
- Lista de `AppointmentCard`:
  ```
  [Foto]  [Nombre doctor]          [16]
          [Especialidad]           [MAY]
          [Hora]  [Tipo]  [Clínica]
  ```
  - Fecha: número grande + mes en mayúsculas (der)
  - Tipo: "Presencial" o "Video consulta"
  - Separador entre cards

**Comportamiento:**
- Tab "Pasadas" → citas históricas (sin acción de cancelar)
- Tap card → detalle de cita
- Long press (o botón) → opciones: Reagendar, Cancelar

---

### Pantalla 10 — Mensajes

**Ruta:** `(tabs)/mensajes.tsx`

**Diseño:**
- Header: título "Mensajes" (izq) + ícono nuevo mensaje (der, pluma/lápiz)
- `SearchBar`: "Buscar mensajes..."
- Lista de conversaciones:
  ```
  [Avatar]  [Nombre]              [10:30 AM]
            [Último mensaje...]   [● badge 2]
  ```
  - Badge circular teal con número de no leídos
  - Nombre en bold si hay no leídos
  - Timestamp alineado a la derecha

**Comportamiento:**
- Tap conversación → chat/[id]

---

### Pantalla 11 — Videoconsulta

**Ruta:** `app/videoconsulta/[id].tsx`

**Diseño:**
- Pantalla completa (fullscreen), fondo oscuro/gris
- Video principal: cámara del doctor (ocupa toda la pantalla)
- **Pip (picture-in-picture):** cámara del paciente (esquina superior derecha, ~100×130px, bordes redondeados)
- Flecha atrás (esquina superior izquierda, blanca)
- Ícono cámara voltear (esquina superior derecha, blanco)
- **Controles inferiores** (fondo semi-transparente oscuro):
  ```
  [🎤 Micrófono]  [📹 Cámara]  [🔴 Colgar]
  ```
  - Botón colgar: círculo rojo con ícono teléfono blanco
  - Botón micrófono: círculo blanco semi-transparente
  - Botón cámara: círculo blanco semi-transparente
  - Estado mute: fondo gris con línea diagonal

---

### Pantalla 12 — Perfil de Usuario

**Ruta:** `(tabs)/perfil.tsx`

**Diseño:**
- Header: ícono configuración (engrane) alineado a la derecha
- Avatar circular grande centrado (~80px) con foto de perfil
- Nombre completo: **"Andrea Michel Segura"** (bold)
- Link: **"Ver perfil"** (teal, subrayado)
- Lista de opciones con ícono + label + flecha `>`:
  ```
  👤  Datos personales        >
  💳  Métodos de pago         >
  📍  Direcciones             >
  🔔  Notificaciones          >
  ❓  Ayuda y soporte         >
  🚪  Cerrar sesión           >  ← texto rojo/danger
  ```

---

## Dependencias a Instalar

```bash
# Navegación y UI (ya incluidas en SDK 56)
# expo-router ✓

# Íconos
npx expo install @expo/vector-icons

# Calendario
npx expo install react-native-calendars

# Pagos
npx expo install @stripe/stripe-react-native

# Video llamadas
npx expo install @daily-co/daily-react

# Almacenamiento seguro (tokens)
npx expo install expo-secure-store

# Notificaciones push
npx expo install expo-notifications

# Imágenes
npx expo install expo-image-picker

# HTTP client
npm install axios

# Manejo de estado
npm install zustand

# Fechas
npm install date-fns
```

---

## Conexión con Backend PHP (MedicalUniverse)

### Base URL
```typescript
const API_BASE = 'https://tu-dominio.com/api/v1';
```

### Endpoints necesarios (paciente)
| Método | Endpoint | Pantalla |
|--------|----------|---------|
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Registro |
| GET | `/specialties` | Inicio — chips especialidades |
| GET | `/doctors?specialty=&search=` | Lista de doctores |
| GET | `/doctors/:id` | Perfil del doctor |
| GET | `/doctors/:id/availability?date=` | Seleccionar hora |
| POST | `/appointments` | Confirmar cita |
| POST | `/payments/process` | Pago |
| GET | `/appointments/my` | Mis citas |
| GET | `/messages` | Mensajes |
| GET | `/messages/:id` | Chat |
| POST | `/messages/:id` | Enviar mensaje |
| GET | `/user/profile` | Perfil de usuario |
| PUT | `/user/profile` | Editar perfil |

---

## Fases de Desarrollo

### Fase 1 — Base y Navegación (Sprint 1)
- [ ] Design system: colores, tipografía, componentes base
- [ ] Layout raíz con Expo Router
- [ ] Tab bar con 4 tabs
- [ ] Pantalla 1: Splash
- [ ] Pantalla 2: Inicio/Buscar
- [ ] Prueba en Expo Go (iPhone real)

### Fase 2 — Flujo de Búsqueda y Doctor (Sprint 2)
- [ ] Pantalla 3: Lista de Doctores
- [ ] Pantalla 4: Perfil del Doctor
- [ ] Conexión API: especialidades y doctores
- [ ] Componente `DoctorCard`

### Fase 3 — Flujo de Agendado (Sprint 3)
- [ ] Pantalla 5: Calendario y horas
- [ ] Pantalla 6: Confirmar cita
- [ ] Pantalla 7: Pago (Stripe)
- [ ] Pantalla 8: Confirmación
- [ ] Integración completa de booking

### Fase 4 — Pantallas Secundarias (Sprint 4)
- [ ] Pantalla 9: Mis Citas
- [ ] Pantalla 10: Mensajes / Chat
- [ ] Pantalla 12: Perfil de Usuario
- [ ] Autenticación completa (login/registro/sesión)

### Fase 5 — Video y Notificaciones (Sprint 5)
- [ ] Pantalla 11: Videoconsulta
- [ ] Notificaciones push (recordatorios de cita)
- [ ] Auth y login/registro pulido

### Fase 6 — Build y Distribución
- [ ] `eas build --platform ios --profile preview`
- [ ] Subir a TestFlight
- [ ] QA en dispositivos reales iPhone/iPad
- [ ] `eas build --platform ios --profile production`
- [ ] Subir a App Store

---

## Configuración iPad

En `app.json` agregar:
```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.medicalcloud.app"
}
```

Los layouts adaptativos se manejan con:
```typescript
import { useWindowDimensions } from 'react-native';
const { width } = useWindowDimensions();
const isTablet = width >= 768;
```

---

## Notas de Seguridad

- Tokens JWT almacenados en `expo-secure-store` (nunca AsyncStorage)
- Datos de tarjeta manejados exclusivamente por Stripe SDK (tokenización)
- HTTPS obligatorio para todos los endpoints
- Expiración y refresh de tokens
- Validación de inputs en cliente y servidor
