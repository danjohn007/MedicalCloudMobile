# Checklist maestro de lanzamiento de DoctorCloud

Fecha de auditoria inicial: 22 de julio de 2026  
Ultima actualizacion tecnica: 27 de julio de 2026
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
| iOS | Build de produccion 7.0.0 (build 15) terminada el 27/07/2026; corresponde al commit `aef24c5`, anterior a los cambios actuales | `[~]` |
| Android | Builds recientes son APK de desarrollo; falta confirmar un AAB final de produccion | `[ ]` |
| Salud del proyecto | `npx expo-doctor`: 18/18 validaciones correctas | `[x]` |
| Calidad estatica | TypeScript, lint y exportación web de 62 rutas pasaron el 27/07/2026 sin advertencias | `[x]` |
| Icono iOS | PNG 1024 x 1024 presente, pero conserva canal alfa/transparencia | `[ ] BLOQUEADOR de asset` |
| Iconos Android | Assets adaptativos presentes; el fondo actual contiene una guía/cuadrícula visible y debe reemplazarse | `[ ] BLOQUEADOR de asset` |
| Push iOS | FCM/APNs ya probado en TestFlight | `[x]` |
| Push Android | Implementacion FCM nativa presente; falta prueba de la build final | `[~]` |
| Mapa iOS | Funciona con Apple Maps | `[x]` |
| Mapa web | Reportado funcionando | `[~]` |
| Mapa Android | Reportado funcional tras ajustar Google Cloud; falta validarlo en AAB firmado/Play Internal Testing | `[~]` |
| Login social | Google nativo y Sign in with Apple implementados | `[~]` |
| Web publica | HTTPS y landing activa | `[x]` |
| Privacidad/terminos/eliminacion | Las tres URLs públicas responden 200; la app las enlaza desde autenticación y perfiles | `[~] Falta revisión legal` |
| Eliminacion de cuenta en app | Flujo, endpoint y migracion v70 preparados; la migracion ya fue aplicada y falta prueba de produccion/build final | `[~]` |
| Acceso doctor por suscripcion | Backend y app exigen suscripcion activa con `has_app=1` y bloquean modulos por plan; falta desplegar y probar con cuentas de cada plan | `[~]` |
| Build contra cambios actuales | Hay cambios locales posteriores a las builds de EAS | `[ ] BLOQUEADOR` |
| Acceso público sin cuenta | La app permite explorar el directorio y detalle de doctores; para agendar o usar datos privados exige iniciar sesión | `[x]` |

## Decisiones que deben definirse primero

Estas decisiones evitan rehacer fichas, textos legales y pantallas despues.

- [x] Responsable legal definido: Dan Jonathan Raso Rios. Falta verificar que el nombre publico de cada cuenta de tienda coincida.
- [x] Lanzamiento inicial definido: Mexico.
- [~] Se admitiran menores; el diseno tecnico esta en `DISENO_CONSENTIMIENTO_MENORES.md` y falta implementar consentimiento verificable de madre, padre o tutor antes de publicar para ese publico.
- [x] La app y los metadatos se presentarán como plataforma de gestión y servicios médicos, no como dispositivo médico, servicio de emergencias ni sustituto de un profesional.
- [x] Correo oficial definido: `soporte@doctorcloud.digital`.
- [x] Responsable de privacidad y domicilio definidos; falta revision legal del texto final.
- [~] Solicitud de eliminacion con plazo operativo de 30 dias definida; falta documentar la retencion clinica, contable y las excepciones legales con revision profesional.
- [ ] Decidir si pagos estaran visibles en la primera version. Si no estan en modo real y totalmente probados, ocultar sus acciones en produccion.
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

### Privacidad, terminos y eliminacion de cuenta

- [~] Aviso integral publicado en `https://doctorcloud.digital/app/privacidad` con responsable, contacto, datos clínicos, proveedores, derechos ARCO y retención; falta revisión legal.
- [~] Términos publicados en `https://doctorcloud.digital/app/terminos` para pacientes, doctores, menores, IA, pagos y proveedores; falta revisión legal.
- [~] Recurso web publicado en `https://doctorcloud.digital/app/eliminar-cuenta` con canal de solicitud y aviso de verificación de identidad; falta confirmar que el correo de soporte está atendido.
- [~] La app ya incluye una opcion visible para solicitar la eliminacion de cuenta en ambos perfiles; falta desplegarla y probarla desde builds de tienda.
- [~] API y migracion `v70` preparadas para solicitar/cancelar eliminacion; falta ejecutar la migracion y desplegar el backend.
- [~] La solicitud desactiva la cuenta, bloquea sus JWT por estado y desregistra tokens FCM; falta validar en produccion y completar la revocacion de Apple.
- [ ] Para cuentas Apple, implementar revocacion del token de Sign in with Apple.
- [ ] Eliminar o anonimizar datos que no deban conservarse y documentar claramente las excepciones clinicas/legales.
- [~] La app confirma la solicitud y cierra sesion; falta definir el plazo legal y enviar la confirmacion por correo.
- [~] Privacidad y términos están enlazados desde login/registro y desde los perfiles de paciente y doctor. También quedaron preparados en el pie de la landing; falta desplegar ese cambio web.
- [~] El registro móvil ya exige aceptaciones separadas para términos/privacidad, datos sensibles y mayoría de edad/tutor; la API guarda versión, usuario, canal y fecha mediante la migración `v76`. Falta desplegar migración, backend y build en ese orden y probarlos.
- [ ] Archivar una copia inmutable del texto exacto de cada versión de términos, privacidad y aviso de IA; el identificador guardado en `v76` sólo es útil si puede reconstruirse qué aceptó la persona.
- [~] El aviso público ya describe los datos clínicos enviados a Gemini, retención de solicitudes/respuestas y proveedores; falta desplegarlo y obtener revisión legal.
- [ ] Definir por escrito la relación responsable/encargado entre Doctor Cloud, médicos, clínicas y proveedores; documentar regiones, contratos y plazos de conservación.
- [ ] La NOM-004-SSA3-2012 puede exigir conservar expedientes al menos cinco años desde el último acto médico. Diseñar eliminación/anonimización por tipo de dato sin prometer borrado incompatible con esa obligación.
- [ ] Obtener revision legal del texto aplicable a datos personales sensibles y expedientes clinicos en Mexico. Este checklist no sustituye asesoria legal.

### Coherencia publica de DoctorCloud

- [~] Los precios de prueba menores a $100 quedaron ocultos y sin contratación desde la landing; falta fijar el precio real del plan Esencial en Superadmin y desplegar.
- [ ] Unificar correos `@doctorcloud.digital`; actualmente conviven `@doctorcloud.com`, `@doctorcloud.digital` y `@idactivos.digital`.
- [~] El footer quedó cambiado a `soporte@doctorcloud.digital`; falta desplegar.
- [~] La descripción de videoconsulta ya reconoce que usa un proveedor especializado; falta desplegar.
- [~] Se retiraron “+500 citas”, “sugerencias diagnósticas” y las afirmaciones absolutas de privacidad; falta desplegar.
- [ ] Unificar marca visible: decidir `DoctorCloud` o `Doctor Cloud` para app, tiendas, correos y sitio.

### Calidad funcional minima

- [~] Google Maps ya fue reportado funcional en Android; falta validarlo desde una build firmada de tienda y Play Internal Testing.
- [ ] `BLOQUEADOR` Generar las builds finales desde un commit limpio que contenga todos los cambios aprobados.
- [ ] Probar los dos roles principales con cuentas de revision sin datos reales: paciente y doctor.
- [ ] Corregir contrastes, textos invisibles, fondos pastel y cambios de tema pendientes en claro/oscuro.
- [ ] Confirmar que no hay errores, datos demo, fechas futuras de prueba ni mensajes tecnicos visibles al usuario.

## App movil: trabajo transversal

### Configuracion y versiones

- [x] `app.json` declara version `7.0.0`.
- [x] EAS usa versionado remoto y `autoIncrement` en produccion.
- [x] `package.json` y el texto visible de perfil están alineados con la versión pública `7.0.0`.
- [x] Politica definida: version publica `major.minor.patch`; `ios.buildNumber` y `android.versionCode` siempre incrementales mediante versionado remoto y `autoIncrement`.
- [ ] Agregar identificadores de envio a `eas.json` cuando ya existan las apps en ambas consolas, sin guardar secretos en Git.
- [ ] Separar claramente perfiles `development`, `preview` y `production` y sus variables de entorno.
- [x] El cliente de produccion usa de forma fija `https://doctorcloud.digital/app/api/mobile`; no hay referencias HTTP/localhost en el codigo distribuible.
- [x] Para 7.0.0 no se habilitarán actualizaciones OTA remotas: `expo-updates` se conserva únicamente para recargar el binario embebido al cambiar apariencia. Canales y `runtimeVersion` se evaluarán después del lanzamiento.
- [~] TestFlight rechazó la build 16 con `ITMS-90683` porque `expo-image-picker` referencia cámara aunque el flujo no la solicite. `NSCameraUsageDescription` ya quedó declarado tanto en `ios.infoPlist` como en el plugin; la introspección nativa lo confirma. Android mantiene Cámara, Micrófono y almacenamiento heredado bloqueados. Falta subir un binario iOS nuevo e inspeccionar el IPA/AAB final.
- [~] `npm audit --omit=dev` quedó en 35 vulnerabilidades transitivas (20 altas, 15 moderadas, 0 críticas). Las correcciones restantes que ofrece npm exigen saltos mayores a Expo 57/React Native 0.86; no usar `--force` en la candidata 7.0.0 y resolverlas en una actualización con regresión completa.

### Permisos

- [x] Ubicacion tiene texto de uso en iOS/Android mediante `expo-location`.
- [x] Antes del primer permiso de ubicación se muestra un aviso destacado que identifica ubicación precisa, finalidad, transferencia al servidor y ausencia de uso en segundo plano/publicidad.
- [~] Fotos/documentos se solicitan solo al iniciar una accion; el texto de Fotos ya es especifico de Doctor Cloud. Falta validarlo en iOS fisico.
- [~] Notificaciones se solicitan mediante Firebase; validar el momento y explicacion al usuario.
- [~] El manifiesto Android generado omite Cámara, Micrófono y almacenamiento heredado; se eliminó `expo-camera`, Android no permite backups automáticos e iOS rechaza cargas no seguras. iOS conserva el texto obligatorio de cámara por la referencia de `expo-image-picker`. Falta comprobar el AAB/IPA final.
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
- [ ] Limpiar de la base los tokens Expo heredados despues de respaldo; conservar `mobile_push_tokens` para FCM.
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

- [ ] Elegir una de dos salidas: credenciales live y flujo completo, o funciones de pago ocultas/deshabilitadas.
- [ ] Probar Stripe Connect para doctor independiente, onboarding, retorno, refresh y dashboard.
- [ ] Probar pago de consulta con Stripe y PayPal, cancelacion, webhook y conciliacion.
- [ ] Confirmar que los importes, moneda MXN, comisiones, reembolsos y estados coinciden en app, web y BD.
- [ ] Confirmar que la tienda entiende que se pagan servicios medicos prestados fuera de la app, no contenido digital.
- [ ] No incluir tarjetas, cuentas bancarias ni secretos de pasarela en logs o respuestas de API.

### IA y contenido medico

- [~] La app ya muestra avisos de que la IA no reemplaza el criterio profesional en algunas vistas.
- [x] Antes del primer chat o briefing de IA se muestra una autorización separada con los datos clínicos transferidos, proveedor externo, retención y opción de cancelar.
- [~] La API exige un consentimiento vigente y registra su versión mediante `v76`; falta despliegue y prueba autenticada en producción.
- [ ] `BLOQUEADOR` Actualizar en Superadmin la configuracion global de IA a `gemini-2.5-flash`: el export actual aun contiene `gemini-2.0-flash`, que invalida el cambio hecho en el archivo de configuracion.
- [ ] Revisar todos los accesos de IA para que no afirmen diagnosticar ni sustituir atencion medica.
- [ ] Mostrar aviso de consultar a un profesional antes de decisiones medicas, especialmente al paciente.
- [ ] Documentar proveedor, datos enviados, retencion y controles de privacidad en el aviso de privacidad.
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
- [ ] El icono maestro actual tiene transparencia y el fondo adaptativo Android conserva una cuadrícula; deben corregirse antes de exportar Play 512 x 512. También faltan feature graphic 1024 x 500 y capturas reales sin datos personales.
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

- [ ] Mantener `Config.php`, llaves Firebase, Stripe, PayPal y Apple fuera de Git.
- [ ] Documentar en un inventario privado donde vive cada secreto, propietario, fecha de rotacion y recuperacion.
- [ ] Confirmar permisos del archivo de cuenta de servicio FCM y que no sea descargable por HTTP.
- [ ] Rotar cualquier secreto que haya aparecido en codigo, capturas, tickets o logs.
- [ ] Confirmar TLS valido, redireccion HTTPS y headers de seguridad.
- [ ] Revisar rate limiting en login, registro, recuperacion, IA, soporte y endpoints de archivos.
- [ ] Revisar CORS y rechazar origenes no necesarios.
- [ ] Evitar stack traces, SQL, rutas internas y secretos en respuestas de produccion.

### Integridad y autorizacion

- [ ] Probar autorizacion objeto por objeto: un paciente no puede ver otro expediente y un doctor solo ve pacientes vinculados.
- [ ] Probar aislamiento entre doctor independiente, asistentes, clinicas y superadmin.
- [ ] Validar MIME, extension, tamano y nombre de archivos subidos.
- [ ] Confirmar que archivos clinicos no se pueden enumerar ni abrir sin autorizacion.
- [ ] Probar idempotencia de webhooks y endpoints de confirmacion de pago.
- [ ] Revisar que bajas de cuenta no rompan integridad contable ni clinica.

### Operacion

- [ ] Respaldar BD y archivos antes de migraciones de lanzamiento.
- [ ] Confirmar que produccion tiene todas las migraciones requeridas, incluidas FCM, sesiones activas de chat, mapas y Apple Sign-In.
- [ ] Ejecutar una restauracion de prueba, no solo comprobar que existe un backup.
- [ ] Crear health check privado para BD, correo, Firebase, almacenamiento y pasarelas.
- [ ] Registrar ultima ejecucion, duracion y resultado de cron jobs.
- [ ] Configurar alertas por fallas de cron, webhooks, FCM, correo y errores 5xx.
- [ ] Definir retencion y sanitizacion de logs.
- [ ] Preparar procedimiento de rollback de codigo y migraciones compatibles hacia atras.

## Sitio web completo

### Legal, confianza y contenido

- [~] Privacidad, términos y eliminación de cuenta ya están publicados; falta desplegar en la landing el footer con el contacto y los enlaces.
- [ ] Corregir precios, correos, telefonos ficticios y afirmaciones no verificadas.
- [ ] Explicar que DoctorCloud facilita gestion y comunicacion; no sustituye una emergencia ni el criterio medico.
- [ ] Indicar claramente quien presta el servicio medico y quien procesa el pago.
- [ ] Revisar cookies y tecnologias de terceros; mostrar consentimiento si legalmente corresponde.
- [ ] Agregar enlaces legales visibles en landing, registro, login y area autenticada.

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
- [ ] Confirmar que enlaces de correo, Stripe, PayPal y soporte regresan a la vista correcta.
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

- [ ] Nombre oficial y tagline coherente.
- [ ] Descripcion corta y larga en espanol.
- [ ] Palabras clave de App Store.
- [ ] `BLOQUEADOR` Iconos finales sin transparencias ni la cuadrícula visible del asset adaptativo actual.
- [ ] Feature graphic de Google Play.
- [ ] Capturas de paciente y doctor con datos ficticios consistentes.
- [ ] Video opcional solo si muestra el producto real.
- [ ] URL de soporte, privacidad y eliminacion.
- [ ] Correo y telefono atendidos.
- [ ] Notas de revision con pasos para probar cada rol.
- [ ] Credenciales de revision con vigencia amplia y sin 2FA bloqueante.
- [ ] Notas de version 7.0.0.

## Orden recomendado de ejecucion

### Fase 1: cerrar riesgos y politicas

- [ ] Rotar/mover secreto de cron.
- [ ] Implementar privacidad, terminos y eliminacion de cuenta en web/API/app.
- [ ] Corregir contenido publico, precios y contactos.
- [ ] Resolver mapa Android.
- [ ] Definir publico, paises, titular legal y retencion de datos.

### Fase 2: estabilizar producto

- [ ] Terminar modo oscuro/claro y regresiones visuales.
- [ ] Cerrar auth, push, mapas, chat, documentos, IA y soporte.
- [ ] Decidir SDK 54/56 y `expo-updates`.
- [ ] Ejecutar pruebas de autorizacion y seguridad del backend.
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
