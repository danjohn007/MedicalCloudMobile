import { DoctorWorkspaceScreen } from "@/components/doctor/DoctorWorkspaceScreen";
import {
  DOCTOR_BACKEND_BLOCKERS,
  DOCTOR_PROFILE_MODULES,
} from "@/constants/doctor-workspace";

export default function DoctorProfileScreen() {
  return (
    <DoctorWorkspaceScreen
      title="Perfil y operacion"
      subtitle="Configuracion del doctor, finanzas y gestion de asistentes."
      heroTitle="Base administrativa del doctor"
      heroBody="La experiencia clinica necesita tambien el perfil profesional, costos, historial financiero y asistentes. Esta pestana deja ese alcance amarrado al flujo movil para que no quede fuera de la paridad."
      heroIcon="wallet"
      modules={DOCTOR_PROFILE_MODULES}
      blockers={DOCTOR_BACKEND_BLOCKERS}
    />
  );
}
