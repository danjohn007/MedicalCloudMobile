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

- `MedicalUniverse` estaba limpio en Git.
- `MedicalCloudMobile` solo conservaba sin seguimiento
  `assets/images/icon-ios-white.png`, creado deliberadamente durante la
  auditoria del icono.
- No se encontro codigo parcial de los flujos descartados desde GitHub Desktop.
- Los cambios enumerados debajo son los cambios nuevos de esta fase; no se
  desplego nada y no se revirtieron archivos ajenos.

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
- En el arbol actual no existe aun el feature graphic 1024 x 500.

## 4. Eliminacion de cuenta

Estado: `BLOQUEADO PARCIALMENTE`

Ya existe:

- Solicitud dentro de la app.
- Desactivacion inmediata de cuenta y JWT.
- Desactivacion de tokens FCM.
- Cancelacion de una solicitud pendiente.

No se marco como implementado:

- Anonimizacion/eliminacion final.
- Matriz aprobada de conservacion para paciente frente a doctor.
- Confirmacion operativa y correo de resultado.
- Revocacion programatica de Sign in with Apple.

Razon del bloqueo:

- Los expedientes, recetas, pagos y comprobantes no pueden recibir una politica
  de borrado inventada desde codigo.
- El cliente Apple actualmente envia el identity token, pero descarta el
  `authorizationCode`; por ello el servidor no obtiene un refresh token para
  `/auth/revoke`.
- Las cuentas Apple existentes sin token deben seguir el procedimiento manual
  indicado por Apple, incluso si se completa la eliminacion de datos.

Siguiente implementacion aprobable:

1. Definir por escrito, con revision legal, que campos se eliminan, anonimizan o
   conservan para pacientes y doctores.
2. Agregar captura de `authorizationCode`, intercambio inmediato en servidor y
   almacenamiento cifrado del refresh token.
3. Agregar una cola operativa con fecha limite, intentos, resultado, errores y
   evidencia de revocacion Apple.
4. Completar la cuenta solo si la matriz de retencion y la revocacion aplicable
   terminaron correctamente.

## 5. Riesgos que requieren operacion externa

Estado: `BLOQUEADO`

- Rotar secretos que hayan vivido en `core/Config.php` o historial Git.
- Retirar `migrations/database.sql` del repositorio y purgar su historial con un
  procedimiento coordinado; contiene datos y no debe borrarse sin respaldo.
- Verificar restricciones de Google Maps y SHA-1 de EAS/Play App Signing.
- Confirmar Apple Developer como organizacion legal.
- Confirmar tipo/fecha de cuenta Play y requisito 12 testers/14 dias.
- Enviar Health Apps Declaration.
- Crear feature graphic y capturas reales sin datos personales.

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
- PHP lint de los 180 archivos PHP: pasa.
- Prueba aislada del transmisor privado: acepta un archivo dentro del directorio
  autorizado y rechaza un cruce `documents/../support`.
- Prueba aislada de tokens: el enlace firmado queda limitado a recurso, usuario,
  rol y cinco minutos; la lista de retorno rechaza dominios y sufijos ajenos.
- `git diff --check`: pasa; solo aparecen avisos normales de LF/CRLF.
- No existe actualmente una suite automatizada end-to-end suficiente para
  sustituir las pruebas runtime descritas arriba.
- Falta prueba autenticada runtime y no se ha desplegado ningun cambio.
