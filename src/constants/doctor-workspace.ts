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
  "Siguen faltando piezas moviles para asistentes operativos y para la firma clinica final desde notas SOAP.",
  "La disponibilidad del doctor ya tiene lectura y edicion base, pero todavia no replica todo el manejo avanzado del sistema web.",
  "La nota clinica movil ya cubre SOAP por cita, recetas, plantillas y borrador local; la firma final sigue dependiendo del backend web.",
];

export const DOCTOR_HOME_MODULES: DoctorModule[] = [
  {
    id: "activity",
    title: "Panel y actividad clinica",
    summary: "Replica del tablero doctor/activity con citas, notas y recetas recientes.",
    icon: "house",
    status: "available",
  },
  {
    id: "patients",
    title: "Mis pacientes",
    summary: "Listado, filtros, snapshot y acceso directo al expediente del paciente.",
    icon: "user-circle",
    status: "available",
  },
  {
    id: "appointments",
    title: "Citas y videoconsultas",
    summary: "Gestion de agenda, estados de consulta, check-in y entrada a videollamada.",
    icon: "calendar",
    status: "available",
  },
  {
    id: "notes",
    title: "Notas SOAP y recetas",
    summary: "Formulario de consulta con SOAP por cita, receta vinculada y borrador local; la firma final sigue pendiente.",
    icon: "clipboard-text",
    status: "mobile-shell",
  },
];

export const DOCTOR_PATIENT_MODULES: DoctorModule[] = [
  {
    id: "patient-list",
    title: "Listado de pacientes",
    summary: "Vista tipo doctor/patients con busqueda, filtros y acceso al detalle.",
    icon: "user-circle",
    status: "available",
  },
  {
    id: "patient-snapshot",
    title: "Snapshot clinico",
    summary: "Datos rapidos, ultimas citas, signos vitales y contexto antes de consulta.",
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
    title: "Documentos clinicos",
    summary: "Subida de estudios y archivos al expediente del paciente desde la app.",
    icon: "plus",
    status: "available",
  },
];

export const DOCTOR_APPOINTMENT_MODULES: DoctorModule[] = [
  {
    id: "doctor-appointments",
    title: "Agenda de consultas",
    summary: "Citas proximas, en consulta, completadas y reprogramacion desde tablet.",
    icon: "clock",
    status: "available",
  },
  {
    id: "doctor-availability",
    title: "Disponibilidad",
    summary: "Lectura de slots y carga diaria desde movil; falta la edicion completa de overrides.",
    icon: "calendar",
    status: "mobile-shell",
  },
  {
    id: "consultation-note",
    title: "Consulta activa",
    summary: "SOAP, receta, briefing y accesos al historial del paciente durante la consulta.",
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
    summary: "Datos publicos, avatar, costos, duracion, direccion y cedula.",
    icon: "user",
    status: "available",
  },
  {
    id: "doctor-finance",
    title: "Historial financiero",
    summary: "Cobros por consulta, estatus de pago y conciliacion basica.",
    icon: "wallet",
    status: "available",
  },
  {
    id: "doctor-assistants",
    title: "Asistentes",
    summary: "Ya existe vista movil para definir alcance recomendado, pero falta backend operativo del rol.",
    icon: "chat-circle-dots",
    status: "mobile-shell",
  },
];
