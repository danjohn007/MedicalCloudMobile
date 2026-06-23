import { DoctorWorkspaceScreen } from "@/components/doctor/DoctorWorkspaceScreen";
import {
  DOCTOR_BACKEND_BLOCKERS,
  DOCTOR_PATIENT_MODULES,
} from "@/constants/doctor-workspace";

export default function DoctorPatientsScreen() {
  return (
    <DoctorWorkspaceScreen
      title="Pacientes"
      subtitle="Mapa del flujo web de pacientes, snapshot y expediente clinico."
      heroTitle="Paciente como centro del flujo"
      heroBody="En web el doctor puede entrar al detalle, revisar historial, abrir expediente, subir documentos y dejar notas. Esta pestana deja ese alcance agrupado para construirlo por fases sin perder paridad."
      heroIcon="user-circle"
      modules={DOCTOR_PATIENT_MODULES}
      blockers={DOCTOR_BACKEND_BLOCKERS}
    />
  );
}
