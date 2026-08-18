# Pendientes de lanzamiento — DoctorCloud

Fecha: 14 de agosto de 2026
Sustituye como lista viva a `CHECKLIST_LANZAMIENTO_APP_STORES_Y_WEB.md`, que quedó
desactualizado el 3 de agosto.

Repos: `MedicalCloudMobile` (app) y `MedicalUniverse` (web, API, BD).

## Leyenda

- `[ ]` Pendiente · `[~]` Hecho a medias · `[x]` Verificado
- **YO** = se resuelve escribiendo código · **TÚ** = consola, contrato, dinero o
  dispositivo físico; no se puede hacer desde el repo

---

## Estado de la candidata

| Dato | Valor |
|---|---|
| Versión en `app.json` | `7.0.0` (corregida el 14/08; estuvo en `1.0.0` del 03/08 al 14/08) |
| Último build iOS | 28 · `1.0.0` · 11/08/2026 |
| Último build Android | versionCode 6 · `1.0.0` · 11/08/2026 |
| Próxima build esperada | iOS `7.0.0 (29)` · Android versionCode 7 |
| Último rechazo | Guideline 3.1.1 · 14/08/2026 · submission `63762af7-a983-4539-9d35-875908fd90c6` |

> Los builds 24–28 salieron con versión `1.0.0`, menor que el `7.0.0` que ya
> existía en App Store Connect. Por eso los testers solo veían hasta la build 23.
> Ninguna build compilada contiene todavía los arreglos de este documento.

---

## P0 — Bloquean el envío

### 1. Suscripciones In-App Purchase (causa del rechazo)

El código quedó escrito el 14/08 pero **no se ha ejecutado ni una sola compra**.

- [ ] **TÚ · EMPIEZA POR AQUÍ** Firmar el **Paid Applications Agreement** en App
      Store Connect con datos bancarios y fiscales de la entidad. Sin esto no se
      pueden ni crear los productos. Tarda días y bloquea todo lo demás.
- [ ] **TÚ** Confirmar que la cuenta de Apple es de **organización**, no personal.
      Apple no acepta apps sanitarias con datos sensibles desde cuentas
      individuales, y es requisito del contrato anterior.
- [ ] **TÚ** Inscribirse al **Small Business Program** de Apple. Baja la comisión
      de 30% a 15%. Con la decisión de absorber la comisión, esto es la
      diferencia entre perder $1,050 o $2,100 al mes por cada doctor en Elite.
- [ ] **TÚ** Crear los **6 productos mensuales** con los IDs exactos que ya
      quedaron sembrados en la migración `v83`:

  | Plan | Precio | Product ID (mismo en ambas tiendas) |
  |---|---|---|
  | Esencial App móvil | $1,999 | `com.doctorcloud.app.sub.esencial.monthly` |
  | Profesional App móvil | $3,599 | `com.doctorcloud.app.sub.profesional.monthly` |
  | Elite App móvil | $6,999 | `com.doctorcloud.app.sub.elite.monthly` |

  En Play son 3 suscripciones con su *base plan* mensual. En Apple, 3
  suscripciones auto-renovables dentro de un mismo grupo.
- [ ] **TÚ** Crear la **cuenta de servicio de Google Play** (distinta de la de
      FCM) con permiso de "Ver información financiera", y dejarla en
      `storage/google-play/service-account.json` fuera de `public_html`.
- [ ] **TÚ** Cargar credenciales de **App Store Server API** en Superadmin:
      `apple_iap_issuer_id`, `apple_iap_key_id` y la llave `.p8`.
- [ ] **YO** Implementar **App Store Server Notifications V2** y **Google RTDN**.
      Sin webhooks, una cancelación o un reembolso no llegan a la BD y el doctor
      conserva acceso que ya no pagó. Es la pieza que falta para que el sistema
      sea correcto en el tiempo, no solo en el momento de la compra.
- [ ] **TÚ** Probar compra real en sandbox de ambas tiendas: comprar, restaurar,
      cancelar, y verificar que `subscriptions.has_app` refleja cada caso.
- [ ] **TÚ** Responder a Apple en el hilo del rechazo explicando que la
      contratación ya ocurre dentro de la app.

**No dar de alta los productos anuales todavía.** Los tres superan la grilla
estándar de price points de Apple (~$1,067 / $1,922 / $3,737 USD). Hay que
solicitar los 100 price points adicionales, que es otro trámite aprobado por
Apple. El código y la BD ya los soportan: cuando te los concedan, solo creas los
productos. No hay que tocar código.

### 2. Pasarelas en modo prueba con suscripciones habilitadas

Verificado contra el dump del 12/08. Esto es lo más grave después del rechazo.

```
stripe_sandbox = true          stripe_secret_key = "sk_test_..."
paypal_sandbox = true          stripe_publishable_key = "pk_test_..."

stripe_card · subscription · enabled = 1     ← cobra con llave de prueba
stripe_card · license      · enabled = 1
paypal      · subscription · enabled = 1
paypal      · license      · enabled = 1
```

Hoy un doctor que "paga" su suscripción en la web no paga nada real y cualquier
tarjeta de prueba le funciona.

- [ ] **TÚ** Pasar Stripe y PayPal a llaves **live**, o deshabilitar los contextos
      `subscription` y `license` mientras tanto.
- [ ] **TÚ** Rotar las llaves de prueba y las de PayPal: llevan versionadas y en
      cada dump de BD viajan en texto plano.
- [ ] **TÚ** Sacar los secretos de `global_settings` en texto plano, o cifrarlos.
      Cuando entren las llaves live van a quedar igual de expuestas en cada
      respaldo que descargues.
- [ ] **TÚ** `paypal_payout_capability_sandbox = "blocked_country"` → los payouts
      a doctores por PayPal no funcionan. Decidir si se lanza sin esa vía.

### 3. Precios de prueba visibles

- [x] `esencial_app` corregido a **$1,999** en la migración `v83`.
- [ ] **TÚ** El plan **Esencial de web sigue en $10** (`price_monthly_no_app`).
      Debería ser $999 según lo que mencionaste. Junto a Profesional de $1,799 se
      ve como un error de configuración.
- [ ] **TÚ** Confirmar en Superadmin que ningún ciclo de prueba de $1 quedó
      visible en el checkout.

### 4. URL de soporte pública

App Store exige un *Support URL* accesible **sin iniciar sesión**. Hoy
`core/Router.php` solo expone públicamente `/`, `/privacidad`, `/terminos` y
`/eliminar-cuenta`; `/support` está detrás de sesión.

- [ ] **YO** Publicar `/soporte` público con `soporte@doctorcloud.digital`.
- [ ] **TÚ** Confirmar que ese buzón está realmente atendido.

### 5. Revocación de Apple sin configurar ni probar

`core/Config.example.php` tiene `APPLE_TEAM_ID`, `APPLE_KEY_ID` y
`APPLE_TOKEN_ENCRYPTION_KEY` **vacíos**. Y el dump confirma que las tablas
`account_deletion_requests` y `apple_auth_tokens` están **en cero filas**: la
eliminación de cuenta nunca se ha ejercido en producción.

- [ ] **TÚ** Cargar Team ID, Key ID, `.p8` y clave de cifrado en cPanel, con el
      `.p8` fuera de `public_html`.
- [ ] **TÚ** Probar una eliminación real con una cuenta Apple de prueba.
- [ ] **TÚ** Verificar que `/app/superadmin/system-health` pasa a HTTP 200. Hoy
      devuelve `degraded` por `apple_revocation.configured = false`.

### 6. Desplegar lo que ya está escrito

- [ ] **TÚ** Desplegar `MedicalUniverse` y aplicar **`v82`** y **`v83`** en ese
      orden, con respaldo previo.
- [ ] **TÚ** Verificar que `v82` dejó en cero las videoconsultas sin sala:
      ```sql
      SELECT COUNT(*) FROM appointments
      WHERE type = 'virtual' AND (video_room_id IS NULL OR video_room_id = '');
      ```
- [ ] **TÚ** Compilar `7.0.0 (29)` desde un commit limpio y subirla.

---

## P1 — Alto riesgo, no bloquean el envío

### 7. Videoconsulta en iPhone físico

El arreglo del 14/08 cambió el navegador incrustado
(`WebBrowser.openBrowserAsync`) por el del sistema (`Linking.openURL`), porque
SFSafariViewController no entrega cámara ni micrófono a `getUserMedia` de forma
confiable y además obligaría a declarar permiso de micrófono en la app.

- [ ] **TÚ** Probar una videoconsulta completa en un iPhone real, paciente y
      doctor. Es lo único de toda la lista que necesita el dispositivo.
- [ ] **TÚ** Probar también en Android, que es donde sí funcionaba antes, para
      confirmar que el cambio no lo rompió.

### 8. Jitsi público

Las salas ya no son adivinables, pero `meet.jit.si` sigue siendo un servidor
público: quien tenga la URL entra a la consulta.

- [ ] **YO** Migrar a Jitsi self-hosted con JWT, o activar *moderated meetings*.
      Para datos clínicos es lo correcto.

### 9. Google Maps

- [ ] **TÚ** Restringir la llave `AIzaSyChbs…` al paquete `com.doctorcloud.app` +
      SHA-1 de EAS y de Play App Signing. Hoy está sin restringir y versionada.
- [ ] **TÚ** Confirmar facturación activa y `Maps SDK for Android` habilitada.
- [ ] **YO** `plugins/with-android-google-maps-api-key.js` existe pero **no está
      registrado** en `app.json`: es código muerto. O se registra o se borra,
      porque hoy engaña a quien intente mover la llave a variable de entorno.

### 10. Material de tienda

- [ ] **TÚ** Capturas de iPhone 6.9" (1320×2868 o 1290×2796). No hace falta el
      dispositivo: el Simulador de Xcode las genera con las medidas exactas.
- [ ] **TÚ** Capturas de Android (mínimo 2) e icono 512×512 para Play.
- [ ] **TÚ** Cuentas de revisión de paciente y doctor con datos ficticios, sin
      2FA, y con suscripción activa para que el revisor vea el workspace.
- [ ] **TÚ** Declaración de salud, Data Safety y App Privacy — los borradores
      están en `DECLARACIONES_PRIVACIDAD_SALUD_TIENDAS.md`. **Actualizarlos**:
      ahora hay compras dentro de la app, que es un dato nuevo que declarar.

---

## P2 — Deuda conocida

- [ ] **YO** 5 citas (`#83`–`#86`, `#89`) tienen `type` con valor vacío fuera del
      enum. Todas canceladas, de junio, con tarifas de prueba. `v80` no cubrió
      `appointments.type`. Es basura histórica, no un bug vivo.
- [ ] **YO** Sin manejo offline: cero NetInfo, cero caché. Es el único punto del
      checklist viejo que sigue sin empezar.
- [ ] **TÚ** `npm audit`: 34 vulnerabilidades transitivas. Resolverlas exige
      saltar a Expo 57 / RN 0.86. Dejar para después del lanzamiento.
- [ ] **TÚ** Decidir grafía única: `DoctorCloud` o `Doctor Cloud`.

---

## Ya hecho y verificado — no rehacer

Todo esto se comprobó contra código, EAS o el dump de producción del 12/08.

### Corregido el 14/08

- [x] **Videoconsulta**: el `INSERT` de citas del paciente en móvil no escribía
      `video_room_id`, y la app leía campos inexistentes (`meeting_url`,
      `jitsi_url`…), cayendo siempre a `medicalcloud-cita-{id}` — un nombre de
      sala **enumerable** en un servidor público. Corregido en backend, app y con
      backfill `v82`. Evidencia del daño: de 7 videoconsultas agendadas desde la
      app, 6 acabaron canceladas y 1 en no_show. Ninguna se completó.
- [x] **iOS**: videollamada movida al navegador del sistema.
- [x] **Versión** devuelta a `7.0.0`.
- [x] **IAP**: `expo-iap` instalado, `StoreSubscriptions.php` con verificación de
      firma JWS contra la CA raíz de Apple, 3 endpoints, migración `v83`,
      pantallas `planes` y `gestionar`, y enlace externo eliminado de
      `subscription-required.tsx`.

### Estado sano confirmado

- [x] `v78`, `v80` y `v81` **aplicadas en producción**: pagos de consulta
      apagados, `ai_model = gemini-2.5-flash`, `account_deletion_grace_days = 30`.
- [x] **Push sano**: 39 tokens, 100% FCM, 11 iOS / 28 Android. Sin residuos Expo.
- [x] **Ramas limpias**: `doctor-app` y `cambios-revision-stripe` son idénticas en
      contenido a `main`. No hay trabajo disperso.
- [x] Icono iOS 1024×1024 **sin canal alfa**; adaptive + monocromo en Android.
- [x] Permisos: sin `READ_MEDIA_IMAGES`, `FOREGROUND_SERVICE`,
      `SCHEDULE_EXACT_ALARM` ni `QUERY_ALL_PACKAGES` en ninguna dependencia. No
      hacen falta las declaraciones de Fotos/Video ni de servicios en primer plano.
- [x] Textos de permisos específicos → cierra el `ITMS-90683` del build 16.
- [x] targetSdk 36 y RN 0.81: cumple API 35 mínima de Play y páginas de 16 KB.
- [x] Eliminación de cuenta in-app implementada, con reautenticación Apple.
- [x] Privacidad y términos enlazados desde login, registro y ambos perfiles.
- [x] `.jks` y el JSON de firebase-adminsdk **no están trackeados** en git.
- [x] `tsc`, `expo lint` y `expo-doctor` (18/18) limpios al 14/08.

---

## Orden sugerido

1. **Hoy**: Paid Applications Agreement + Small Business Program. Todo lo demás
   de IAP espera a esto.
2. **En paralelo**: llaves live de Stripe/PayPal, precio del Esencial web,
   credenciales de Apple, restricción de Maps.
3. **YO**: webhooks S2S y `/soporte` público.
4. Desplegar backend + `v82` + `v83`.
5. Crear los 6 productos mensuales y probar compra en sandbox.
6. Build `7.0.0 (29)` → TestFlight e Internal Testing.
7. Videoconsulta en iPhone físico, capturas, cuentas de revisión.
8. Enviar y responder el hilo del rechazo.

## Definición de terminado

- [ ] Un doctor puede suscribirse **dentro** de la app y obtener acceso
- [ ] Cancelar en la tienda revoca el acceso en la BD
- [ ] "Restaurar compras" funciona tras reinstalar
- [ ] Una videoconsulta se completa en iPhone y en Android
- [ ] Ninguna pasarela cobra con llaves de prueba
- [ ] `system-health` responde 200
- [ ] La build enviada corresponde exactamente al commit aprobado
