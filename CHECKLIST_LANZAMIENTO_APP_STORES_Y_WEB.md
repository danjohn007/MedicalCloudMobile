# Checklist maestro de lanzamiento de DoctorCloud

Fecha de auditoria inicial: 22 de julio de 2026  
Ultima actualizacion tecnica: 30 de julio de 2026
Repositorios revisados:

- App movil: `MedicalCloudMobile`
- Web, backend y API movil: `MedicalUniverse`
- Sitio de produccion: `https://doctorcloud.digital`

## Objetivo

Dejar DoctorCloud listo para publicarse en App Store y Google Play con una web, API y operacion de produccion coherentes. El lanzamiento no se considera terminado solo porque las compilaciones suban: deben pasar las politicas de tiendas, funcionar los flujos principales y existir una ruta segura para operar, dar soporte y responder ante fallas.

## Leyenda

- `[x]` Verificado en codigo, configuracion o servicio.
- `[~]` Existe, pero falta validacion final o configuracion manual.
- `[ ]` Pendiente.
- `BLOQUEADOR` Impide enviar o hace probable un rechazo/falla grave.
- `DIFERIDO` No se trabajara de inmediato, pero debe resolverse u ocultarse antes de publicar.

## Estado actual comprobado

| Area | Estado actual | Resultado |
|---|---|---|
| Identidad de la app | `com.doctorcloud.app` en Android e iOS | `[x]` |
| Version publica | `7.0.0` | `[x]` |
| EAS | Proyecto `@impactos-digitales/doctorcloud-app` enlazado | `[x]` |
| iOS | Build de produccion 7.0.0 (build 21) terminada el 29/07/2026; falta una build nueva con el icono blanco y los cambios actuales | `[~]` |
| Android | Builds recientes son APK de desarrollo; falta confirmar un AAB final de produccion | `[ ]` |
| Salud del proyecto | `npx expo-doctor`: 18/18 validaciones correctas | `[x]` |
| Calidad estatica | TypeScript, lint, Expo Doctor 18/18 y exportación Android/iOS/web de 63 rutas pasaron el 30/07/2026 | `[x]` |
| Icono iOS | Variante 1024 x 1024 sin alpha enlazada en `ios.icon`; falta comprobarla en una build nueva | `[~]` |
| Iconos Android | El adaptive icon usa fondo solido y ya no referencia la imagen con cuadricula; falta comprobarlo en una build nueva | `[~]` |
| Push iOS | FCM/APNs ya probado en TestFlight | `[x]` |
| Push Android | Implementacion FCM nativa presente; falta prueba de la build final | `[~]` |
| Mapa iOS | Funciona con Apple Maps | `[x]` |
| Mapa web | Reportado funcionando | `[~]` |
| Mapa Android | Reportado funcional tras ajustar Google Cloud; falta validarlo en AAB firmado/Play Internal Testing | `[~]` |
| Login social | Google nativo y Sign in with Apple implementados | `[~]` |
| Web publica | HTTPS y landing activa | `[x]` |
| Privacidad/terminos/eliminacion | Las tres URLs públicas responden 200; la app las enlaza desde autenticación y perfiles | `[~] Falta revisión legal` |
| Eliminacion de cuenta en app | Flujo y v70 responden en producción; revocación Apple y v79 quedaron preparados, pendientes de secretos/configuración y prueba autenticada | `[~]` |
| Acceso doctor por suscripcion | Backend y app exigen suscripcion activa con `has_app=1` y bloquean modulos por plan; falta desplegar y probar con cuentas de cada plan | `[~]` |
| Build contra cambios actuales | Hay cambios locales posteriores a las builds de EAS | `[ ] BLOQUEADOR` |
| Acceso público sin cuenta | La app permite explorar el directorio y detalle de doctores; para agendar o usar datos privados exige iniciar sesión | `[x]` |
| Base de datos real | Export del 30/07 auditado contra app/API; `v78`, `v79` y la nueva reconciliacion `v80` siguen sin aplicarse | `[ ] BLOQUEADOR` |

## Decisiones que deben definirse primero

Estas decisiones evitan rehacer fichas, textos legales y pantallas despues.

- [x] Responsable legal definido: Dan Jonathan Raso Rios. Falta verificar que el nombre publico de cada cuenta de tienda coincida.
- [x] Lanzamiento inicial definido: Mexico.
- [~] Se admitiran menores; el diseno tecnico esta en `DISENO_CONSENTIMIENTO_MENORES.md` y falta implementar consentimiento verificable de madre, padre o tutor antes de publicar para ese publico.
- [x] La app y los metadatos se presentarán como plataforma de gestión y servicios médicos, no como dispositivo médico, servicio de emergencias ni sustituto de un profesional.
- [x] Correo oficial definido: `soporte@doctorcloud.digital`.
- [x] Responsable de privacidad y domicilio definidos; falta revision legal del texto final.
- [~] Solicitud de eliminacion con plazo operativo de 30 dias definida; falta documentar la retencion clinica, contable y las excepciones legales con revision profesional.
- [~] Las consultas quedan sin Stripe/PayPal mediante `v78` hasta completar QA live. Todavía debe decidirse si suscripciones web/Connect quedan visibles en la primera versión y probarse en modo real si se conservan.
- [x] Mantener Expo SDK 54 para la versión 7.0.0: ya apunta a Android API 36 y EAS se fijó a Xcode 26.0. Migrar a SDK 56 después del primer lanzamiento, con regresión separada, porque también eleva las versiones nativas y de React Native.
- [ ] Confirmar si se distribuira en la Union Europea. En ese caso completar estado de comerciante DSA en App Store Connect.
- [ ] Confirmar si la cuenta de Play Console es personal y fue creada despues del 13/11/2023; de ser asi, reservar 14 dias para prueba cerrada con al menos 12 testers.
- [ ] `BLOQUEADOR APPLE` Confirmar que la cuenta de Apple Developer pertenece a una organizacion/entidad legal responsable del servicio sanitario; Apple indica que este tipo de app no debe enviarse desde una cuenta individual.

## P0: bloqueadores comunes antes de enviar

### Seguridad inmediata del servidor

- [ ] `BLOQUEADOR` Rotar el secreto de los cron jobs en produccion. El valor anterior debe asumirse comprometido por su historial versionado.
- [~] El código ya lee `CRON_SECRET` desde `Config.php` o entorno y se retiró el valor actual del repositorio; falta configurar y desplegar el secreto nuevo.
- [ ] Actualizar las tareas de cPanel con el secreto nuevo y comprobar que un valor incorrecto responde 403.
- [ ] Revisar historial Git y cualquier copia desplegada para asumir que el secreto anterior ya esta comprometido.
- [~] El JWT movil ya falla cerrado si `MOBILE_JWT_SECRET` falta o conserva un marcador de ejemplo; falta desplegarlo y confirmar que la configuracion privada contiene un secreto aleatorio real.
- [x] `core/Config.php` y cuentas de servicio estan ignorados por Git.
- [~] La cuenta de servicio FCM existe fuera de Git en `storage/firebase/`; confirmar el mismo archivo y permisos restrictivos en produccion.
- [x] `test_connection.php` y `/app/test_connection.php` responden 404 en producción.
- [x] El archivo de diagnostico fue eliminado del repositorio y la regla defensiva 404 se mantiene.

### Contrato de base de datos real

- [x] Export reciente inventariado sin copiar datos ni secretos al repositorio;
  se compararon 60 tablas contra migraciones y SQL actual.
- [x] `v80` preparado para completar `force_password_change`, columnas de
  renovacion, metadatos de payouts y enums usados por reembolsos/asistente/
  superadmin.
- [x] App y backend usan ahora valores canonicos de genero compatibles con el
  enum real; la interfaz sigue mostrando etiquetas en español.
- [x] El health check privado valida tablas, columnas y valores de enum, no solo
  conectividad.
- [ ] `BLOQUEADOR` Tomar backup verificado y aplicar `v78`, `v79`, `v80` en ese
  orden.
- [ ] Exigir HTTP 200 de `/superadmin/system-health` despues de migrar.
- [ ] Probar en runtime cambio obligatorio de contraseña, renovacion de
  licencia, alta de cita por asistente/superadmin, reembolso y perfil de
  paciente.
- [ ] Identificar por evidencia operativa las cuentas que recibieron contraseña
  temporal mientras faltaba `force_password_change`; no forzar a todos los
  usuarios existentes indiscriminadamente.
- [ ] Confirmar el precio definitivo del plan Esencial; la base real conserva
  `$10/$20` y no se modifico sin autorizacion de negocio.
- [ ] Mantener consultas Stripe/PayPal ocultas: el export sigue en sandbox y
  todavia tenia ambos metodos de consulta habilitados antes de `v78`.

### Privacidad, terminos y eliminacion de cuenta

- [~] Aviso integral publicado en `https://doctorcloud.digital/app/privacidad` con responsable, contacto, datos clínicos, proveedores, derechos ARCO y retención; falta revisión legal.
- [~] Términos publicados en `https://doctorcloud.digital/app/terminos` para pacientes, doctores, menores, IA, pagos y proveedores; falta revisión legal.
- [~] Recurso web publicado en `https://doctorcloud.digital/app/eliminar-cuenta` con canal de solicitud y aviso de verificación de identidad; falta confirmar que el correo de soporte está atendido.
- [~] La app ya incluye una opcion visible para solicitar la eliminacion de cuenta en ambos perfiles; falta desplegarla y probarla desde builds de tienda.
- [~] API y migración `v70` están desplegadas: la ruta de estado alcanza autenticación en producción; falta la prueba completa con una cuenta controlada.
- [~] La solicitud desactiva la cuenta, bloquea sus JWT por estado y desregistra tokens FCM; falta validar el flujo autenticado en producción.
- [~] Para cuentas Apple, el cliente ya envía `authorizationCode`, el servidor intercambia y cifra el refresh token, la eliminación exige reautenticación cuando falta y revoca antes de desactivar. Falta aplicar `v79`, configurar Team ID/Key ID/`.p8`/clave de cifrado y probarlo con Apple real.
- [ ] Eliminar o anonimizar datos que no deban conservarse y documentar claramente las excepciones clinicas/legales.
- [~] La app confirma y cierra sesión; el backend envía acuse al solicitar y al cancelar. El aviso publica un plazo normal de 30 días; falta probar SMTP y enviar la notificación final del procesamiento.
- [~] Privacidad y términos están enlazados desde login/registro y desde los perfiles de paciente y doctor. También quedaron preparados en el pie de la landing; falta desplegar ese cambio web.
- [~] El registro móvil ya exige aceptaciones separadas para términos/privacidad, datos sensibles y mayoría de edad/tutor; la API guarda versión, usuario, canal y fecha mediante la migración `v76`. Falta desplegar migración, backend y build en ese orden y probarlos.
- [x] La versión `2026-07-27` puede reconstruirse mediante commit y hashes SHA-256 documentados en `MedicalUniverse/LEGAL_VERSION_ARCHIVE.md`.
- [~] El aviso público ya describe los datos clínicos enviados a Gemini, retención de solicitudes/respuestas y proveedores; falta desplegarlo y obtener revisión legal.
- [ ] Definir por escrito la relación responsable/encargado entre Doctor Cloud, médicos, clínicas y proveedores; documentar regiones, contratos y plazos de conservación.
- [ ] La NOM-004-SSA3-2012 puede exigir conservar expedientes al menos cinco años desde el último acto médico. Diseñar eliminación/anonimización por tipo de dato sin prometer borrado incompatible con esa obligación.
- [ ] Obtener revision legal del texto aplicable a datos personales sensibles y expedientes clinicos en Mexico. Este checklist no sustituye asesoria legal.

### Coherencia publica de DoctorCloud

- [~] Los precios de prueba menores a $100 quedaron ocultos y sin contratación desde la landing; falta fijar el precio real del plan Esencial en Superadmin y desplegar.
- [~] Los contactos runtime y plantillas quedaron unificados en `soporte@doctorcloud.digital` y se retiró el teléfono ficticio; falta desplegar y confirmar que el buzón está atendido.
- [~] El footer quedó cambiado a `soporte@doctorcloud.digital`; falta desplegar.
- [~] La descripción de videoconsulta ya reconoce que usa un proveedor especializado; falta desplegar.
- [~] Se retiraron “+500 citas”, “sugerencias diagnósticas” y las afirmaciones absolutas de privacidad; falta desplegar.
- [ ] Unificar marca visible: decidir `DoctorCloud` o `Doctor Cloud` para app, tiendas, correos y sitio.

### Calidad funcional minima

- [~] Google Maps ya fue reportado funcional en Android; falta validarlo desde una build firmada de tienda y Play Internal Testing.
- [ ] `BLOQUEADOR` Generar las builds finales desde un commit limpio que contenga todos los cambios aprobados.
- [ ] Probar los dos roles principales con cuentas de revision sin datos reales: paciente y doctor.
- [ ] Corregir contrastes, textos invisibles, fondos pastel y cambios de tema pendientes en claro/oscuro.
- [~] Se retiró del checkout normal el ciclo de suscripción de prueba de `$1` y se sanearon respuestas técnicas de Stripe, PayPal, IA y FCM; falta la regresión visual/runtime completa para descartar otros datos demo o mensajes internos.

## App movil: trabajo transversal

### Configuracion y versiones

- [x] `app.json` declara version `7.0.0`.
- [x] EAS usa versionado remoto y `autoIncrement` en produccion.
- [x] `package.json` y el texto visible de perfil están alineados con la versión pública `7.0.0`.
- [x] Politica definida: version publica `major.minor.patch`; `ios.buildNumber` y `android.versionCode` siempre incrementales mediante versionado remoto y `autoIncrement`.
- [ ] Agregar identificadores de envio a `eas.json` cuando ya existan las apps en ambas consolas, sin guardar secretos en Git.
- [~] `eas.json` ya separa `development`, `dev-client`, `preview` y `production`; falta revisar en EAS que las variables y credenciales estén aisladas por perfil.
- [x] El cliente de produccion usa de forma fija `https://doctorcloud.digital/app/api/mobile`; no hay referencias HTTP/localhost en el codigo distribuible.
- [x] Para 7.0.0 no se habilitarán actualizaciones OTA remotas: `expo-updates` se conserva únicamente para recargar el binario embebido al cambiar apariencia. Canales y `runtimeVersion` se evaluarán después del lanzamiento.
- [~] TestFlight rechazó la build 16 con `ITMS-90683`. La cámara ahora sí tiene una finalidad funcional: escanear los QR de inicio y cierre de citas presenciales, además de las imágenes elegidas explícitamente por el usuario. `NSCameraUsageDescription` y los plugins nativos usan el mismo texto. Falta subir un binario iOS nuevo e inspeccionar el IPA/AAB final.
- [~] `npm audit --omit=dev` quedó en 35 vulnerabilidades transitivas (20 altas, 15 moderadas, 0 críticas). Las correcciones restantes que ofrece npm exigen saltos mayores a Expo 57/React Native 0.86; no usar `--force` en la candidata 7.0.0 y resolverlas en una actualización con regresión completa.

### Permisos

- [x] Ubicacion tiene texto de uso en iOS/Android mediante `expo-location`.
- [x] Antes del primer permiso de ubicación se muestra un aviso destacado que identifica ubicación precisa, finalidad, transferencia al servidor y ausencia de uso en segundo plano/publicidad.
- [~] Fotos/documentos se solicitan solo al iniciar una accion; el texto de Fotos ya es especifico de Doctor Cloud. Falta validarlo en iOS fisico.
- [~] Notificaciones se solicitan mediante Firebase; validar el momento y explicacion al usuario.
- [~] `expo-camera` está habilitado únicamente para leer QR de citas y solicita Cámara al abrir el escáner. Android sigue bloqueando Micrófono y almacenamiento heredado; no permite backups automáticos e iOS rechaza cargas no seguras. Falta probar permiso aceptado, denegado y denegado permanentemente en builds nativas físicas, además de inspeccionar el AAB/IPA final.
- [~] Hay dos códigos distintos: el paciente muestra el QR/código de inicio y el doctor o asistente lo valida para pasar la cita a `in_consultation`; ya iniciada, el paciente genera el QR/código de cierre y el doctor lo valida para pasarla a `completed`. El paciente no puede auto-validar el inicio. Falta la prueba física completa paciente → doctor → API → cita en consulta/completada.
- [ ] Probar cada flujo con permiso aceptado, denegado y denegado permanentemente.

### Autenticacion y sesion

- [ ] Probar registro e inicio por correo en iOS y Android de produccion.
- [ ] Probar Google Sign-In con huellas de desarrollo, EAS y Play App Signing.
- [ ] Probar Sign in with Apple, incluido primer acceso, acceso posterior y correo oculto.
- [ ] Confirmar recuperacion de contrasena desde la app.
- [ ] Confirmar cierre de sesion, borrado seguro del JWT y desregistro del token FCM.
- [ ] Confirmar expiracion/revocacion de JWT en servidor y manejo amigable de 401.
- [ ] Probar cuentas pendientes, suspendidas, eliminadas y sin rol valido.

### Notificaciones FCM/APNs

- [x] No se usa Expo Push como proveedor; el cliente usa Firebase Messaging.
- [x] Firebase tiene aplicaciones web, Android e iOS registradas.
- [~] APNs esta conectado y funciona en TestFlight.
- [~] La API registra tokens FCM por usuario/dispositivo.
- [ ] Probar iOS y Android con app abierta, en segundo plano y cerrada.
- [ ] Probar renovacion de token, reinstalacion, cambio de usuario y cierre de sesion.
- [ ] Confirmar que no aparece push cuando el receptor ya esta dentro de esa misma conversacion.
- [ ] Confirmar badge, sonido, icono, titulo, cuerpo y navegacion al tocar cada tipo de notificacion.
- [~] La migración `database_migration_v70_fcm_token_ownership.sql` elimina tokens Expo y restringe el proveedor a FCM; falta respaldar, aplicarla y verificar conteos en producción.
- [ ] Verificar que los cron de recordatorios realmente corren y registrar ultima ejecucion/resultado.

### Mapas y ubicacion

- [x] iOS funciona con Apple Maps.
- [~] Web funciona con Maps JavaScript API; validar ambas cuentas y ambos temas.
- [ ] `BLOQUEADOR` Habilitar y verificar facturacion del proyecto Google Cloud de DoctorCloud.
- [ ] `BLOQUEADOR` Confirmar `Maps SDK for Android` habilitada.
- [ ] `BLOQUEADOR` Restringir la llave Android a paquete `com.doctorcloud.app`.
- [ ] Agregar SHA-1 del keystore de EAS y SHA-1 de Play App Signing cuando Play genere su certificado.
- [ ] Restringir esa llave solo a las APIs Android realmente necesarias.
- [ ] Probar primero una build EAS firmada y despues el AAB instalado desde Play Internal Testing.
- [ ] Validar busqueda, ubicacion actual, arrastre de marcador, geocodificacion y guardado.
- [ ] Confirmar que las coordenadas nunca se reemplazan por valores por defecto al fallar el mapa.

### Pagos

Estado: `DIFERIDO` por decision actual, pero obligatorio antes de hacer visibles los botones en produccion.

- [~] Se eligió la salida segura para la primera versión: `v78` deshabilita Stripe/PayPal de consultas y los endpoints fallan cerrados si falta configuración. Falta aplicar la migración y comprobar que app/web ya no muestran acciones de pago.
- [ ] Probar Stripe Connect para doctor independiente, onboarding, retorno, refresh y dashboard.
- [ ] Probar pago de consulta con Stripe y PayPal, cancelacion, webhook y conciliacion.
- [~] La cancelacion PayPal movil exige token firmado por intento y el retorno usa `doctorcloud://payment-result`; falta desplegar y probar contra PayPal live.
- [ ] Confirmar que los importes, moneda MXN, comisiones, reembolsos y estados coinciden en app, web y BD.
- [ ] Confirmar que la tienda entiende que se pagan servicios medicos prestados fuera de la app, no contenido digital.
- [~] El escaneo de respuestas retiró mensajes técnicos directos de Stripe/PayPal y no encontró secretos literales en el árbol actual; falta comprobar logs y respuestas reales durante QA live.

### IA y contenido medico

- [~] La app ya muestra avisos de que la IA no reemplaza el criterio profesional en algunas vistas.
- [x] Antes del primer chat o briefing de IA se muestra una autorización separada con los datos clínicos transferidos, proveedor externo, retención y opción de cancelar.
- [~] La API exige un consentimiento vigente y registra su versión mediante `v76`; falta despliegue y prueba autenticada en producción.
- [~] `v78` actualiza únicamente el valor obsoleto/default de Superadmin a `gemini-2.5-flash` y conserva elecciones personalizadas; falta aplicarla y verificar el valor efectivo en producción.
- [ ] Revisar todos los accesos de IA para que no afirmen diagnosticar ni sustituir atencion medica.
- [ ] Mostrar aviso de consultar a un profesional antes de decisiones medicas, especialmente al paciente.
- [~] El aviso local ya documenta Gemini, datos enviados, finalidad y retención; falta desplegarlo, contrastarlo con la configuración efectiva y obtener revisión legal.
- [ ] Evitar enviar mas expediente del necesario y excluir datos sensibles de logs.
- [ ] Preparar explicacion para revision de tiendas sobre el alcance del asistente clinico.

## Google Play

### Cuenta y acceso

- [ ] Confirmar cuenta de desarrollador verificada y tipo de cuenta (organizacion recomendado si corresponde a la empresa).
- [ ] Confirmar nombre, domicilio, telefono y correo publico del desarrollador.
- [ ] Si aplica a una cuenta personal nueva, iniciar cuanto antes prueba cerrada con 12 testers durante 14 dias continuos.
- [ ] Crear la app con paquete definitivo `com.doctorcloud.app`; este valor no podra reutilizarse para otra app.
- [ ] Activar Play App Signing y guardar respaldo de la upload key.

### Binario Android

- [x] Expo SDK 54 declara target/compile SDK 36 segun la documentacion de Expo.
- [ ] Generar `npx eas-cli build --profile production --platform android` para obtener AAB, no APK.
- [ ] Subir primero a Internal Testing y obtener SHA-1 de Play App Signing.
- [ ] Revalidar Maps y Google Sign-In desde la version descargada por Play.
- [ ] Revisar Android Vitals, ANR, crashes y advertencias del pre-launch report.
- [ ] Confirmar compatibilidad en Android 7 minimo y versiones actuales.

### Ficha y declaraciones

- [~] Borrador de nombre, descripciones y categoria Medica preparado en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; falta validacion del propietario de la ficha.
- [x] Matriz detallada preparada en `DECLARACIONES_PRIVACIDAD_SALUD_TIENDAS.md` para Health Apps, Data Safety, permisos sensibles y App Privacy.
- [~] iOS ya usa una variante sin alpha, Android usa fondo adaptativo sólido y existe `assets/store/play-feature-graphic-1024x500.png`; faltan build nativa y capturas reales sin datos personales.
- [x] Correo, web y URL pública de privacidad definidos y accesibles.
- [x] URL pública de eliminación de cuenta accesible.
- [ ] Declaracion de anuncios: actualmente deberia ser “no contiene anuncios”, si se confirma.
- [ ] Acceso a la app: entregar cuentas e instrucciones para paciente y doctor.
- [ ] Publico objetivo y contenido; evitar seleccionar menores si el producto no esta preparado para ellos.
- [ ] Cuestionario de clasificacion de contenido.
- [~] Borrador de Data safety preparado en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; falta validarlo contra produccion, SDKs y revision legal.
- [~] Declaracion de salud preparada con tres categorias: Healthcare Services and Management, Medication and Treatment Management y Clinical Decision Support. Falta capturarla en Play Console.
- [x] La descripción propuesta incluye el aviso exigido: no es dispositivo médico, no diagnostica/trata/cura/previene y se debe consultar a un profesional.
- [ ] Declaracion de funciones financieras; declarar con precision el procesamiento de pagos si queda visible.
- [ ] Verificar politicas de permisos sensibles despues de subir el AAB.
- [ ] Notas de version en espanol.

## App Store

### Cuenta y configuracion

- [x] Bundle ID `com.doctorcloud.app`.
- [x] Aplicacion iOS registrada en Firebase y archivo `GoogleService-Info.plist` presente.
- [x] Sign in with Apple declarado e implementado.
- [x] Push Notifications/APNs funcional en TestFlight.
- [ ] Confirmar Apple Developer Program activo, contratos vigentes y roles correctos.
- [ ] `BLOQUEADOR` Confirmar cuenta Organization/legal entity; una cuenta individual supone un riesgo directo bajo la guía de apps sanitarias con información sensible.
- [ ] Confirmar que la app 7.0.0 existe en App Store Connect y que build 11 esta procesada sin advertencias.
- [~] El perfil de producción quedó fijado a la imagen EAS `macos-sequoia-15.6-xcode-26.0`; falta generar y procesar el nuevo binario.
- [ ] Completar las preguntas nuevas de clasificacion por edad vigentes desde 2026.
- [ ] Si se distribuye en UE, completar y verificar estado de comerciante DSA.

### Ficha y revision

- [~] Borrador de nombre, subtitulo, descripcion, palabras clave, categoria Medica y copyright preparado en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`.
- [ ] URL de soporte publica con contacto real.
- [x] URL de política de privacidad pública y accesible.
- [~] Borrador de App Privacy y proveedores preparado en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; falta validacion legal y de produccion.
- [x] Matriz campo por campo de App Privacy preparada en `DECLARACIONES_PRIVACIDAD_SALUD_TIENDAS.md`.
- [~] Guion de capturas preparado en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; faltan capturas reales para los tamanos de iPhone solicitados.
- [x] La versión 7.0.0 será solo iPhone (`supportsTablet: false`). iPad se evaluará después de revisar interfaz y capturas específicas.
- [~] Borrador de notas de revision preparado en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; completar flujo de pagos visible en la build candidata.
- [~] Plantilla de cuentas de revision preparada; faltan dos cuentas funcionales con datos ficticios.
- [ ] Mantener backend, correos y cuentas de revision activos durante todo el proceso.
- [ ] Probar restauracion de acceso con Apple y eliminacion/revocacion de cuenta.
- [ ] Generar y subir la build posterior a iOS build 16; confirmar que App Store Connect ya no reporta `ITMS-90683`.
- [ ] Enviar primero a TestFlight interno/externo y despues a App Review.

## Inventario inicial para privacidad y seguridad de datos

Este inventario debe confirmarse contra produccion antes de llenar Apple App Privacy y Google Data Safety.

| Tipo de dato | Uso esperado | Sistemas/terceros a revisar |
|---|---|---|
| Nombre, correo, telefono y foto | Cuenta, identidad y contacto | Backend, Google, Apple |
| Fecha de nacimiento, genero y ocupacion | Perfil del paciente | Backend |
| Datos vitales, antecedentes, notas y recetas | Atencion y expediente clinico | Backend, doctor autorizado, IA cuando se invoque |
| Documentos y fotografias | Expediente y soporte | Backend/almacenamiento |
| Mensajes y contenido de chat | Comunicacion doctor-paciente | Backend, FCM para aviso limitado |
| Ubicacion y direccion | Busqueda cercana y consultorios | Backend, Google Maps/Apple Maps |
| Identificadores de cuenta, dispositivo y push | Sesion, seguridad y notificaciones | Backend, Firebase/APNs |
| Citas y actividad de consulta | Agenda, recordatorios y operacion | Backend |
| Importes, estados y referencias de pago | Cobro y conciliacion | Backend, Stripe, PayPal |
| Solicitudes de soporte y adjuntos | Atencion de incidencias | Backend/equipo de soporte |
| Logs tecnicos | Seguridad y diagnostico | Servidor; confirmar que no contengan expediente ni secretos |

Para cada fila falta definir:

- [ ] Si se recopila, comparte, vincula a identidad y/o usa para seguimiento.
- [ ] Base y finalidad de tratamiento.
- [ ] Plazo de retencion y proceso de eliminacion/anonimizacion.
- [ ] Cifrado en transito y reposo.
- [ ] Roles internos que pueden acceder.
- [ ] Proveedor, region de almacenamiento y contrato aplicable.

## Backend, API movil y base de datos

### Produccion y secretos

- [~] El árbol web actual ya no contiene coincidencias de llaves privadas/API/Stripe; `Config.php`, FCM y `.p8` están ignorados. Los identificadores públicos Firebase/Maps permanecen en los binarios móviles y deben restringirse en consola.
- [~] `migrations/database.sql` ya fue retirado del árbol actual y el README exige un export sólo de estructura; falta purgar su historial Git coordinadamente.
- [ ] Documentar en un inventario privado donde vive cada secreto, propietario, fecha de rotacion y recuperacion.
- [ ] Confirmar permisos del archivo de cuenta de servicio FCM y que no sea descargable por HTTP.
- [ ] `BLOQUEADOR` Rotar PayPal/Stripe/Google y cualquier otro valor expuesto, y purgar el historial Git: retirar los valores del árbol actual no invalida copias históricas.
- [~] Producción redirige HTTP a HTTPS y expone HSTS/CSP/X-Frame-Options/nosniff; falta auditar certificado y configuración TLS con una herramienta externa completa.
- [~] Login web/móvil y verificación social comparten bloqueo por IP; IA aplica límites por usuario. Faltan límites específicos para registro, recuperación, soporte y archivos, más pruebas de 429.
- [~] El backend local ya acepta requests nativos sin `Origin`, permite sólo los orígenes DoctorCloud configurados y bloquea preflight desconocido; producción aún devolvió `Access-Control-Allow-Origin: *`, por lo que falta desplegar y repetir la prueba.
- [~] Se retiraron mensajes técnicos directos de Stripe, PayPal, IA, FCM y operaciones de citas; falta ejecutar una matriz runtime de errores 4xx/5xx y revisar todos los endpoints en producción.

### Integridad y autorizacion

- [ ] Probar autorizacion objeto por objeto: un paciente no puede ver otro expediente y un doctor solo ve pacientes vinculados.
- [~] El aislamiento usa `doctor_profiles.hospital_license_id` y `patient_profiles.hospital_license_id` como fuente canónica. Directorios, citas, chats, notas y recetas ya filtran por clínica/independiente y las acciones directas críticas vuelven a validar el ámbito. Falta ejecutar la matriz física con dos clínicas, un doctor independiente, pacientes de cada ámbito, asistentes, hospital admin y superadmin.
- [~] Los flujos de carga revisados aplican `finfo`, límites de tamaño, extensiones permitidas y nombres generados/saneados; falta probar archivos maliciosos y casos límite contra cada endpoint desplegado.
- [~] Producción ya devuelve 403 en rutas físicas privadas y 401 a enlaces firmados inválidos; falta ejecutar la matriz con usuarios autorizados/no autorizados y archivos reales.
- [ ] Probar idempotencia de webhooks y endpoints de confirmacion de pago.
- [ ] Revisar que bajas de cuenta no rompan integridad contable ni clinica.

### Operacion

- [ ] Respaldar BD y archivos antes de migraciones de lanzamiento.
- [ ] Confirmar que produccion tiene todas las migraciones requeridas, incluidas FCM, sesiones activas de chat, mapas y Apple Sign-In.
- [ ] Ejecutar una restauracion de prueba, no solo comprobar que existe un backup.
- [~] Existe `/superadmin/system-health`, protegido por sesión superadmin, para BD/migraciones, correo, FCM, almacenamiento, Apple y pasarelas sin exponer secretos. Falta desplegarlo, probar 200/503 y conectarlo al monitoreo.
- [ ] Registrar ultima ejecucion, duracion y resultado de cron jobs.
- [ ] Configurar alertas por fallas de cron, webhooks, FCM, correo y errores 5xx.
- [ ] Definir retencion y sanitizacion de logs.
- [ ] Preparar procedimiento de rollback de codigo y migraciones compatibles hacia atras.

## Sitio web completo

### Legal, confianza y contenido

- [~] Privacidad, términos y eliminación de cuenta ya están publicados; falta desplegar en la landing el footer con el contacto y los enlaces.
- [~] Precios de prueba, correos/teléfono ficticios y afirmaciones no verificadas quedaron retirados de la landing local; falta desplegar y repetir el escaneo público.
- [~] La landing y los textos legales locales explican que DoctorCloud facilita gestión/comunicación y que la IA no sustituye criterio profesional ni emergencias; falta desplegar.
- [ ] Indicar claramente quien presta el servicio medico y quien procesa el pago.
- [ ] Revisar cookies y tecnologias de terceros; mostrar consentimiento si legalmente corresponde.
- [~] Los enlaces legales ya están en landing, autenticación y perfiles locales; falta desplegar la landing y verificar navegación con ambos roles.

### Flujos web

- [ ] Probar registro/login/recuperacion con correo y Google.
- [ ] Probar perfiles paciente y doctor en escritorio, tablet y movil.
- [ ] Probar mapas de paciente y doctor con la llave web restringida por referrer.
- [ ] Probar agenda, citas, chat, presencia, documentos, recetas, notas, IA, notificaciones y soporte.
- [ ] Probar Stripe Connect y pagos solo cuando se retome la fase live.
- [ ] Confirmar que errores web no muestran claves, IDs internos ni trazas.
- [ ] Ejecutar revision de accesibilidad basica: teclado, foco, labels, contraste y zoom.
- [ ] Confirmar pagina 404 y estados vacios utiles.

### Integracion app-web

- [ ] Mantener contratos de API compatibles con la version 7.0.0.
- [ ] Versionar cambios destructivos de API antes de publicar clientes que no se puedan actualizar de inmediato.
- [~] El retorno PayPal movil ya usa el esquema `doctorcloud`; faltan prueba nativa y validacion de los demas enlaces.
- [ ] Decidir si se implementaran Universal Links/App Links. Si se usan, publicar `apple-app-site-association` y `assetlinks.json`.
- [ ] Confirmar que los enlaces compartidos de doctores tienen fallback web funcional.

## Matriz minima de QA de lanzamiento

Ejecutar en la build candidata, no en Expo Go.

| Flujo | iPhone | Android EAS | Android desde Play | Web movil | Web escritorio |
|---|---:|---:|---:|---:|---:|
| Registro/login correo | [ ] | [ ] | [ ] | [ ] | [ ] |
| Google Sign-In | [ ] | [ ] | [ ] | [ ] | [ ] |
| Sign in with Apple | [ ] | N/A | N/A | [ ] si se ofrece | [ ] si se ofrece |
| Perfil paciente | [ ] | [ ] | [ ] | [ ] | [ ] |
| Perfil doctor | [ ] | [ ] | [ ] | [ ] | [ ] |
| Tema claro/oscuro/sistema | [ ] | [ ] | [ ] | [ ] | [ ] |
| Mapa y ubicacion | [ ] | [ ] | [ ] | [ ] | [ ] |
| Buscar doctor/agendar | [ ] | [ ] | [ ] | [ ] | [ ] |
| Chat y push | [ ] | [ ] | [ ] | [ ] | [ ] |
| Documentos/recetas/notas | [ ] | [ ] | [ ] | [ ] | [ ] |
| IA y avisos clinicos | [ ] | [ ] | [ ] | [ ] | [ ] |
| Soporte | [ ] | [ ] | [ ] | [ ] | [ ] |
| Eliminacion de cuenta | [ ] | [ ] | [ ] | [ ] | [ ] |
| Pagos, si quedan visibles | [ ] | [ ] | [ ] | [ ] | [ ] |

Tambien probar:

- [ ] Red lenta, sin conexion, timeout, respuesta 401, 403, 422, 429 y 500.
- [ ] App abierta, segundo plano, terminada y reiniciada.
- [ ] Teclado, textos largos, nombres largos y tamanos de fuente del sistema.
- [ ] Dispositivo pequeno y dispositivo moderno grande.
- [ ] Zona horaria, cambio de dia y horarios cercanos a medianoche.
- [ ] Datos vacios, muchos registros y paginacion.
- [ ] Cierre de sesion y cambio entre cuentas en un mismo dispositivo.

## Material de tienda por preparar

- [~] Nombre y tagline tienen borrador en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; falta resolver la grafía final `DoctorCloud`/`Doctor Cloud`.
- [~] Descripciones corta y larga en español están preparadas en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; falta aprobación del propietario y contraste final con producción.
- [~] Palabras clave de App Store están propuestas en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; falta validarlas en App Store Connect.
- [~] Iconos finales sin transparencia/cuadrícula preparados; falta verificarlos en AAB/IPA nuevos.
- [x] Feature graphic de Google Play 1024 x 500 generado de forma reproducible con el logotipo original sobre fondo blanco.
- [ ] Capturas de paciente y doctor con datos ficticios consistentes.
- [ ] Video opcional solo si muestra el producto real.
- [ ] URL de soporte, privacidad y eliminacion.
- [ ] Correo y telefono atendidos.
- [~] Existe un borrador de notas de revisión y plantilla de cuentas; faltan credenciales reales de revisión y completar los pasos según la build candidata.
- [ ] Credenciales de revision con vigencia amplia y sin 2FA bloqueante.
- [~] Existe un borrador de notas de versión 7.0.0 en `METADATOS_TIENDAS_DOCTOR_CLOUD.md`; falta aprobación final.

## Orden recomendado de ejecucion

### Fase 1: cerrar riesgos y politicas

- [ ] Rotar/mover secreto de cron.
- [~] Privacidad, términos y solicitud de eliminación existen en web/API/app; falta despliegue completo, revocación Apple real, procesamiento final y revisión legal.
- [~] Contenido público, precios de prueba y contactos están corregidos localmente; falta despliegue y verificación pública.
- [~] Mapa Android está implementado y reportado funcional; falta AAB firmado, restricciones/SHA-1 y prueba desde Play.
- [~] México, responsable y alcance inicial están definidos; faltan decisión UE, tratamiento verificable de menores y matriz legal de retención.

### Fase 2: estabilizar producto

- [ ] Terminar modo oscuro/claro y regresiones visuales.
- [ ] Cerrar auth, push, mapas, chat, documentos, IA y soporte.
- [x] Mantener SDK 54 y `expo-updates` actuales para 7.0.0; migrar a SDK 56
  como regresion separada despues del primer lanzamiento.
- [~] Pasaron validaciones estáticas, rutas físicas privadas y pruebas aisladas de firma/CORS; falta la matriz autenticada por objeto y por rol en producción.
- [ ] Congelar cambios funcionales.

### Fase 3: candidato de lanzamiento

- [ ] Commit/tag limpio y changelog.
- [ ] Backup y migraciones de produccion.
- [ ] Build iOS de produccion y build Android AAB de produccion.
- [ ] TestFlight e Internal Testing de Play.
- [ ] QA completa sobre binarios distribuidos por las tiendas.

### Fase 4: fichas y declaraciones

- [ ] App Privacy y Google Data Safety.
- [ ] Declaraciones de salud, finanzas, anuncios, publico y clasificacion.
- [ ] Capturas, textos, URLs y cuentas de revision.
- [ ] Prueba cerrada de 12 testers/14 dias si aplica.

### Fase 5: envio y operacion

- [ ] Enviar primero una tienda y mantener margen para responder observaciones.
- [ ] No cambiar backend de forma incompatible durante la revision.
- [ ] Monitorear errores, FCM, correo, cron, webhooks y soporte.
- [ ] Lanzamiento gradual en Play; evaluar liberacion manual en App Store.
- [ ] Preparar version 7.0.1 para correcciones rapidas.

## Definicion de terminado

DoctorCloud esta listo para enviar solo cuando:

- [ ] No queda ningun elemento `BLOQUEADOR` abierto.
- [ ] Privacidad, terminos, soporte y eliminacion estan publicados y enlazados.
- [ ] Android Maps funciona desde la version instalada por Play.
- [ ] Push funciona en ambos sistemas en los tres estados de app.
- [ ] La build candidata corresponde exactamente al commit aprobado.
- [ ] Paciente y doctor completan los flujos principales sin datos reales ni accesos especiales.
- [ ] Las declaraciones de datos coinciden con codigo, backend y terceros.
- [ ] La web no muestra precios de prueba, contactos inconsistentes ni afirmaciones falsas.
- [ ] Existen backup restaurable, monitoreo, rollback y responsables de soporte.
- [ ] App Store Connect y Play Console no muestran tareas obligatorias pendientes.

## Primer bloque de trabajo propuesto

Al aprobar este checklist, comenzar en este orden:

1. Seguridad del cron y secretos del servidor.
2. Privacidad, terminos y eliminacion de cuenta en web/API/app.
3. Correcciones de landing publica.
4. Diagnostico final de Maps Android con build firmada.
5. QA y cierre visual de la app.
6. AAB/TestFlight finales, fichas y declaraciones.

## Fuentes oficiales consultadas

- Expo SDK 56 y compatibilidad: <https://docs.expo.dev/versions/v56.0.0/>
- EAS Build: <https://docs.expo.dev/build/setup/>
- EAS Submit: <https://docs.expo.dev/deploy/submit-to-app-stores/>
- Requisitos vigentes de Apple: <https://developer.apple.com/news/upcoming-requirements/>
- App Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- App Privacy: <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/>
- Apps de salud y requisito de entidad legal en Apple: <https://developer.apple.com/health-fitness/>
- Declaracion de dispositivo medico regulado en Apple: <https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status>
- Eliminacion de cuenta en Apple: <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Target API de Google Play: <https://developer.android.com/google/play/requirements/target-sdk>
- Preparar app para revision en Play: <https://support.google.com/googleplay/android-developer/answer/9859455>
- Data Safety: <https://support.google.com/googleplay/android-developer/answer/10787469>
- Eliminacion de cuenta en Google Play: <https://support.google.com/googleplay/android-developer/answer/13327111>
- Declaracion de apps de salud: <https://support.google.com/googleplay/android-developer/answer/14738291>
- Politica de salud: <https://support.google.com/googleplay/android-developer/answer/16679511>
- Prueba cerrada para cuentas personales nuevas: <https://support.google.com/googleplay/android-developer/answer/14151465>
- LFPDPPP vigente: <https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf>
- NOM-004-SSA3-2012 vigente: <https://platiica.economia.gob.mx/normalizacion/nom-004-ssa3-2012/>
