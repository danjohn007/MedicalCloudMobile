import { DoctorWorkspaceScreen } from "@/components/doctor/DoctorWorkspaceScreen";
import {
  DOCTOR_BACKEND_BLOCKERS,
  DOCTOR_HOME_MODULES,
} from "@/constants/doctor-workspace";

export default function DoctorHomeScreen() {
  return (
    <DoctorWorkspaceScreen
      title="Workspace doctor"
      subtitle="Base movil para replicar el panel clinico del sistema web en tablet y telefono."
      heroTitle="Paridad doctor web -> app"
      heroBody="Este espacio ya separa la experiencia del doctor dentro de la app. El siguiente paso es conectar autenticacion y endpoints moviles clinicos para que estas vistas operen con datos reales."
      heroIcon="stethoscope"
      modules={DOCTOR_HOME_MODULES}
      blockers={DOCTOR_BACKEND_BLOCKERS}
    />
  );
}
