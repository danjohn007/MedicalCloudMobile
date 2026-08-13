import type { IconName } from "@/components/Icon";

export type DoctorModuleStatus =
  | "available"
  | "mobile-shell"
  | "backend-required";

export interface DoctorModule {
  id: string;
  title: string;
  summary: string;
  icon: IconName;
  status: DoctorModuleStatus;
}

export const DOCTOR_BACKEND_BLOCKERS = [
  "Siguen faltando piezas móviles para asistentes operativos con permisos reales y contexto de doctor activo.",
  "La disponibilidad del doctor ya tiene lectura y edición base, pero todavía no replica todo el manejo avanzado del sistema web.",
  "La firma clínica móvil ya quedó integrada al flujo SOAP, pero depende de aplicar la migración v55 en el entorno para habilitar `is_signed` y `signed_at`.",
];

export const DOCTOR_HOME_MODULES: DoctorModule[] = [
  {
    id: "activity",
    title: "Panel y actividad clínica",
    summary: "Réplica del panel de actividad del doctor con citas, notas y recetas recientes.",
    icon: "house",
    status: "available",
  },
  {
    id: "patients",
    title: "Mis pacientes",
    summary: "Listado, filtros, resumen y acceso directo al expediente del paciente.",
    icon: "user-circle",
    status: "available",
  },
  {
    id: "appointments",
    title: "Citas y videoconsultas",
    summary: "Gestión de agenda, estados de consulta, registro de llegada y entrada a videollamada.",
    icon: "calendar",
    status: "available",
  },
  {
    id: "notes",
    title: "Notas SOAP y recetas",
    summary: "Formulario de consulta con SOAP por cita, receta vinculada, guardado automático y firma final desde la app.",
    icon: "clipboard-text",
    status: "available",
  },
];

export const DOCTOR_PATIENT_MODULES: DoctorModule[] = [
  {
    id: "patient-list",
    title: "Listado de pacientes",
    summary: "Vista tipo doctor/patients con búsqueda, filtros y acceso al detalle.",
    icon: "user-circle",
    status: "available",
  },
  {
    id: "patient-snapshot",
    title: "Resumen clínico",
    summary: "Datos rápidos, últimas citas, signos vitales y contexto antes de consulta.",
    icon: "heart",
    status: "available",
  },
  {
    id: "patient-expediente",
    title: "Expediente del paciente",
    summary: "Antecedentes, notas, historial y recetas ya visibles desde la app del doctor.",
    icon: "file",
    status: "mobile-shell",
  },
  {
    id: "patient-documents",
    title: "Documentos clínicos",
    summary: "Subida de estudios y archivos al expediente del paciente desde la app.",
    icon: "plus",
    status: "available",
  },
];

export const DOCTOR_APPOINTMENT_MODULES: DoctorModule[] = [
  {
    id: "doctor-appointments",
    title: "Agenda de consultas",
    summary: "Citas próximas, en consulta, completadas y reprogramación desde tablet.",
    icon: "clock",
    status: "available",
  },
  {
    id: "doctor-availability",
    title: "Disponibilidad",
    summary: "Lectura de horarios y carga diaria desde el móvil; falta la edición completa de excepciones.",
    icon: "calendar",
    status: "mobile-shell",
  },
  {
    id: "consultation-note",
    title: "Consulta activa",
    summary: "SOAP, receta, resumen y accesos al historial del paciente durante la consulta.",
    icon: "stethoscope",
    status: "available",
  },
  {
    id: "consultation-templates",
    title: "Plantillas de consulta",
    summary: "Atajos reutilizables para notas, planes y recetas frecuentes.",
    icon: "list",
    status: "available",
  },
];

export const DOCTOR_PROFILE_MODULES: DoctorModule[] = [
  {
    id: "doctor-profile",
    title: "Perfil del doctor",
    summary: "Datos públicos, avatar, costos, duración, dirección y cédula.",
    icon: "user",
    status: "available",
  },
  {
    id: "doctor-finance",
    title: "Historial financiero",
    summary: "Cobros por consulta, estado de pago y conciliación básica.",
    icon: "wallet",
    status: "available",
  },
  {
    id: "doctor-assistants",
    title: "Asistentes",
    summary: "Ya existe una vista móvil para definir el alcance recomendado, pero falta completar el servidor para este rol.",
    icon: "chat-circle-dots",
    status: "mobile-shell",
  },
];
