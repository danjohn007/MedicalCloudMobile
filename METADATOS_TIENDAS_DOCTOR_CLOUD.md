# Borrador de metadatos para Google Play y App Store

Estado: borrador para la versión 7.0.0. No cargar hasta que las URLs legales públicas respondan correctamente y se valide cada declaración contra producción.

## Identidad común

| Campo | Valor propuesto |
|---|---|
| Nombre público | Doctor Cloud |
| Android package | `com.doctorcloud.app` |
| iOS bundle ID | `com.doctorcloud.app` |
| Categoría principal | Medicina / Medical |
| País inicial | México |
| Sitio web | `https://doctorcloud.digital` |
| Soporte | `soporte@doctorcloud.digital` |
| Política de privacidad | `https://doctorcloud.digital/app/privacidad` |
| Opciones de privacidad y eliminación | `https://doctorcloud.digital/app/eliminar-cuenta` |

Las dos URLs legales todavía deben desplegarse y verificarse públicamente antes de usarlas en las consolas.

## Texto de Google Play

### Nombre

`Doctor Cloud`

### Descripción corta

`Citas y comunicación médica para pacientes y profesionales.`

### Descripción completa

Doctor Cloud reúne herramientas para organizar la atención médica y la comunicación entre pacientes y profesionales de la salud.

Para pacientes, permite encontrar profesionales, consultar disponibilidad, solicitar y seguir citas, mantener información de perfil y recibir avisos relacionados con la atención. Según el servicio contratado por el profesional, también puede incluir mensajería, documentos y seguimiento de información clínica compartida dentro de la relación de atención.

Para profesionales, Doctor Cloud ofrece una agenda de consultas, gestión de pacientes vinculados, disponibilidad, notas clínicas, recetas y herramientas de apoyo operativo. Algunas funciones dependen de la suscripción activa del profesional.

La ubicación se usa únicamente cuando la persona la solicita para facilitar la búsqueda de profesionales, completar direcciones o ubicar un consultorio. Las notificaciones se usan para avisos de citas, mensajes y actividad relevante de la cuenta.

Doctor Cloud no es un servicio de emergencias ni sustituye la valoración de un profesional de la salud. Las funciones de inteligencia artificial son de apoyo informativo y clínico; no sustituyen el criterio profesional, una consulta ni la atención urgente.

Cuando un profesional habilita cobros, los pagos se procesan con los medios disponibles para ese servicio. Revisa la política de privacidad y los términos antes de usar la aplicación.

### Notas de la ficha

- Declaración de anuncios propuesta: **No contiene anuncios**. Confirmar que no se agregará ningún SDK publicitario antes de enviarla.
- Declaración de salud propuesta: plataforma de servicios y gestión de atención médica; no dispositivo médico ni servicio de emergencia.
- Declaración financiera: seleccionar únicamente los métodos de pago realmente visibles y operativos en la build enviada.
- No usar frases como “diagnóstico”, “cura”, “seguro al 100%”, “sin terceros” o cifras no demostrables.

## Texto de App Store

| Campo | Valor propuesto |
|---|---|
| Nombre | `Doctor Cloud` |
| Subtítulo | `Citas y atención conectada` |
| Categoría | Medical |
| SKU interno sugerido | `doctorcloud-ios` |
| Copyright | `© 2026 Doctor Cloud` |

### Descripción

Usar la descripción completa de Google Play, adaptada al editor de App Store Connect. Mantener los avisos de que no es un servicio de emergencias y que la IA es solo apoyo.

### Palabras clave sugeridas

`citas,médicos,pacientes,agenda,salud,consultorio,recetas,telemedicina`

Revisar disponibilidad y límite del campo en App Store Connect antes de guardarlas.

### Notas para App Review

Doctor Cloud tiene dos experiencias: paciente y profesional de la salud. La misma app adapta la navegación según el rol de la cuenta.

- Paciente: puede buscar profesionales, solicitar citas, administrar su perfil, consultar información y recibir notificaciones.
- Profesional: requiere una suscripción activa con acceso móvil. Las funciones como notas, recetas, videoconsultas e IA pueden depender del plan contratado.
- Inicio de sesión: correo y contraseña; también se ofrecen Google Sign-In y Sign in with Apple en iOS.
- Ubicación: solo al usar la acción para buscar cercanos, completar una dirección o localizar un consultorio.
- Notificaciones: recordatorios de cita, mensajes y avisos de cuenta.
- IA: apoyo informativo/operativo; no diagnostica ni sustituye una consulta o atención de emergencia.
- Pagos: si están visibles en la build de revisión, describir el flujo real, el proveedor y una cuenta de prueba que no requiera dinero real.

Antes de enviar, reemplazar los siguientes datos por credenciales activas con información ficticia:

| Rol | Correo | Contraseña | Instrucciones |
|---|---|---|---|
| Paciente | `[pendiente]` | `[pendiente]` | Cuenta con perfil, una cita y mensajes ficticios. |
| Profesional | `[pendiente]` | `[pendiente]` | Cuenta con plan móvil activo y datos clínicos ficticios. |

No incluir contraseñas reales en este archivo ni en Git. Cargarlas directamente en las notas privadas de cada consola.

## Guion de capturas y assets

Todas las capturas deben provenir de la build candidata, usar datos ficticios y no mostrar nombres, teléfonos, direcciones, expedientes, recetas ni conversaciones reales.

1. Inicio de paciente con próximas citas ficticias.
2. Búsqueda de profesional y disponibilidad.
3. Solicitud o detalle de cita ficticia.
4. Perfil del paciente y control de ubicación, sin coordenadas reales.
5. Agenda del profesional con pacientes ficticios.
6. Perfil/espacio de trabajo profesional y disponibilidad.
7. Aviso de IA con su limitación clínica visible.

Pendientes de archivo:

- Exportar icono de Play de 512 × 512 sin transparencia desde el icono maestro de 1024 × 1024.
- Crear feature graphic de Google Play de 1024 × 500, JPEG o PNG de 24 bits y sin canal alfa.
- Capturar la app iPhone desde un dispositivo/tamaño aceptado por App Store Connect. Si la interfaz es equivalente, Apple permite proporcionar el tamaño iPhone de mayor resolución requerido y escalarlo a los tamaños menores.
- Cargar entre 1 y 10 capturas por plataforma; preparar al menos las siete anteriores para elegir las más representativas.

## Borrador de privacidad para las consolas

Este inventario es una guía de captura, no una declaración legal definitiva. Debe confirmarse en producción, junto con Firebase, Google, Apple, Stripe, PayPal, Jitsi y Gemini.

| Datos a declarar/revisar | Finalidad principal | Vinculado a identidad | Posibles proveedores |
|---|---|---:|---|
| Nombre, correo, teléfono, foto e ID de cuenta | Cuenta, autenticación y contacto | Sí | Backend, Google, Apple, Firebase |
| Datos de salud, antecedentes, notas, recetas y documentos | Atención, expediente y funciones solicitadas | Sí | Backend; Gemini solo cuando se invoca IA |
| Mensajes | Comunicación entre paciente y profesional | Sí | Backend, Firebase para avisos limitados |
| Ubicación y dirección | Buscar cercanos, dirección y consultorio | Sí, si se guarda | Google Maps o Apple Maps |
| Identificadores de dispositivo y token push | Sesión, seguridad y notificaciones | Sí | Firebase, APNs |
| Citas, actividad e importes/referencias de pago | Agenda, operación y conciliación | Sí | Backend, Stripe, PayPal |
| Solicitudes de soporte y adjuntos | Atención de incidencias | Sí | Backend/equipo de soporte |
| Logs técnicos | Seguridad y diagnóstico | Confirmar | Servidor |

Al llenar Google Data safety y App Privacy:

- Declarar la práctica más amplia de todas las versiones y plataformas publicadas.
- Incluir los SDK y proveedores terceros, no solo los datos capturados por formularios propios.
- Marcar si cada dato se recopila, comparte, se vincula a identidad y si se usa para seguimiento solo después de validar el flujo real.
- No declarar “no se recopilan datos” ni “no se comparten datos” para una app que transmite perfil, datos clínicos, documentos, ubicación o tokens a sus servicios.
- Usar la URL de privacidad y, para Apple, la URL de opciones de privacidad/eliminación cuando ambas estén desplegadas.

## Evidencia que falta al propietario de las cuentas

- Verificación y tipo de cuenta de Google Play; si es cuenta personal nueva, confirmar la prueba cerrada requerida por Play.
- Apple Developer Program, contratos y permisos de App Store Connect.
- Cuentas de revisión de ambos roles y, si hay pagos, entorno de prueba sin cobro real.
- Capturas finales y feature graphic aprobadas.
- Confirmación de que no hay anuncios.
- Respuestas legales revisadas sobre menores, datos de salud, retención y pagos.
- URLs legales públicas funcionando y correo de soporte atendido.
