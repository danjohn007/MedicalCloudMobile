# Declaraciones de privacidad, salud y revisión para tiendas

Auditoría técnica: 27 de julio de 2026  
Versión objetivo: Doctor Cloud 7.0.0  
Paquete y bundle: `com.doctorcloud.app`

Este documento traduce el comportamiento observado en la app móvil, API y backend a los formularios de Google Play y App Store. No sustituye la revisión de una persona especialista en privacidad y regulación sanitaria.

## Resultado ejecutivo

- Doctor Cloud sí es una app de salud para efectos de las tiendas.
- No usa Health Connect ni HealthKit.
- No se encontró un SDK de anuncios, analítica publicitaria ni seguimiento entre apps.
- No debe declararse como dispositivo médico mientras no exista una clasificación o autorización regulatoria que diga lo contrario.
- La publicación debe hacerla una entidad legal que presta o es responsable del servicio. Apple desaconseja que una app sanitaria con datos sensibles se envíe desde una cuenta individual.
- Google Play exige completar la declaración de apps de salud incluso en pruebas cerradas.
- Si Play Console pertenece a una cuenta personal creada después del 13 de noviembre de 2023, los APK instalados manualmente no cuentan: se requieren al menos 12 testers inscritos de forma continua durante 14 días en una prueba cerrada.
- Para el lanzamiento inicial, configurar la audiencia como adultos. Un adulto puede gestionar información de un menor como madre, padre o tutor, pero la app no debe anunciarse ni configurarse como dirigida a niños hasta implementar y revisar un consentimiento verificable.

## Comportamiento real que sustenta las declaraciones

La app y su backend tratan:

- Identidad y contacto: nombre, correo, teléfono, dirección, fotografía e identificadores de cuenta.
- Datos profesionales: cédula, especialidad, consultorio, disponibilidad y relación con clínica.
- Datos de salud: fecha de nacimiento, sexo, tipo sanguíneo, estatura, peso, alergias, medicamentos, enfermedades, cirugías, antecedentes, notas SOAP, diagnósticos, recetas, documentos y citas.
- Comunicaciones: mensajes entre usuarios, solicitudes de soporte y archivos adjuntos.
- Ubicación aproximada y precisa cuando la persona decide buscar profesionales cercanos, completar una dirección o validar un consultorio.
- Datos de pagos: importes, estado, referencias y proveedor. Los datos completos de tarjeta se capturan por el SDK del proveedor de pago.
- Identificadores del dispositivo o instalación y tokens FCM/APNs para notificaciones.
- Solicitudes y respuestas del asistente de IA.

Proveedores observados en el producto:

- Google: Firebase, FCM, Google Sign-In, Maps y Gemini.
- Apple: Sign in with Apple, APNs y mapas del sistema.
- Stripe y PayPal: pagos.
- Jitsi Meet: videoconsultas.
- Infraestructura de hosting, almacenamiento y correo del sistema.

No se observaron integraciones con Health Connect, HealthKit, anuncios ni un SDK dedicado de analítica o crash reporting. Esto debe volver a comprobarse en el AAB y el IPA finales.

## Google Play: declaración de apps de salud

Ruta: Play Console > Política > Contenido de la aplicación > Apps de salud.

Seleccionar:

1. **Administración y servicios de atención médica / Healthcare Services and Management**
   - Citas, recordatorios, telemedicina, expedientes, facturación, portal de pacientes y comunicación con profesionales.
2. **Administración de medicamentos y tratamientos / Medication and Treatment Management**
   - Creación, consulta y administración de recetas y medicamentos.
3. **Asistencia para decisiones clínicas / Clinical Decision Support**
   - El asistente para profesionales usa información del paciente, conocimiento clínico y procesamiento algorítmico para generar apoyo contextual.

No seleccionar por ahora:

- **Aplicaciones de dispositivos médicos**: Doctor Cloud no está presentado ni acreditado como dispositivo médico.
- **Investigación con seres humanos**: no se encontró un flujo de estudios o ensayos.
- **Prevención de enfermedades y salud pública**, **emergencias y primeros auxilios**, **salud mental** o **rehabilitación**: no son funciones principales observadas.
- **Control de enfermedades y afecciones**: seleccionar sólo si la versión enviada ofrece al paciente un seguimiento activo de enfermedades; almacenar antecedentes no basta por sí solo.

Texto explicativo sugerido para el formulario:

> Doctor Cloud conecta pacientes con profesionales y permite administrar citas, expedientes, mensajes, recetas y videoconsultas. Los profesionales pueden usar un asistente de IA como apoyo contextual, sujeto a su plan y a una autorización destacada antes de enviar contexto clínico. La app no es un dispositivo médico, no realiza diagnósticos autónomos y no sustituye el criterio profesional.

## Google Play: aviso médico obligatorio

Incluir claramente en la descripción completa:

> Doctor Cloud no es un dispositivo médico y no diagnostica, trata, cura ni previene ninguna condición médica. Consulta a un profesional de la salud para obtener consejo, diagnóstico o tratamiento.

Mantener también dentro de las pantallas de IA:

- La respuesta puede contener errores.
- No debe ser la única base de una decisión médica.
- No sustituye la evaluación profesional.
- No es un servicio para emergencias.

## Google Play: Data Safety

### Respuestas generales propuestas

| Pregunta | Respuesta propuesta | Estado |
|---|---|---|
| ¿La app recopila o comparte datos? | Sí, recopila datos | Confirmado |
| ¿Los datos se cifran en tránsito? | Sí, mediante HTTPS/TLS | Revalidar endpoints en producción |
| ¿El usuario puede solicitar eliminación? | Sí, desde la app y una URL pública | Probar el proceso completo |
| ¿Revisión de seguridad independiente? | No | No se encontró evidencia de auditoría certificada |
| ¿Contiene anuncios? | No | Confirmar antes de enviar |
| ¿Usa datos para publicidad o seguimiento? | No | Confirmado en código; verificar contratos de terceros |

La respuesta a “datos compartidos” depende de los contratos:

- Si Google/Firebase/Gemini, Stripe, PayPal, Jitsi y el hosting actúan estrictamente como proveedores de servicio por cuenta de Doctor Cloud y se cumplen las excepciones de Google, sus transferencias pueden no marcarse como “compartidas”.
- Si no se han confirmado contratos, instrucciones, finalidad limitada y retención de cada proveedor, usar la respuesta conservadora: **sí se comparten** los tipos enviados a esos terceros.
- No guardar el formulario como definitivo hasta documentar esta decisión. Una respuesta optimista sin respaldo contractual es un riesgo de rechazo y de cumplimiento.

### Tipos de datos a capturar

| Categoría de Play | Recopilado | Obligatorio u opcional | Finalidad |
|---|---:|---|---|
| Ubicación aproximada | Sí | Opcional | Funcionalidad y personalización de resultados cercanos |
| Ubicación precisa | Sí | Opcional | Funcionalidad: cercanos, dirección o consultorio |
| Nombre | Sí | Obligatorio para cuenta | Administración de cuenta y funcionalidad |
| Correo electrónico | Sí | Obligatorio para cuenta | Autenticación, cuenta, seguridad y soporte |
| Dirección | Sí | Opcional según rol/función | Perfil, consultorio y citas |
| Teléfono | Sí | Opcional | Cuenta y comunicación |
| Otra información personal | Sí | Opcional | Perfil, edad, sexo, datos profesionales y contacto de emergencia |
| ID de usuario | Sí | Obligatorio | Autenticación, seguridad y funcionalidad |
| Información de pago del usuario | Sí por el SDK de pago | Opcional | Procesamiento de pagos y prevención de fraude |
| Historial de compras | Sí | Opcional | Facturación, conciliación y soporte |
| Información de salud | Sí | Opcional para explorar; necesaria para funciones clínicas | Expediente y prestación de funciones solicitadas |
| Mensajes dentro de la app | Sí | Opcional | Comunicación paciente-profesional |
| Fotos | Sí | Opcional | Avatar y adjuntos |
| Archivos y documentos | Sí | Opcional | Documentos clínicos y soporte |
| Interacciones de la app | Sí | Según registros del servidor | Seguridad, límites de IA y funcionalidad |
| Búsquedas dentro de la app | Confirmar retención de logs | Opcional | Búsqueda de profesionales/pacientes |
| Otro contenido generado por el usuario | Sí | Opcional | Notas, soporte y campos libres |
| ID del dispositivo u otros IDs | Sí | Opcional | Notificaciones, seguridad e instalación |

Para cada fila recopilada:

- Marcar “vinculado a la identidad” cuando Play lo pregunte o use un concepto equivalente: el backend lo asocia a cuenta, paciente, profesional o dispositivo.
- Seleccionar **App functionality** y, donde corresponda, **Account management**, **Fraud prevention, security and compliance** y **Personalization**.
- No seleccionar publicidad, marketing ni tracking.
- “Opcional” significa que la persona puede usar la app básica o pública sin proporcionar ese dato; no significa que sea opcional después de activar una función que lo necesita.

## Google Play: permisos sensibles

Permisos Android declarados:

| Permiso | Motivo | Acción previa |
|---|---|---|
| `ACCESS_COARSE_LOCATION` | Resultados cercanos | Aviso destacado y elección afirmativa |
| `ACCESS_FINE_LOCATION` | Resultados cercanos y direcciones exactas | Aviso destacado y elección afirmativa |
| `POST_NOTIFICATIONS` | Citas, mensajes y actividad de cuenta | Explicación contextual y permiso del sistema |
| `INTERNET`, `ACCESS_NETWORK_STATE` | API y conectividad | Sin diálogo de runtime |
| `VIBRATE` | Notificaciones | Sin diálogo de runtime |

La app no debe solicitar ubicación al entrar automáticamente. El aviso implementado aparece antes del diálogo del sistema y explica tipo de dato, propósito, transferencia al servidor y que no hay uso en segundo plano o publicidad.

Permisos bloqueados o no usados en Android: cámara, micrófono y almacenamiento externo heredado. Confirmar el manifiesto final después de generar el AAB.

## App Store: App Privacy

En App Store Connect, declarar la práctica más amplia de la app y de sus SDK de terceros.

### Datos que deben marcarse

| Categoría Apple | Tipo | Vinculado al usuario | Finalidad principal |
|---|---|---:|---|
| Contact Info | Name | Sí | App Functionality / Account Management |
| Contact Info | Email Address | Sí | App Functionality / Account Management |
| Contact Info | Phone Number | Sí | App Functionality |
| Contact Info | Physical Address | Sí | App Functionality |
| Health & Fitness | Health | Sí | App Functionality |
| Financial Info | Payment Info | Sí | App Functionality |
| Financial Info | Purchase History | Sí | App Functionality |
| Location | Precise Location | Sí | App Functionality / Product Personalization |
| Location | Coarse Location | Sí | App Functionality / Product Personalization |
| User Content | Emails or Text Messages | Sí | App Functionality |
| User Content | Photos or Videos | Sí | App Functionality |
| User Content | Customer Support | Sí | App Functionality |
| User Content | Other User Content | Sí | App Functionality |
| Identifiers | User ID | Sí | App Functionality / Account Management |
| Identifiers | Device ID | Sí | App Functionality |

Revisar antes de marcar:

- **Search History**: marcar si las búsquedas enviadas al servidor quedan retenidas en logs más allá de atender la solicitud.
- **Diagnostics**: marcar sólo si la build final incorpora un SDK o sistema que conserva crash logs, rendimiento u otros diagnósticos vinculados.
- **Other Data**: marcar si los logs de producción conservan información que no encaje en las categorías anteriores.

Para todos los datos anteriores:

- Tracking: **No**.
- Third-party advertising: **No**.
- Developer advertising or marketing: **No**, salvo que se implemente una campaña o comunicación de marketing.
- Los datos de salud nunca deben usarse para publicidad, marketing basado en uso o venta a brokers.

Aunque Doctor Cloud no lea HealthKit, Apple considera “Health” la información médica transmitida a la app y al backend.

## App Store: declaraciones adicionales

- Categoría principal: **Medical**.
- Dispositivo médico regulado: **No**, mientras no exista una determinación regulatoria distinta.
- Cifrado: la configuración actual declara que sólo se usan mecanismos exentos/estándar del sistema; responder el cuestionario de exportación conforme al binario final.
- App Tracking Transparency: no aplica mientras no exista tracking.
- Cuenta de desarrollador: confirmar que pertenece a una **Organization/legal entity** responsable del servicio. Si es individual, resolverlo antes de App Review.
- Acceso de revisión: proporcionar cuentas de paciente y profesional con información ficticia, backend activo y un plan con acceso móvil.
- El directorio público de profesionales puede explorarse sin cuenta; citas, expedientes, mensajes, configuración, IA y datos privados requieren autenticación.

## Avisos y consentimientos implementados

### Registro

Antes de crear una cuenta se exige:

1. Aceptar términos y aviso de privacidad.
2. Consentimiento expreso del paciente para datos sensibles de salud, o confirmación del profesional sobre sus facultades y autorizaciones.
3. Confirmación de mayoría de edad o actuación como madre, padre o tutor.

La API guarda tipo de aceptación, versión documental, canal, usuario y fecha en `user_legal_consents`. Esto requiere desplegar `database_migration_v76_user_legal_consents.sql` antes del backend nuevo.

Además, la operación debe conservar una copia inmutable del texto asociado a cada versión. Guardar únicamente `2026-07-27` no basta si después se reemplaza el documento y ya no puede demostrarse qué texto aceptó la persona.

### IA

Antes del primer uso se informa:

- Qué contexto clínico puede enviarse.
- Que el destinatario es un proveedor externo de IA.
- Que la solicitud y respuesta se guardan en Doctor Cloud.
- Que puede rechazarse sin perder las demás funciones.

El backend exige una aceptación vigente antes de ejecutar chat o briefing.

### Ubicación

Antes de pedir el permiso del sistema se informa:

- Que se solicita ubicación precisa.
- Para qué funciones se usa.
- Que las coordenadas se envían al servidor.
- Que no se usa en segundo plano ni para publicidad.

## Cumplimiento mexicano que requiere operación, no sólo código

La LFPDPPP vigente exige consentimiento expreso y por escrito para datos sensibles, mediante firma autógrafa, firma electrónica o un mecanismo de autenticación. El registro técnico implementado aporta una aceptación electrónica autenticable, pero un abogado debe validar el texto, la identidad del responsable y la suficiencia del mecanismo.

La NOM-004-SSA3-2012 está vigente y establece obligaciones sobre integración, manejo, confidencialidad y conservación del expediente clínico. Para expedientes que estén dentro de su ámbito, el plazo mínimo es de cinco años desde el último acto médico. Por eso la eliminación de cuenta no puede prometer borrado indiscriminado e inmediato:

- Separar datos que pueden eliminarse o anonimizarse de los que un profesional o establecimiento debe conservar.
- Documentar quién es responsable y quién actúa como encargado entre Doctor Cloud, médicos y clínicas.
- Bloquear el acceso ordinario al solicitar eliminación y ejecutar la supresión cuando termine cada plazo aplicable.
- Mantener un registro de solicitudes ARCO, verificación de identidad, resolución, excepciones y fecha de ejecución.
- Definir regiones de almacenamiento, respaldos, retención de logs y destrucción segura.
- Formalizar contratos/instrucciones de tratamiento con proveedores y clientes profesionales.
- Crear procedimiento de incidentes y notificación conforme a la legislación aplicable.

## Notas privadas para revisión

No guardar credenciales en Git. Copiar este texto a las notas privadas y completar los marcadores:

> Doctor Cloud ofrece dos roles. Para revisar paciente use [CORREO] / [CONTRASEÑA]. Para revisar profesional use [CORREO] / [CONTRASEÑA]; esta cuenta tiene una suscripción activa con acceso móvil y datos totalmente ficticios.  
>  
> El directorio de profesionales se puede explorar sin cuenta desde [RUTA]. Las citas, mensajes, expediente, configuración e IA exigen autenticación. La ubicación sólo se solicita cuando el revisor pulsa una función de cercanía o dirección. La IA solicita una autorización separada antes de transferir contexto clínico al proveedor. La eliminación de cuenta está en Perfil > Privacidad y cuenta > Eliminar cuenta.  
>  
> Doctor Cloud no es un dispositivo médico, no diagnostica de forma autónoma y no es un servicio de emergencias. Los pagos, si aparecen, corresponden a servicios médicos prestados fuera de la app y se prueban mediante [FLUJO DE PRUEBA].

Mantener ambas cuentas activas, sin 2FA que bloquee al revisor y sin datos personales reales durante toda la revisión.

## Ruta más rápida de envío

### Hoy, sin esperar el binario final

1. Confirmar tipo y fecha de alta de la cuenta de Play Console.
2. Confirmar que Apple Developer es cuenta Organization de la entidad responsable.
3. Crear las fichas con `com.doctorcloud.app`.
4. Guardar como borrador Health Apps, Data Safety y App Privacy usando este documento.
5. Crear dos cuentas de revisión con datos ficticios.
6. Reclutar al menos 12 testers Android y preparar su lista/canal de soporte.

### Para iniciar el reloj de Google Play

1. Desplegar primero migración v76 y backend compatibles.
2. Generar un AAB firmado de la versión candidata.
3. Subirlo a prueba interna para validar instalación, Maps, Google Sign-In y FCM.
4. Promover una build estable a prueba cerrada.
5. Compartir el enlace de inscripción; los 12 testers deben permanecer inscritos 14 días continuos si la regla aplica.
6. Registrar fechas, dispositivos, sesiones y comentarios reales para responder la solicitud de acceso a producción.

Los APK enviados por WhatsApp o instalados directamente no cuentan para este requisito.

### Para Apple

1. Desplegar backend/migraciones.
2. Generar un IPA nuevo con los permisos y avisos actuales.
3. Probar ambos roles en TestFlight interno.
4. Completar App Privacy, clasificación, cuenta de revisión y declaración de dispositivo médico.
5. Enviar a TestFlight externo si se desea ampliar QA; después seleccionar el mismo binario estable para App Review.

## Bloqueadores antes de pulsar “Enviar a revisión”

- Migración v76 y backend móvil desplegados en el orden correcto.
- Prueba real de registro, login, IA, ubicación y eliminación en binarios de tienda.
- Confirmar cuenta Apple de organización/entidad legal.
- Implementar revocación de Sign in with Apple al eliminar una cuenta.
- Tener un proceso real de supresión/anonimización con excepciones de expediente, no sólo cambiar el estado de la cuenta.
- Resolver icono iOS con transparencia e iconos adaptativos Android con cuadrícula.
- Crear feature graphic y capturas sin datos reales.
- Generar AAB de producción; no usar APK de desarrollo.
- Confirmar Maps con el certificado de Play App Signing.
- Confirmar que pagos estén operativos en entorno permitido o esconderlos.
- Revisar legalmente aviso, consentimiento, menores, responsables, transferencias, contratos y plazos.
- Completar una matriz de autorización para asegurar que ningún usuario vea expedientes ajenos.

## Fuentes oficiales

- Google Play, declaración de apps de salud: <https://support.google.com/googleplay/android-developer/answer/14738291>
- Google Play, categorías y permisos sensibles de salud: <https://support.google.com/googleplay/android-developer/answer/13996367>
- Google Play, política de contenido y servicios de salud: <https://support.google.com/googleplay/android-developer/answer/16679511>
- Google Play, Data Safety: <https://support.google.com/googleplay/android-developer/answer/10787469>
- Google Play, prueba cerrada para cuentas personales nuevas: <https://support.google.com/googleplay/android-developer/answer/14151465>
- Apple, App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- Apple, privacidad de la app: <https://developer.apple.com/app-store/app-privacy-details/>
- Apple, administración de App Privacy: <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/>
- Apple, eliminación de cuenta: <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Apple, apps de salud y entidad legal: <https://developer.apple.com/health-fitness/>
- Apple, declaración de dispositivo médico regulado: <https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status>
- LFPDPPP vigente: <https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf>
- NOM-004-SSA3-2012 vigente: <https://platiica.economia.gob.mx/normalizacion/nom-004-ssa3-2012/>
- Texto oficial de NOM-004-SSA3-2012: <https://sidof.segob.gob.mx/notas/5272787>
