# Plan de correcciones moviles - 2026-07-07

## Objetivo

Dejar la app movil mas estable y clara para pruebas reales en Android/iOS, priorizando friccion diaria: errores de consola, mensajes de exito visibles, navegacion post-login, notificaciones internas, mensajeria doctor y responsividad.

## Fase 1 - Estabilidad visible y feedback

Estado: listo para testing focalizado.

Hecho en esta tanda:
- Corregir llave duplicada en SOAP cuando llegan plantillas con `id = 0`.
- Quitar `clip-path="none"` del SVG de PayPal para evitar warnings de `react-native-svg`.
- Mostrar exito/error tambien cerca del boton inferior en perfil de paciente y configuracion de doctor.
- Corregir textos mojibake visibles en login y varios textos base de perfil/configuracion.

Pendiente no bloqueante:
- Barrido completo de copy sin acentos en toda la app.
- Revisar mensajes PHP heredados con codificacion rara en endpoints de avatar/error.

## Fase 2 - Sesion y navegacion back

Estado: listo para testing en dispositivo.

Hecho en esta tanda:
- Interceptar back fisico de Android en tabs raiz para mostrar "presiona atras otra vez para salir" sin cerrar sesion.
- Desactivar gesto de regreso sobre los stacks raiz de paciente y doctor para evitar volver al login por historial.
- Redirigir automaticamente desde login si la store ya esta autenticada.

Pendiente de QA manual:
- Probar en dispositivo Android e iPhone con login normal y Google.
- Revisar si conviene limpiar historial tambien al completar registro Google.
- Evaluar un guard global de rutas auth para cubrir todas las pantallas de registro.

## Fase 3 - Notificaciones internas

Estado: listo para testing funcional.

Hecho en esta tanda:
- `notificaciones` ahora funciona como bandeja tipo feed: filtros horizontales, recientes primero, tiempo relativo, indicador de no leida y acceso directo a chat cuando aplica.
- La API movil ya consume `notifications`, mensajes de chat, mensajes de sistema y citas para pacientes/doctores desde el mismo endpoint.
- Al vincular un paciente con codigo personal, el backend intenta crear una notificacion para el paciente sin bloquear el enlace si la tabla no existe.

Hecho despues:
- Se agrego marcar como leida / marcar todas como leidas en API movil.

Nota: push remoto real no debe depender de Expo Go. En SDK actual se necesita development build/EAS para probar push remoto de forma confiable, especialmente Android.

## Fase 4 - Mensajeria doctor

Estado: listo para testing con cuentas reales.

Hecho en esta tanda:
- `/api/mobile/messages`, `/api/mobile/conversation/{id}` y envio de mensajes ya validan permisos por rol paciente/doctor.
- Se agrego pantalla de mensajes para doctores y una quinta seccion en la barra inferior: Inicio, Pacientes, Consultas, Mensajes, Perfil.
- `chat/[id]` quedo como conversacion generica para mostrar nombre/foto de doctor o paciente segun quien abra el hilo.

Alcance propuesto:
- Probar en dispositivo real con un doctor y un paciente con hilo existente.
- Confirmar si se necesita boton para iniciar conversacion desde ficha de paciente vinculado.

## Fase 5 - Perfil, formularios y responsividad

Estado: listo para testing visual y funcional.

Hecho en esta tanda:
- Se agrego `DatePickerField` en app con selector real de fecha, maximo dinamico de 18 anos y apertura por default en la fecha limite de mayoria de edad.
- Perfil de paciente y alta directa de paciente desde doctor ya usan calendario en vez de texto libre `YYYY-MM-DD`.
- Web conserva inputs `type="date"` y ahora limita fecha maxima a 18 anos en registro paciente, Google complete, registro desde doctor, perfil paciente, hospital admin y superadmin.
- El boton de compartir perfil de doctor en vista de paciente ya usa el share sheet nativo con deep link y URL web.
- Grids principales de doctor cambiaron de porcentajes rigidos a `flexBasis` + `minWidth` + `flexGrow` para responder mejor en iPhone/Android.

Alcance propuesto:
- Probar en dispositivo real que el date picker abre correctamente en Android e iOS.
- Confirmar URL publica final del perfil doctor si se quiere compartir una ruta web distinta.

## Fase 6 - Cierre de pendientes tecnicos moviles

Estado: listo para testing funcional.

Hecho en esta tanda:
- Se agregaron endpoints moviles JWT para marcar una notificacion como leida y marcar todas como leidas.
- La bandeja de notificaciones puede marcar leidas individualmente, marcar todas y marcar automaticamente al abrir una conversacion.
- Las citas generadas virtualmente en la bandeja quedan como informativas para no llenar "Nuevas" con avisos que no tienen fila persistente.

Pendiente no bloqueante:
- Barrido focalizado de textos mojibake restantes en pantallas que entren a testing real.
- Revisar si hace falta iniciar conversacion desde ficha de paciente vinculado.
- Revisar push remoto con development build/EAS si se decide ir mas alla de bandeja interna.

## Fase 7 - Testing general y checklist final

Estado: validacion automatizada completa; pendiente testing manual en dispositivos/cuentas reales.

Validacion automatizada ejecutada:
- TypeScript: `npx tsc --noEmit`.
- Lint app: `npx expo lint`.
- PHP backend: `php -l app/controllers/MobileApiController.php` y `php -l core/Router.php`.
- Diff sanity: `git diff --check`.

Lo que no se puede cerrar sin prueba real:
- Login Google completo en Android/iOS con selector de cuenta.
- Back fisico/gestos en dispositivos reales.
- Date picker nativo en el cliente instalado o development build.
- Chat/notificaciones con dos cuentas reales y backend desplegado.
- Responsive final en iPhone/Android con distintos tamanos.

Checklist recomendado de testing:
- Paciente normal: login, dashboard, perfil, cambiar foto, guardar perfil, calendario de nacimiento, codigo personal, compartir codigo y ver codigo oculto/visible.
- Paciente con Google: login Google, seleccion de cuenta, registro pendiente si no existe cuenta, regreso a app sin bucle, sesion persistente.
- Paciente agenda: buscar doctor, abrir perfil doctor, compartir perfil doctor, agendar cita, confirmar/pagar si aplica, revisar cita en listado.
- Paciente comunicacion: abrir mensajes, entrar a chat, enviar mensaje, recibir mensaje, revisar notificaciones y marcar leidas.
- Doctor normal: login, dashboard, barra inferior con 5 secciones, perfil/configuracion, cambiar foto, guardar perfil y revisar mensaje de exito.
- Doctor pacientes: vincular con codigo personal, confirmar notificacion al paciente, alta directa con calendario de nacimiento, abrir ficha del paciente.
- Doctor consulta: crear cita, abrir detalle, check-in, SOAP, plantillas, completar consulta, recetas/notas/documentos si aplica.
- Doctor comunicacion: abrir pestana Mensajes, entrar a chat con paciente, enviar/recibir mensajes, revisar notificaciones y marcar leidas.
- Navegacion: boton back Android, gesto back iOS, refrescar app, cerrar/reabrir app, no regresar al login si hay sesion.
- Responsive: Android chico, Android grande y iPhone; revisar grids de doctor, formularios largos, botones inferiores, notificaciones, perfiles y cards.
- Backend desplegado: aplicar migraciones de codigos personales si faltan, confirmar codigos unicos/random, confirmar rutas nuevas de notificaciones moviles y permisos por rol.

Resultado esperado para considerar cerrado:
- No hay warnings repetidos de `clipPath`.
- No hay errores de keys duplicadas en SOAP.
- No se pierde sesion por back.
- El doctor no ve pacientes no vinculados.
- Los codigos personales aparecen en web/app para pacientes con codigo en API.
- Doctor puede vincular por codigo y el paciente recibe notificacion.
- Doctor y paciente pueden chatear desde app.
- Notificaciones se ordenan por recientes, filtran correctamente y se pueden marcar leidas.
- Calendario de nacimiento no permite fechas menores de 18 anos.
- Grids de doctor no dejan huecos grandes ni tarjetas 1 por fila cuando caben 2.

## Recuento de cambios

App movil:
- Nuevo plan documentado en `PLAN_CORRECCIONES_MOVIL_2026_07_07.md`.
- Nuevo hook `useRootBackExit` para evitar que back cierre sesion accidentalmente.
- Nueva pantalla de mensajes para doctores y nueva pestana Mensajes en doctor.
- Bandeja de notificaciones redisenada con filtros, tiempo relativo, no leidas y acciones.
- Chat reutilizable para paciente/doctor.
- Date picker nativo agregado con `@react-native-community/datetimepicker`.
- Perfil paciente y alta directa de paciente usan calendario.
- Compartir perfil doctor funciona desde vista de paciente.
- Grids principales de doctor usan layout adaptable.
- Ajustes de feedback visual, acentos, SVG PayPal y key duplicada SOAP.

Backend/web:
- `MobileApiController.php` ahora soporta mensajes/notificaciones por rol paciente/doctor.
- Nuevas rutas moviles para marcar notificacion leida y marcar todas.
- Notificacion al paciente cuando doctor lo vincula por codigo.
- Formularios web con fecha de nacimiento limitan maximo a 18 anos.

Pendientes no bloqueantes:
- Barrido completo de copy/mojibake en pantallas no prioritarias.
- Push remoto real requiere development build/EAS; Expo Go solo permite validar bandeja interna.
- Confirmar URL publica final para compartir perfil doctor.
- Decidir si se agrega boton para iniciar chat desde ficha de paciente vinculado.
- Suscripciones/prepago quedan fuera por decision temporal.

## Plan siguiente - Asistente IA en app movil

Estado: analizado, no implementado todavia.

Como funciona hoy en web:
- La vista general esta en `/ai/chat` y usa `AiController@chat`.
- El chat envia mensajes a `/api/ai/stream` con SSE `text/event-stream`.
- El backend aplica `requireAuth()` y `requireFeature('ai_assistant')`.
- Para doctores, el prompt incluye contexto real: estadisticas, pacientes frecuentes, ultimas notas SOAP y recetas.
- Para pacientes, funciona como orientacion general de salud sin diagnosticar.
- Tambien existe `/api/ai/briefing` para doctores, pensado para briefing pre-consulta por cita.

Propuesta movil:
- Agregar pantalla compartida `src/app/ai/chat.tsx` para paciente y doctor con UI tipo chat.
- Agregar accesos en dashboard/menu de paciente y doctor solo si el backend indica feature `ai_assistant`.
- Crear endpoints moviles JWT en `MobileApiController`, por ejemplo:
  - `POST /api/mobile/ai/chat` para chat normal.
  - `POST /api/mobile/ai/briefing` para briefing de doctores por cita.
- Evitar depender de CSRF/sesion web en app; usar JWT como el resto de la API movil.
- En movil conviene empezar sin streaming real si React Native/SSE complica Expo Go: respuesta JSON completa primero, y luego evaluar streaming incremental.
- Reutilizar la misma logica de contexto del `AiController` para no crear dos cerebros distintos entre web y app.

Decisiones antes de implementar:
- Si quieres streaming en tiempo real tipo web desde el primer intento, o respuesta completa mas estable para primera version movil.
- Si el acceso IA debe aparecer para todos o solo cuando `features.ai_assistant` venga activo.
- Si el briefing IA debe vivir dentro del detalle de cita/SOAP o como boton separado en la pantalla de citas.
- Si se guardara historial local de conversaciones en app o solo se usara `ai_assistant_logs` del backend.

## Riesgos / notas

- Hay textos antiguos sin acentos en muchos archivos; conviene corregir por pantalla para evitar cambios masivos dificiles de revisar.
- Algunas respuestas del backend PHP tienen mojibake heredado; deben corregirse con cuidado por codificacion del archivo.
- Push remoto en Expo Go no es el objetivo correcto; la bandeja interna si se puede probar de inmediato.
- `@react-native-community/datetimepicker` se agrego con `expo install`; requiere rebuild/dev build si el cliente nativo actual no lo trae.
