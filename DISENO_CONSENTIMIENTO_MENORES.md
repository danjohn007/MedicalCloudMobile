# Diseño: consentimiento verificable para pacientes menores de edad

Estado: diseño técnico previo a implementación. Requiere revisión legal del texto y confirmación del responsable antes de habilitar menores en producción.

## Hallazgo de la auditoría

Doctor Cloud no debe declararse actualmente como una app que admite menores con consentimiento verificable:

- Los formularios web de paciente muestran `max` de 18 años, pero es una restricción del navegador y el servidor no valida la edad.
- El alta móvil de paciente no solicita fecha de nacimiento; esa fecha puede agregarse después en el perfil.
- El endpoint móvil de perfil acepta la fecha de nacimiento sin comprobar edad o estado de consentimiento.
- No existe una tabla, token, correo de verificación, registro de versión legal ni pantalla de autorización de tutor.

Por ello, hoy el producto no implementa de forma fiable ni una experiencia para menores ni un límite técnico de adultos.

## Decisión de lanzamiento requerida

Hay dos caminos excluyentes:

1. **Recomendado si se mantienen menores en el lanzamiento:** implementar el flujo de este documento y no activar una cuenta de menor hasta que su tutor verifique el consentimiento.
2. **Alternativa temporal:** publicar solo para mayores de 18 años. Requiere validación de edad en servidor para toda alta/edición de paciente y actualizar las fichas de tiendas, privacidad y registro.

No basta con un checkbox que el menor pueda marcar por sí mismo.

## Flujo recomendado

Se considera menor a quien no haya cumplido 18 años al momento de la solicitud, con fecha de referencia México.

1. En toda alta de paciente se solicita fecha de nacimiento antes de crear o activar la cuenta.
2. Si tiene 18 años o más, sigue el registro normal.
3. Si es menor, se solicitan únicamente los datos mínimos del tutor: nombre completo, relación con el menor, correo y teléfono opcional de contacto.
4. La persona declara que es madre, padre o tutor con facultad para autorizar el tratamiento de datos del menor y acepta la versión vigente de privacidad y términos.
5. El servidor crea la cuenta con estado `pending_guardian_consent`; no emite JWT, sesión web, token push ni acceso a expediente, chat, documentos, IA, ubicación o pagos.
6. El servidor envía al correo del tutor un enlace de un solo uso con token aleatorio, almacenado como hash y con caducidad corta (por ejemplo, 24 horas).
7. La página del enlace muestra una explicación clara, el nombre del menor y las versiones de los documentos. El tutor confirma explícitamente.
8. Al confirmar, el servidor registra fecha, versión legal, fuente, IP y user agent; invalida el token y activa la cuenta.
9. Si vence, se revoca o se rechaza, la cuenta permanece bloqueada y se ofrece reenviar el enlace con límites de frecuencia.
10. Al alcanzar los 18 años, se debe pedir la aceptación propia de los términos vigentes antes de seguir usando funciones que lo requieran. La regla exacta debe validarse legalmente.

## Modelo de datos propuesto

Nueva migración, sin guardar tokens en claro:

```sql
CREATE TABLE minor_guardian_consents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  guardian_name VARCHAR(150) NOT NULL,
  guardian_relationship VARCHAR(60) NOT NULL,
  guardian_email VARCHAR(190) NOT NULL,
  guardian_phone VARCHAR(30) NULL,
  consent_version VARCHAR(40) NOT NULL,
  privacy_version VARCHAR(40) NOT NULL,
  token_hash CHAR(64) NULL,
  token_expires_at DATETIME NULL,
  requested_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  revoked_at DATETIME NULL,
  source VARCHAR(40) NOT NULL,
  requested_ip VARBINARY(16) NULL,
  verified_ip VARBINARY(16) NULL,
  requested_user_agent VARCHAR(255) NULL,
  verified_user_agent VARCHAR(255) NULL,
  UNIQUE KEY uq_minor_guardian_patient (patient_id),
  UNIQUE KEY uq_minor_guardian_token (token_hash),
  KEY idx_minor_guardian_pending (verified_at, token_expires_at),
  CONSTRAINT fk_minor_guardian_patient FOREIGN KEY (patient_id) REFERENCES users(id)
);
```

La migración también debe permitir el nuevo estado `pending_guardian_consent` si la columna `users.status` usa un `ENUM`; si es `VARCHAR`, debe documentar y validar el estado en todas las capas.

## Cambios de aplicación necesarios

### Backend y web

- Centralizar el cálculo de edad y validarlo en servidor para registro, Google/Apple, perfil, alta por doctor, alta por clínica y alta por superadmin.
- Rechazar o dejar en espera cualquier cuenta cuyo estado no sea `active`; esa base ya quedó reforzada para login y API.
- Crear rutas públicas de solicitud, verificación, reenvío limitado y revocación de consentimiento.
- Implementar correo específico de tutor con enlace absoluto HTTPS y sin datos clínicos en el asunto o cuerpo.
- Añadir auditoría de creación, reenvío, verificación, revocación y cambios de fecha de nacimiento.
- No permitir a una persona cambiar su fecha de nacimiento a menor de edad sin iniciar/reiniciar el flujo.
- Proteger cuentas creadas por doctor/clínica: no deben recibir acceso normal hasta que su tutor complete la verificación.

### App móvil

- Pedir fecha de nacimiento durante registro y registro social de paciente.
- Mostrar formulario de tutor solo al detectar minoría de edad.
- Tras enviar, cerrar cualquier sesión temporal y mostrar estado de espera con reenvío limitado; no registrar FCM antes de verificar.
- Mostrar al paciente y tutor una vía de soporte y una opción para cancelar la solicitud.
- Aplicar el mismo flujo en web para que no haya una vía de bypass.

## Criterios mínimos de aceptación

- Un paciente adulto termina el registro normal.
- Un menor no recibe sesión, JWT ni puede abrir ninguna pantalla autenticada antes de la verificación.
- Un token incorrecto, vencido, usado o revocado no activa la cuenta.
- El tutor puede aceptar una sola vez y queda evidencia auditable de versión, fecha y origen.
- Reenviar el correo tiene rate limit y no revela si un correo pertenece a otra persona.
- Un usuario activo que cambia a fecha menor queda bloqueado hasta consentimiento válido.
- Doctor, clínica, superadmin, registro por correo, Google y Apple obedecen la misma regla.
- Se prueban rechazo de permiso, correo no entregado, token vencido, revocación, eliminación de cuenta y mayoría de edad.

## Pendientes legales que no debe resolver el código por sí solo

- Texto de autorización, versión inicial y prueba de identidad/autorización del tutor.
- Edad, condiciones y excepciones aplicables por tipo de atención y entidad prestadora del servicio médico.
- Plazos de conservación del consentimiento, expediente clínico y evidencias de auditoría.
- Derechos de acceso, corrección, revocación y eliminación del menor/tutor.
- Política para consultas, documentos, IA, ubicación y pagos cuando la persona es menor.
