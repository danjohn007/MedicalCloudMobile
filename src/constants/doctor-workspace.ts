import type { IconName } from "@/components/Icon";

export type DoctorModuleStatus = "mobile-shell" | "backend-required";

export interface DoctorModule {
  id: string;
  title: string;
  summary: string;
  icon: IconName;
  status: DoctorModuleStatus;
}

export const DOCTOR_BACKEND_BLOCKERS = [
  "El login movil actual rechaza doctores y solo emite JWT con role patient.",
  "MobileApiController protege todos los endpoints con requireJwt() exclusivo para patient.",
  "No existen endpoints moviles para pacientes del doctor, SOAP, recetas, expediente clinico ni disponibilidad del doctor.",
];

export const DOCTOR_HOME_MODULES: DoctorModule[] = [
  {
    id: "activity",
    title: "Panel y actividad clinica",
    summary: "Replica del tablero doctor/activity con citas, notas y recetas recientes.",
    icon: "house",
    status: "backend-required",
  },
  {
    id: "patients",
    title: "Mis pacientes",
    summary: "Listado, filtros, snapshot y acceso directo al expediente del paciente.",
    icon: "user-circle",
    status: "backend-required",
  },
  {
    id: "appointments",
    title: "Citas y videoconsultas",
    summary: "Gestion de agenda, estados de consulta, check-in y entrada a videollamada.",
    icon: "calendar",
    status: "backend-required",
  },
  {
    id: "notes",
    title: "Notas SOAP y recetas",
    summary: "Formulario de consulta con autosave, firma y receta vinculada.",
    icon: "clipboard-text",
    status: "backend-required",
  },
];

export const DOCTOR_PATIENT_MODULES: DoctorModule[] = [
  {
    id: "patient-list",
    title: "Listado de pacientes",
    summary: "Vista tipo doctor/patients con busqueda, filtros y acceso al detalle.",
    icon: "user-circle",
    status: "mobile-shell",
  },
  {
    id: "patient-snapshot",
    title: "Snapshot clinico",
    summary: "Datos rapidos, ultimas citas, signos vitales y contexto antes de consulta.",
    icon: "heart",
    status: "backend-required",
  },
  {
    id: "patient-expediente",
    title: "Expediente del paciente",
    summary: "Antecedentes, notas propias, notas de otros doctores, documentos y recetas.",
    icon: "file",
    status: "backend-required",
  },
  {
    id: "patient-documents",
    title: "Documentos clinicos",
    summary: "Subida de estudios y archivos al expediente del paciente desde la app.",
    icon: "plus",
    status: "backend-required",
  },
];

export const DOCTOR_APPOINTMENT_MODULES: DoctorModule[] = [
  {
    id: "doctor-appointments",
    title: "Agenda de consultas",
    summary: "Citas proximas, en consulta, completadas y reprogramacion desde tablet.",
    icon: "clock",
    status: "backend-required",
  },
  {
    id: "doctor-availability",
    title: "Disponibilidad",
    summary: "Horarios base y overrides equivalentes a doctor/availability.",
    icon: "calendar",
    status: "backend-required",
  },
  {
    id: "consultation-note",
    title: "Consulta activa",
    summary: "SOAP, receta, briefing y accesos al historial del paciente durante la consulta.",
    icon: "stethoscope",
    status: "backend-required",
  },
  {
    id: "consultation-templates",
    title: "Plantillas de consulta",
    summary: "Atajos reutilizables para notas, planes y recetas frecuentes.",
    icon: "list",
    status: "backend-required",
  },
];

export const DOCTOR_PROFILE_MODULES: DoctorModule[] = [
  {
    id: "doctor-profile",
    title: "Perfil del doctor",
    summary: "Datos publicos, avatar, costos, duracion, direccion y cedula.",
    icon: "user",
    status: "mobile-shell",
  },
  {
    id: "doctor-finance",
    title: "Historial financiero",
    summary: "Cobros por consulta, estatus de pago y conciliacion basica.",
    icon: "wallet",
    status: "backend-required",
  },
  {
    id: "doctor-assistants",
    title: "Asistentes",
    summary: "Invitaciones, aprobaciones y configuracion de colaboradores.",
    icon: "chat-circle-dots",
    status: "backend-required",
  },
];
