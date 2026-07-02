# Web Follow-up for `C:\Users\angel\Documents\GitHub\MedicalUniverse`

No pude editar el repo web real desde este workspace por las restricciones de escritura actuales, pero para que web y mobile queden alineados estos son los cambios que deben aplicarse alla.

## 1. Privacidad doctor-paciente

- `app/models/DoctorProfile.php`
  - Reemplazar la rama de doctor independiente en `getPatientsOf()` para que ya no regrese todos los pacientes activos.
  - Debe regresar solo:
    - pacientes con `patient_profiles.associated_doctor_id = doctor`
    - pacientes con consulta `appointments.status IN ('completed', 'finished')`
    - pacientes vinculados en `doctor_patient_links`
  - Los doctores con licencia de hospital pueden seguir viendo a los pacientes de su clinica.

- `app/controllers/DoctorController.php`
  - `patients()`: ya no debe depender de la lista abierta anterior.
  - `patientDetail()` y `patientSnapshot()`: deben validar acceso con la misma regla estricta; hoy el detalle web sigue exponiendo mas de lo debido.
  - `registerPatient()`: despues de crear el paciente, insertar tambien en `doctor_patient_links`.
  - Agregar un flujo web para vincular por `doctor_access_code`.

- `app/controllers/AppointmentController.php`
  - Antes de crear una cita desde doctor/asistente, validar que el paciente este vinculado por:
    - `associated_doctor_id`
    - `doctor_patient_links`
    - consulta completada previa
    - licencia de hospital compartida

## 2. Busqueda publica de doctores

- `app/models/DoctorProfile.php`
  - `buildSearchWhere()` debe dejar de depender de `approval_status`.
  - Filtros minimos pedidos:
    - `u.status = 'active'`
    - `consultation_fee > 0`
    - `telemedicine_fee > 0`
  - Ya no mostrar doctores con tarifas en cero.
  - Incluir `lat/lng` y un score de perfil para ordenamiento.

- `app/models/DoctorProfile.php`
  - `search()` debe ordenar:
    1. distancia a la ubicacion del paciente
    2. completitud del perfil
    3. rating/reviews

- `app/views/patient/find_doctor.php`
  - Tomar la ubicacion actual del paciente cuando este disponible.
  - Si falla, usar `patient_profiles.lat/lng` o geocodificar la direccion guardada.
  - Mostrar distancia y reforzar visualmente que la lista ya viene ordenada por cercania.

## 3. Perfil y ubicacion

- `app/views/doctor/profile.php`
  - Rediseñar la captura de direccion del consultorio con:
    - buscador/autocompletado
    - mapa interactivo
    - guardado de `address`, `city`, `state`, `lat`, `lng`
  - Advertir si la ubicacion actual del doctor queda demasiado lejos del punto fijado.

- `app/views/patient/profile.php`
  - Permitir capturar direccion completa con mapa y buscador.
  - Mostrar el `doctor_access_code` del paciente.

## 4. Base de datos

- Aplicar la migracion incluida en este workspace:
  - `tmp_medicaluniverse_backend/database_migration_v40_doctor_patient_access_and_patient_location.sql`

Eso crea:

- `patient_profiles.doctor_access_code`
- `patient_profiles.lat`
- `patient_profiles.lng`
- tabla `doctor_patient_links`

## 5. Paridad API

La logica nueva ya quedo preparada en:

- `tmp_medicaluniverse_backend/MobileApiController.php`
- `tmp_medicaluniverse_backend/Router.php`

Al mover esos cambios al repo web real, conviene copiar la misma logica de:

- perfil movil del doctor
- vinculo por codigo
- alta directa con correo
- busqueda publica con orden por cercania
