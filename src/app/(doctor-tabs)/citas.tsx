import { DoctorWorkspaceScreen } from "@/components/doctor/DoctorWorkspaceScreen";
import {
  DOCTOR_APPOINTMENT_MODULES,
  DOCTOR_BACKEND_BLOCKERS,
} from "@/constants/doctor-workspace";

export default function DoctorAppointmentsScreen() {
  return (
    <DoctorWorkspaceScreen
      title="Consultas"
      subtitle="Agenda del doctor, disponibilidad y ejecucion de la consulta clinica."
      heroTitle="De cita a nota firmada"
      heroBody="Aqui vamos a conectar lo que hoy vive en doctor/activity, doctor/availability, doctor/notes y doctor/consultation_note para que la tableta sirva durante la consulta real."
      heroIcon="calendar"
      modules={DOCTOR_APPOINTMENT_MODULES}
      blockers={DOCTOR_BACKEND_BLOCKERS}
    />
  );
}
