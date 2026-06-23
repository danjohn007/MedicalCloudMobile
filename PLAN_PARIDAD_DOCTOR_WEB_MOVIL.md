# Plan Maestro: Doctores Web -> Movil

Fecha: 2026-06-23
Repo movil: `MedicalCloudMobile`
Repo web de referencia: `MedicalUniverse`

## 1) Objetivo

Llevar a la app movil el flujo operativo completo del doctor que hoy existe en web, manteniendo tambien la paridad del paciente para que ambos roles puedan operar desde telefono o tableta.

## 2) Bloqueo estructural confirmado

Hoy no existe backend movil para doctor.

Hallazgos verificados:

1. `MobileApiController::login()` solo permite `role_name = 'patient'`.
2. `MobileApiController::requireJwt()` rechaza cualquier JWT cuyo `role` no sea `patient`.
3. Los endpoints moviles actuales cubren busqueda de doctores, citas, mensajes, expediente, documentos, recetas, finanzas y notificaciones del paciente, pero no exponen operaciones clinicas del doctor.
4. La app Expo actual tambien asume flujo paciente en el arranque y tabs principales.

## 3) Flujo web doctor que debe replicarse

Referencia principal encontrada en `MedicalUniverse`:

1. `DoctorController::patients()`:
   listado de pacientes con filtros, detalle rapido y acceso al expediente.
2. `DoctorController::availability()` y `availabilityOverride()`:
   agenda base y excepciones.
3. `DoctorController::notes()` y `noteDetail()`:
   listado de notas y seguimiento.
4. `AiController::notes()`:
   formulario de consulta con notas SOAP, receta y contexto clinico.
5. `DoctorController::consultationTemplates()`:
   plantillas reutilizables.
6. `DoctorController::prescriptions()` y `printPrescription()`:
   gestion de recetas.
7. `DoctorController::patientHistory()`:
   historial por paciente.
8. `DoctorController::activity()`:
   panel de actividad clinica con citas, notas y recetas.
9. `DoctorController::patientSnapshot()`:
   resumen clinico rapido.
10. `DoctorController::patientExpediente()`:
    antecedentes, notas, documentos y recetas del paciente.
11. `DoctorController::patientDocumentUpload()`:
    carga de estudios y archivos al expediente.
12. `DoctorController::patientExpedienteNote()`, `signNote()` y `autosaveNote()`:
    notas clinicas, firma y guardado automatico.
13. `DoctorController::financialHistory()`:
    historial financiero del doctor.
14. `DoctorController::assistants()` y flujos de invitacion/configuracion:
    gestion de asistentes.
15. `DoctorController::profile()`, `avatar()` y `removeAvatar()`:
    perfil profesional.

## 4) Estado del app movil despues de esta pasada

1. Ya existe base de navegacion separada por rol:
   `/(tabs)` para paciente y `/(doctor-tabs)` para doctor.
2. Ya existe shell visual del workspace doctor dentro de la app.
3. Todavia no existe autenticacion funcional de doctor ni consumo real de datos clinicos del doctor porque el backend movil no lo permite.

## 5) API movil necesaria para destrabar doctor

Minimo recomendado para arrancar la paridad real:

1. `POST /api/mobile/auth/login`
   permitir doctor y emitir JWT con `role = doctor`.
2. `GET /api/mobile/doctor/dashboard`
   KPIs, actividad reciente y resumen del dia.
3. `GET /api/mobile/doctor/appointments?status=`
   agenda del doctor.
4. `GET /api/mobile/doctor/appointments/:id`
   detalle de consulta.
5. `POST /api/mobile/doctor/appointments/:id/status`
   confirmar, iniciar consulta, completar, cancelar.
6. `GET /api/mobile/doctor/patients`
   listado de pacientes del doctor.
7. `GET /api/mobile/doctor/patients/:id/snapshot`
   resumen clinico rapido.
8. `GET /api/mobile/doctor/patients/:id/history`
   historial del paciente.
9. `GET|PUT /api/mobile/doctor/patients/:id/expediente`
   antecedentes del paciente.
10. `POST /api/mobile/doctor/patients/:id/documents`
    subir documentos al expediente.
11. `GET /api/mobile/doctor/appointments/:id/soap`
    precarga de consulta activa.
12. `POST /api/mobile/doctor/appointments/:id/soap`
    guardar SOAP y receta ligada a la cita.
13. `POST /api/mobile/doctor/notes/:id/sign`
    firmar nota clinica.
14. `POST /api/mobile/doctor/notes/:id/autosave`
    autosave de consulta.
15. `GET /api/mobile/doctor/prescriptions`
    listado de recetas emitidas.
16. `GET|PUT /api/mobile/doctor/availability`
    disponibilidad base.
17. `POST /api/mobile/doctor/availability/override`
    excepciones y bloqueos.
18. `GET /api/mobile/doctor/financial-history`
    historial financiero.
19. `GET|POST /api/mobile/doctor/assistants`
    asistentes e invitaciones.

## 6) Fases recomendadas

### Fase 0 - Auth y cimientos

1. Habilitar login doctor en backend movil.
2. Mantener rutas separadas por rol en Expo.
3. Cerrar contrato de tipos para doctor, paciente, cita clinica, SOAP y receta.

### Fase 1 - Operacion diaria del doctor

1. Dashboard doctor.
2. Agenda del doctor.
3. Estados de la cita y entrada a videoconsulta.
4. Disponibilidad base y overrides.

### Fase 2 - Pacientes y expediente

1. Listado de pacientes.
2. Snapshot clinico.
3. Historial del paciente.
4. Expediente por paciente y documentos.

### Fase 3 - Consulta clinica completa

1. Formulario SOAP de consulta.
2. Recetas vinculadas.
3. Autosave y firma.
4. Plantillas de consulta.

### Fase 4 - Operacion extendida

1. Perfil completo del doctor.
2. Historial financiero.
3. Asistentes.
4. Pulido de tablet, offline de lectura y QA cruzado web vs movil.

## 7) Preguntas que conviene cerrar antes de la siguiente fase

1. Si quieres que yo lo construya end to end, necesito tambien permiso de trabajo sobre el backend `MedicalUniverse`, no solo el repo movil.
2. Hay que decidir si primero cerramos la Fase 0 y Fase 1 completas o si quieres atacar antes la consulta clinica SOAP/recetas aunque el dashboard doctor quede despues.
