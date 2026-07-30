# Implementacion segura de bloqueadores de lanzamiento

Fecha de inicio: 30 de julio de 2026

Este documento registra cambios comprobables en `MedicalCloudMobile` y
`MedicalUniverse`. Un cambio marcado como implementado en codigo no se considera
resuelto en produccion hasta desplegarlo y ejecutar la prueba indicada.

## Leyenda

- `IMPLEMENTADO`: cambio terminado en el repositorio y con validacion estatica.
- `PENDIENTE RUNTIME`: falta desplegar o probar con cuentas/dispositivos reales.
- `BLOQUEADO`: requiere una decision legal, credencial o consola externa.
- `NO INICIADO`: todavia no se modifico.

## 0. Estado revalidado antes de implementar

- Al iniciar el segundo escaneo, `MedicalUniverse` y `MedicalCloudMobile`
  estaban limpios y alineados con sus ramas remotas.
- No había cambios sin commit remanentes de GitHub Desktop.
- Sí existía un handoff antiguo pero rastreado en
  `tmp_medicaluniverse_backend/`; se contrastó contra el backend real antes de
  retirarlo y todas sus funciones ya estaban integradas.
- Los cambios enumerados debajo son locales a esta fase. No se desplegó nada,
  no se reescribió el historial y no se revirtieron archivos ajenos.

## 1. Archivos clinicos y adjuntos de soporte

Estado: `IMPLEMENTADO / PENDIENTE RUNTIME`

Cambios:

- Apache devuelve 404 para acceso fisico directo bajo
  `storage/uploads/documents/` y `storage/uploads/support/`.
- Los archivos publicos de fotos, logos y avatares conservan su comportamiento.
- La web transmite documentos mediante endpoints con sesion y autorizacion por
  objeto para paciente, doctor, asistente y superadmin.
- Los adjuntos de soporte se autorizan contra propietario del ticket,
  superadmin o licencia de hospital.
- La API movil entrega enlaces firmados por cinco minutos. El enlace contiene
  un token limitado al recurso, usuario y rol; no contiene el JWT de sesion.
- Antes de transmitir, el servidor vuelve a validar estado de cuenta, rol,
  paciente/ticket, ruta real y pertenencia a los directorios privados.
- Las respuestas usan `no-store`, `nosniff`, `no-referrer` y nombres de archivo
  saneados.

Validacion realizada:

- Sintaxis PHP correcta en controladores, router y controlador base.
- No quedan vistas web que construyan URLs fisicas para documentos o adjuntos.
- TypeScript y lint de la app pasan con el nuevo contrato.

Prueba obligatoria despues del despliegue:

1. Una URL fisica conocida debe responder 404 sin importar si existe el archivo.
2. El propietario debe abrir el documento desde web y app.
3. Otro paciente debe recibir 404.
4. Un doctor autorizado debe abrirlo y un doctor no vinculado debe recibir 404.
5. Un asistente debe perder acceso al retirar su asignacion.
6. Un hospital admin no debe abrir tickets de otra licencia.
7. Un enlace movil debe dejar de funcionar despues de cinco minutos.

Orden de despliegue manual:

1. Respaldar base de datos y `storage/uploads`.
2. Subir controladores, vistas y `core/Router.php`.
3. Subir `core/Controller.php`.
4. Aplicar `.htaccess` al final para evitar una ventana donde los enlaces ya
   esten bloqueados pero los endpoints aun no existan.
5. Ejecutar inmediatamente la matriz autorizada/no autorizada.

## 2. PayPal en la app movil

Estado: `IMPLEMENTADO / PENDIENTE RUNTIME Y MODO LIVE`

Cambios:

- La cancelacion ya no confia en `appointment_id` y `patient_id` publicos.
- PayPal recibe un token HMAC de cancelacion, ligado a cita, paciente e intento
  unico, con expiracion de dos horas.
- El nonce de cancelacion se guarda en `payments.metadata_json`; una
  cancelacion vieja no puede cambiar otro intento de la misma cita.
- El retorno exitoso localiza el pago por `paypal_order_id`.
- Antes de guardar la orden se exige que PayPal entregue ID y URL de aprobacion.
- El endpoint vuelve a comprobar el interruptor servidor
  `payment_method_settings`; ocultarlo en UI no es la unica barrera.
- Antes de confirmar la cita se comparan estado `COMPLETED`, importe exacto en
  centavos y moneda.
- Pago y cita se actualizan dentro de una transaccion.
- El servidor redirige de HTTPS a `doctorcloud://payment-result`.
- La app usa `openAuthSessionAsync`, procesa `success`, `cancelled` y `error`,
  y vuelve a consultar la cita antes de mostrar confirmacion.
- Existe una ruta `payment-result` para aperturas en frio; tampoco confia en el
  parametro de retorno y valida la cita contra la API antes de mostrar exito.

Pendiente antes de mostrar pagos en produccion:

- Confirmar PayPal live, receptor real del doctor y cuenta empresarial.
- Probar pago, cancelacion, cierre manual del navegador y retorno tardio.
- Probar doble toque, doble retorno e idempotencia con una orden ya capturada.
- Confirmar conciliacion, reembolsos y webhooks.
- Mantener pagos ocultos si cualquiera de esas pruebas falla.

## 3. Iconos

Estado: `IMPLEMENTADO / REQUIERE NUEVA BUILD`

- iOS ahora usa `assets/images/icon-ios-white.png`, 1024 x 1024, sin alpha.
- La variante blanca solo aplana la transparencia sobre blanco: ningun pixel
  completamente opaco del logo original cambio.
- Android dejo de usar la imagen de fondo con cuadricula. El adaptive icon usa
  el color solido `#E6F4FE` y conserva foreground/monochrome.
- Estos cambios no llegan por OTA: requieren builds nativas nuevas.
- Ya existe `assets/store/play-feature-graphic-1024x500.png`, opaco, en
  1024 x 500 y con el logotipo original sobre fondo blanco.
- `npm run assets:store` lo regenera de forma determinista sin redibujar ni
  cambiar los colores del logotipo.

## 4. Eliminacion de cuenta

Estado: `IMPLEMENTADO EN CODIGO / PENDIENTE MIGRACION, SECRETOS Y RUNTIME`

Ya existe:

- Solicitud dentro de la app.
- Desactivacion inmediata de cuenta y JWT.
- Desactivacion de tokens FCM.
- Cancelacion de una solicitud pendiente.
- Correo de acuse al solicitar y correo al cancelar; el fallo de SMTP no revierte
  el estado y queda registrado para operacion.
- Captura de `authorizationCode` al iniciar sesion con Apple.
- Intercambio server-side por refresh token, cifrado AES-256-GCM y
  almacenamiento separado mediante `v79`.
- Reautenticacion Apple desde la pantalla de eliminacion cuando una cuenta
  heredada no tiene refresh token.
- Revocacion mediante `/auth/revoke` antes de desactivar una cuenta Apple.

No se marco como implementado:

- Anonimizacion/eliminacion final.
- Matriz aprobada de conservacion para paciente frente a doctor.
- Confirmacion operativa del correo y notificacion final al completar el
  procesamiento.
- Ejecucion de `v79` y configuracion de Team ID, Key ID, archivo `.p8` y clave
  dedicada de cifrado en produccion.
- Prueba real de intercambio/revocacion con una cuenta Apple controlada.

Razon del bloqueo:

- Los expedientes, recetas, pagos y comprobantes no pueden recibir una politica
  de borrado inventada desde codigo.
- La eliminacion/anonimizacion final sigue dependiendo de una matriz legal:
  desactivar la cuenta no autoriza a borrar a ciegas expedientes, recetas,
  comprobantes o registros contables.
- Las cuentas Apple heredadas requieren una reautenticacion dentro de la app;
  el backend ya impide continuar si no puede capturar y revocar el token.

Siguiente implementacion aprobable:

1. Definir por escrito, con revision legal, que campos se eliminan, anonimizan o
   conservan para pacientes y doctores.
2. Aplicar `v79`, configurar los secretos Apple fuera de Git y ejecutar la
   prueba real de revocacion.
3. Agregar una cola operativa con fecha limite, intentos, resultado, errores y
   evidencia de revocacion Apple.
4. Completar la cuenta solo si la matriz de retencion y la revocacion aplicable
   terminaron correctamente.

## 5. Riesgos que requieren operacion externa

Estado: `BLOQUEADO`

- Rotar secretos que hayan vivido en `core/Config.php` o historial Git.
- `migrations/database.sql` ya fue retirado del arbol actual y se agregaron
  reglas para no volver a rastrear volcados. Falta purgarlo del historial con
  un procedimiento coordinado despues de respaldar y rotar credenciales.
- Verificar restricciones de Google Maps y SHA-1 de EAS/Play App Signing.
- Confirmar Apple Developer como organizacion legal.
- Confirmar tipo/fecha de cuenta Play y requisito 12 testers/14 dias.
- Enviar Health Apps Declaration.
- Crear capturas reales sin datos personales. El feature graphic ya existe.

## 6. Segundo escaneo completo y endurecimiento

Estado: `IMPLEMENTADO EN CODIGO / PENDIENTE DESPLIEGUE`

Hallazgos corregidos:

- Se elimino `tmp_medicaluniverse_backend/`: era un handoff rastreado y
  obsoleto; todas sus funciones y migraciones ya existen en `MedicalUniverse`.
- Se retiraron credenciales PayPal literales de la migracion historica `v13`.
- Se retiro el volcado `migrations/database.sql`, que contenia datos y valores
  sensibles, y se corrigio el README para exigir un esquema solo de estructura.
- La llave Firebase web del login ahora sale de `Config.php`; la migracion
  historica `v71` ya no incrusta una llave Google.
- Los correos visibles y plantillas se unificaron en
  `soporte@doctorcloud.digital`; también se retiró el teléfono ficticio de los
  recordatorios de licencia.
- El escaneo del arbol web actual ya no encuentra patrones de llave privada,
  service account, API key Google ni clave Stripe. Esto no limpia el historial.
- CORS dejo de usar wildcard en codigo: permite requests nativos sin `Origin`,
  acepta los origenes configurados de DoctorCloud y rechaza preflight ajeno.
- Login móvil y verificación social reutilizan el bloqueo por IP del login web
  y fallan con 503 si no puede comprobarse el limitador.
- Se agrego `/superadmin/system-health`, privado, para comprobar BD/tablas de
  lanzamiento, almacenamiento, SMTP, FCM, Apple, Stripe y PayPal sin devolver
  valores de configuracion.
- Los pagos de consulta fallan cerrados si falta tabla/fila de configuracion.
- `v78` oculta Stripe/PayPal de consultas para la primera version y actualiza
  solo el modelo IA obsoleto/default a `gemini-2.5-flash`.
- El ciclo de suscripción de prueba de `$1` se retiró del checkout normal y los
  endpoints de contratación ya no aceptan `test_1day`; se conservaron sólo las
  ramas históricas necesarias para procesar registros existentes.
- Las respuestas al cliente ya no exponen mensajes crudos de Stripe, PayPal,
  IA, FCM o excepciones de citas; el detalle técnico permanece en logs
  privados.
- `LEGAL_VERSION_ARCHIVE.md` conserva commit y hashes de la version legal
  `2026-07-27`.

Comprobacion de produccion sin autenticar:

- Privacidad, terminos y eliminacion responden 200.
- Las rutas fisicas de documentos/soporte responden 403.
- Un enlace movil firmado invalido y un token PayPal cancel invalido responden
  401.
- Las rutas desplegadas de eliminacion y push alcanzan autenticacion y
  responden 401 sin JWT.
- Produccion redirige HTTP a HTTPS. `HEAD` devolvia 404 aun cuando `GET`
  funcionaba; el router local ya trata `HEAD` como `GET` y falta desplegarlo.
- Produccion aun devuelve CORS wildcard y la landing aun muestra contenido,
  precios/contactos antiguos; los cambios locales todavia requieren despliegue.

Respuesta externa obligatoria por secretos/historial:

1. Rotar primero las credenciales PayPal/Stripe/Google afectadas; una limpieza
   Git no invalida credenciales.
2. Crear un respaldo espejo privado y coordinar una ventana sin pushes.
3. Ejecutar `git filter-repo` en un clon dedicado para retirar
   `migrations/database.sql` de todos los commits y reemplazar los valores
   históricos mediante un archivo local de reemplazos que nunca se comitea.
4. Verificar el clon reescrito con un scanner de secretos y búsqueda por hashes
   de los valores retirados.
5. Forzar las ramas/tags coordinadamente, invalidar forks/caches/artefactos y
   exigir que cada colaborador vuelva a clonar.
6. Guardar evidencia privada de rotación, fecha, propietario y verificación.

## Validacion tecnica acumulada

- `npx tsc --noEmit`: pasa.
- `npm run lint`: pasa.
- `npx expo-doctor`: 18/18 comprobaciones.
- `npx expo install --check`: dependencias compatibles.
- `npx expo export --platform all`: genera Android, iOS y 63 rutas web.
- La configuracion efectiva conserva `doctorcloud`, enlaza el icono blanco iOS
  y no contiene `adaptiveIcon.backgroundImage`.
- La build permanece deliberadamente en Expo SDK 54 para 7.0.0; SDK 56 queda
  como migracion y regresion separada posterior al primer lanzamiento.
- PHP lint de los 181 archivos PHP: pasa.
- Prueba aislada del transmisor privado: acepta un archivo dentro del directorio
  autorizado y rechaza un cruce `documents/../support`.
- Prueba aislada de tokens: el enlace firmado queda limitado a recurso, usuario,
  rol y cinco minutos; la lista de retorno rechaza dominios y sufijos ajenos.
- `git diff --check`: pasa; solo aparecen avisos normales de LF/CRLF.
- Segundo escaneo: TypeScript y lint pasan tras los cambios Apple y de genero.
- Normalizacion backend probada con valores canonicos, etiquetas en español,
  abreviaturas, vacio e invalido.
- `npm audit --omit=dev`: 35 vulnerabilidades transitivas, 0 criticas,
  20 altas y 15 moderadas; los saltos mayores siguen diferidos.
- Pruebas aisladas nuevas: CORS permite sin origen/DoctorCloud y bloquea origen
  ajeno; pagos fallan cerrados; cifrado Apple y conversion DER a firma JOSE
  pasan; el client secret real requiere el `.p8` del entorno.
- El feature graphic se regenera con el mismo SHA-256, mide 1024 x 500 y no
  contiene alpha visible.
- No existe actualmente una suite automatizada end-to-end suficiente para
  sustituir las pruebas runtime descritas arriba.
- Falta prueba autenticada runtime y no se ha desplegado ningun cambio.

## 7. Reconciliacion contra el export real de base de datos

Estado: `IMPLEMENTADO EN CODIGO / PENDIENTE BACKUP, MIGRACIONES Y RUNTIME`

Evidencia revisada:

- Export del 30 de julio de 2026: 944,781 bytes, 60 tablas y SHA-256
  `6BCA16BB10E4BD7E5B12D01AEFEA6282593BA661D10985AB3E0DA34B5727AF0A`.
- El archivo contiene configuracion sensible y datos reales. No se copio al
  repositorio ni se documentaron secretos, correos, nombres, tokens o
  identificadores de pacientes.
- La comparacion se hizo contra migraciones, lecturas/escrituras SQL actuales y
  contratos consumidos por `MedicalCloudMobile`.

Desajustes comprobados y correccion preparada:

- Falta `users.force_password_change`, aunque altas administrativas, reseteo de
  contraseña y el layout web la leen o escriben.
- Renovacion de licencias usa `renewal_payment_id` y
  `renewal_pending_months`, ausentes en la base real.
- La migracion de payouts `v51` quedo parcial: faltan capacidad Stripe y cuatro
  columnas de trazabilidad de lotes.
- `appointments.payment_status` no permite `refunded`, aunque los flujos
  PayPal/Stripe lo escriben.
- `appointments.created_by_role` no permite `assistant` ni `superadmin`,
  aunque ambos crean citas.
- La app enviaba etiquetas de genero en español a un enum que solo acepta
  `male`, `female`, `other` y `prefer_not_to_say`.
- Los valores runtime de contacto seguian anulando los textos corregidos del
  codigo con el correo y telefono antiguos.
- `/superadmin/system-health` comprobaba tablas pero no estas columnas ni los
  valores requeridos de los enums.

Implementacion:

- `database_migration_v80_actual_database_contract_reconciliation.sql` completa
  las columnas faltantes y expande los enums de forma repetible.
- `v80` recupera 22 estados de pago vacios usando pago completado, pago manual,
  exencion e importe; no asigna `paid` sin evidencia.
- Siete creadores historicos vacios se conservan como `legacy_unknown`: no se
  inventa si fueron asistente o superadmin.
- Un genero vacio se convierte a `NULL`; no se intenta inferirlo.
- Cuatro suscripciones con estado activo/trial pero fecha vencida pasan a
  `expired`, y un ciclo vacio se normaliza segun `has_app`.
- Backend y app normalizan el genero al contrato canonico. La UI conserva
  etiquetas en español e incorpora “Prefiero no decirlo”.
- `v78` actualiza solo los contactos runtime obsoletos conocidos y conserva
  cualquier valor personalizado.
- El health check ahora marca degradado si falta cualquiera de las tablas,
  columnas o valores enum requeridos por `v79`/`v80`.

Datos que si quedaron coherentes:

- Los codigos de acceso de los 13 perfiles de paciente son unicos y de ocho
  caracteres.
- No hay desalineaciones actuales entre afiliacion de usuarios, perfiles y
  clinicas.
- Las seis definiciones web/movil de planes tienen familias, permisos y
  `mobile_app` alineados.
- Hay tres suscripciones moviles vigentes que cumplen simultaneamente plan
  movil, estado/fecha y `has_app=1`.
- Los 32 tokens push usan exclusivamente FCM.

Pendiente operativo o de negocio:

1. Tomar un backup nuevo y verificable inmediatamente antes de migrar.
2. Aplicar en orden `v78`, `v79` y `v80`; no importar el dump sobre produccion.
3. Ejecutar `/superadmin/system-health` y exigir HTTP 200.
4. Probar alta administrativa/cambio obligatorio de contraseña, renovacion de
   licencia, cita por asistente y superadmin, reembolso y edicion/alta de genero.
   Revisar aparte las cuentas creadas con contraseña temporal mientras faltaba
   la columna: no se activo el flag para todos los usuarios existentes porque
   no hay evidencia suficiente para distinguirlas con seguridad.
5. Los gateways y claves del export siguen en sandbox; consultas deben quedar
   ocultas hasta QA live.
6. Definir el precio real del plan Esencial: el export conserva importes
   `$10/$20`, por lo que no se cambiaron ni se asumio que fueran definitivos.
7. Rotar credenciales si este export o volcados anteriores se compartieron por
   un canal no controlado; borrar una copia Git no invalida secretos.
