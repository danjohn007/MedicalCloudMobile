# Plan Maestro: Pacientes Web -> Movil

Fecha: 2026-06-08
Rama backend objetivo: feature/dashboard-redesign

## 1) Objetivo

Llevar a movil todo el flujo de pacientes que existe en web, cerrando gaps funcionales y corrigiendo primero los incidentes criticos de produccion que hoy impiden operar.

## 2) Diagnostico rapido (estado actual)

### Criticos en produccion (bloquean operacion)

1. Falla fatal por include faltante:
   - require de app/views/components/payment_icons.php en vistas legacy de pagos.
   - Impacta rutas de pagos y listados donde se incluye payment modal.
2. Warning masivo en API movil:
   - Undefined array key doctor_id en GET /api/mobile/appointments.
3. Warning de variables indefinidas en vista legacy:
   - fee, appt, stripeKey en billing/payment_modal.php (stack de produccion).

### IA (probables causas de ruptura)

1. Feature gate: ai_assistant depende del plan/licencia activa del doctor.
2. Configuracion de proveedor/clave/modelo en global_settings o Config constants.
3. Errores HTTP de proveedor (404/429/401) con fallback parcial en AiController.

## 3) Alcance funcional web -> movil

### Ya cubierto en movil

- Auth paciente (login/registro)
- Buscar doctores + perfil doctor
- Agendar cita (fecha/hora/tipo/motivo/notas)
- Citas (proximas/pasadas) + detalle
- Chat paciente-doctor
- Perfil paciente editable
- Expediente editable
- Check-in/checkout QR
- Videoconsulta (Jitsi)

### Faltante por paridad

1. Avatar de paciente (subir/eliminar)
2. Documentos de expediente (listar/subir/eliminar)
3. Historial financiero del paciente
4. Impresion/descarga de expediente (equivalente movil: export/share PDF)
5. Flujo robusto de pago de cita desde detalle (reintentos, estados, expiracion)
6. Manejo offline minimo para datos clinicos clave (cache lectura)
7. Telemetria de errores y salud de API en app movil

## 4) Plan por sprints

## Sprint 0 - Estabilizacion critica (1-2 dias)

Objetivo: detener errores productivos antes de ampliar funcionalidades.

Entregables:

1. Hotfix backend API movil:
   - Blindaje de doctor_id en payload de appointments.
2. Compatibilidad vistas legacy pagos:
   - Componente payment_icons.php disponible para includes antiguos.
3. Parches en servidor productivo (si sigue corriendo vistas legacy):
   - Revisar/actualizar payment_modal.php para variables defensivas.
4. Checklist IA:
   - Validar ai_provider, ai_api_key, ai_model en global_settings.
   - Verificar feature ai_assistant para plan del doctor.

Criterios de aceptacion:

- 0 errores fatales por payment_icons.
- 0 warnings doctor_id en logs de /api/mobile/appointments.
- IA responde o devuelve error controlado con mensaje util.

## Sprint 1 - Paridad de expediente y documentos (3-4 dias)

Objetivo: completar expediente de paciente al nivel web.

Entregables movil:

1. Pantalla Documentos:
   - listar documentos
   - subir imagen/pdf
   - eliminar documento
2. Integracion API en src/services/api.ts:
   - getPatientDocuments
   - uploadPatientDocument
   - deletePatientDocument
3. UX de errores y estados de carga por archivo.

Criterios de aceptacion:

- Subida y borrado funcional en Android/iOS.
- Reflejo inmediato en listado.

## Sprint 2 - Finanzas y pagos de citas (3 dias)

Objetivo: cerrar flujo economico del paciente.

Entregables movil:

1. Pantalla Historial Financiero:
   - pagos completados/pendientes/reembolsos
2. Pago de cita desde detalle:
   - crear orden
   - abrir aprobacion
   - capturar y refrescar estado
3. Estado de expiracion de pay_deadline y CTA de reagendar.

Criterios de aceptacion:

- Cita pendiente pasa a confirmada tras pago.
- Errores de pago no rompen flujo de citas.

## Sprint 3 - Exportes, avatar y polish clinico (3 dias)

Objetivo: cerrar brechas de experiencia frente a web.

Entregables movil:

1. Avatar paciente:
   - subir/actualizar/eliminar
2. Exportar expediente a PDF y compartir
3. Mejoras de accesibilidad y performance en perfil/expediente.

Criterios de aceptacion:

- Usuario puede gestionar avatar y compartir expediente.
- Sin degradacion visible de rendimiento.

## Sprint 4 - Hardening y release (2-3 dias)

Objetivo: calidad final y despliegue seguro.

Entregables:

1. Pruebas E2E manuales por flujo critico.
2. Telemetria minima:
   - errores API por endpoint
   - trazas de fallas IA/pagos
3. Validacion cruzada web vs movil (matriz de paridad firmada).

Criterios de aceptacion:

- Matriz de paridad >= 95% en estado OK.
- Incidentes criticos cerrados.

## 5) Matriz inicial de paridad (resumen)

1. Perfil paciente: Parcial (falta avatar completo)
2. Expediente clinico: Parcial (falta export/share)
3. Documentos: Pendiente
4. Historial financiero: Pendiente
5. Agendar/gestionar citas: Casi completo
6. Videoconsulta: Completo funcional
7. IA en consulta web: Inestable por configuracion/feature gate

## 6) Orden de ejecucion recomendado

1. Sprint 0 (hotfixs produccion)
2. Sprint 1 (documentos)
3. Sprint 2 (finanzas/pagos)
4. Sprint 3 (avatar/exportes)
5. Sprint 4 (hardening)

## 7) Riesgos y mitigaciones

1. Servidor en version desalineada con repo.
   - Mitigacion: despliegue limpio desde rama feature/dashboard-redesign + smoke tests.
2. IA depende de proveedor externo.
   - Mitigacion: health-check diario + fallback de proveedor/modelo.
3. Cambios en pagos pueden romper conversion.
   - Mitigacion: feature flag por rol/ruta y canary release.

## 8) Definition of Done

1. Todos los flujos de paciente web tienen equivalente movil.
2. Logs sin errores fatales repetitivos por 48h.
3. QA funcional en Android e iOS aprobado.
4. Documentacion de endpoints y pantallas actualizada.
