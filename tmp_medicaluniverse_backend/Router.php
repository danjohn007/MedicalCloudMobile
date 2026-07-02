<?php
declare(strict_types=1);

/**
 * Router — URL parser and dispatcher.
 * Maps clean URLs to Controller@method pairs.
 * Supports GET, POST, ANY verbs and :param dynamic segments.
 */
class Router
{
    private static array $routes = [];

    public static function dispatch(): void
    {
        self::registerRoutes();

        $method = strtoupper($_SERVER['REQUEST_METHOD']);
        $url    = self::parseUrl();


        // ── CORS preflight: respond 204 for any OPTIONS on API routes ──
        // Necesario para app móvil / clientes externos; no afecta rutas web normales.
        if ($method === 'OPTIONS' && str_starts_with($url, '/api/')) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            http_response_code(204);
            exit;
        }

        foreach (self::$routes as $route) {
            if ($route['method'] !== 'ANY' && $route['method'] !== $method) continue;

            $pattern = self::toRegex($route['path']);
            if (!preg_match($pattern, $url, $matches)) continue;

            // Extract named URL parameters (:id, :doctor_id, etc.)
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

            [$controllerClass, $methodName] = explode('@', $route['action'], 2);

            if (!class_exists($controllerClass)) {
                error_log("[Router] Controller not found: {$controllerClass}");
                http_response_code(500);
                exit('Error interno del servidor.');
            }

            $controller = new $controllerClass();

            if (!method_exists($controller, $methodName)) {
                error_log("[Router] Method not found: {$controllerClass}::{$methodName}");
                http_response_code(500);
                exit('Error interno del servidor.');
            }

            $controller->$methodName(...array_values($params));
            return;
        }

        // ── 404 ───────────────────────────────────────────────
        http_response_code(404);
        $notFound = APP_ROOT . '/app/views/errors/404.php';
        file_exists($notFound) ? require $notFound : exit('<h1>404 — Página no encontrada</h1>');
    }

    private static function parseUrl(): string
    {
        $url = trim($_GET['url'] ?? '', '/');
        $url = filter_var($url, FILTER_SANITIZE_URL);
        return '/' . ($url ?: '');
    }

    private static function toRegex(string $path): string
    {
        $pattern = preg_replace('/:([a-zA-Z_][a-zA-Z0-9_]*)/', '(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    private static function addRoute(string $method, string $path, string $action): void
    {
        self::$routes[] = compact('method', 'path', 'action');
    }

    // ── Route Registration ────────────────────────────────────
    private static function registerRoutes(): void
    {
        // ── MOBILE API (JWT — no sessions) ────────────────────
        self::addRoute('ANY',  '/api/mobile/auth/login',                   'MobileApiController@login');
        self::addRoute('ANY',  '/api/mobile/auth/register',                'MobileApiController@register');
        self::addRoute('ANY',  '/api/mobile/specialties',                  'MobileApiController@specialties');
        self::addRoute('GET',  '/api/mobile/doctors',                      'MobileApiController@doctors');
        self::addRoute('GET',  '/api/mobile/doctors/:id',                  'MobileApiController@doctorProfile');
        self::addRoute('GET',  '/api/mobile/doctors/:id/availability',     'MobileApiController@doctorAvailability');
        self::addRoute('POST', '/api/mobile/appointments',                 'MobileApiController@createAppointment');
        self::addRoute('GET',  '/api/mobile/appointments',                 'MobileApiController@appointments');
        self::addRoute('GET',  '/api/mobile/appointments/:id',             'MobileApiController@appointmentDetail');
        self::addRoute('GET',  '/api/mobile/appointments/:id/payment-info', 'MobileApiController@appointmentPaymentInfo');
        self::addRoute('POST', '/api/mobile/appointments/:id/stripe/create-intent', 'MobileApiController@appointmentStripeCreateIntent');
        self::addRoute('POST', '/api/mobile/appointments/:id/cancel',      'MobileApiController@cancelAppointment');
        self::addRoute('GET',  '/api/mobile/messages',                     'MobileApiController@messages');
        self::addRoute('GET',  '/api/mobile/messages/:id',                 'MobileApiController@conversation');
        self::addRoute('POST', '/api/mobile/messages/:id',                 'MobileApiController@sendMessage');
        self::addRoute('GET',  '/api/mobile/profile',                      'MobileApiController@profile');
        self::addRoute('ANY',  '/api/mobile/profile',                      'MobileApiController@updateProfile');
        self::addRoute('POST', '/api/mobile/avatar'                              , 'MobileApiController@avatar');
        self::addRoute('POST', '/api/mobile/avatar/remove'                       , 'MobileApiController@removeAvatar');
        self::addRoute('GET', '/api/mobile/expediente'                          , 'MobileApiController@expediente');
        self::addRoute('ANY', '/api/mobile/expediente'                          , 'MobileApiController@updateExpediente');
        self::addRoute('GET', '/api/mobile/appointments/:id/qr'                 , 'MobileApiController@appointmentQr');
        self::addRoute('POST', '/api/mobile/appointments/:id/checkin'            , 'MobileApiController@checkinAppointment');
        self::addRoute('POST', '/api/mobile/appointments/:id/checkout'           , 'MobileApiController@checkoutAppointment');
        self::addRoute('POST', '/api/mobile/appointments/:id/pay'                , 'MobileApiController@appointmentPay');
        self::addRoute('GET', '/api/mobile/appointments/:id/capture'            , 'MobileApiController@appointmentCapture');
        self::addRoute('GET', '/api/mobile/appointments/:id/payment-cancelled'  , 'MobileApiController@appointmentPaymentCancelled');
        self::addRoute('POST', '/api/mobile/appointments/:id/payment-cancelled'  , 'MobileApiController@appointmentPaymentCancelled');
        self::addRoute('GET', '/api/mobile/documents'                           , 'MobileApiController@documents');
        self::addRoute('POST', '/api/mobile/documents/upload'                    , 'MobileApiController@documentsUpload');
        self::addRoute('POST', '/api/mobile/documents/:id/delete'                , 'MobileApiController@documentDelete');
        self::addRoute('GET', '/api/mobile/financial-history'                   , 'MobileApiController@financialHistory');
        self::addRoute('GET', '/api/mobile/dashboard/stats'                     , 'MobileApiController@dashboardStats');
        self::addRoute('GET', '/api/mobile/prescriptions'                       , 'MobileApiController@prescriptions');
        self::addRoute('GET', '/api/mobile/soap-notes'                          , 'MobileApiController@soapNotes');
        self::addRoute('GET', '/api/mobile/notifications'                       , 'MobileApiController@notifications');
        self::addRoute('GET', '/api/mobile/support'                             , 'MobileApiController@supportTickets');
        self::addRoute('POST', '/api/mobile/support'                            , 'MobileApiController@createSupportTicket');
        self::addRoute('GET', '/api/mobile/support/:id'                         , 'MobileApiController@supportTicketDetail');
        self::addRoute('POST', '/api/mobile/support/:id/reply'                  , 'MobileApiController@replySupportTicket');
        self::addRoute('POST', '/api/mobile/support/:id/close'                  , 'MobileApiController@closeSupportTicket');
        self::addRoute('GET', '/api/mobile/doctor/dashboard'                    , 'MobileApiController@doctorDashboard');
        self::addRoute('POST', '/api/mobile/doctor/appointments'                , 'MobileApiController@doctorCreateAppointment');
        self::addRoute('GET', '/api/mobile/doctor/appointments'                 , 'MobileApiController@doctorAppointments');
        self::addRoute('GET', '/api/mobile/doctor/appointments/:id'             , 'MobileApiController@doctorAppointmentDetail');
        self::addRoute('POST', '/api/mobile/doctor/appointments/:id/checkin'    , 'MobileApiController@doctorAppointmentCheckin');
        self::addRoute('POST', '/api/mobile/doctor/appointments/:id/complete'   , 'MobileApiController@doctorAppointmentComplete');
        self::addRoute('POST', '/api/mobile/doctor/appointments/:id/status'     , 'MobileApiController@doctorAppointmentUpdateStatus');
        self::addRoute('GET', '/api/mobile/doctor/appointments/:id/soap'        , 'MobileApiController@doctorAppointmentSoap');
        self::addRoute('POST', '/api/mobile/doctor/appointments/:id/soap'       , 'MobileApiController@doctorAppointmentSoap');
        self::addRoute('GET', '/api/mobile/doctor/profile'                      , 'MobileApiController@doctorProfileSettings');
        self::addRoute('PUT', '/api/mobile/doctor/profile'                      , 'MobileApiController@updateDoctorProfile');
        self::addRoute('GET', '/api/mobile/doctor/availability'                 , 'MobileApiController@doctorAvailabilitySettings');
        self::addRoute('PUT', '/api/mobile/doctor/availability'                 , 'MobileApiController@updateDoctorAvailability');
        self::addRoute('POST', '/api/mobile/doctor/availability/override'       , 'MobileApiController@doctorAvailabilityOverride');
        self::addRoute('GET', '/api/mobile/doctor/consultation-templates'       , 'MobileApiController@doctorConsultationTemplates');
        self::addRoute('POST', '/api/mobile/doctor/consultation-templates'      , 'MobileApiController@saveDoctorConsultationTemplate');
        self::addRoute('POST', '/api/mobile/doctor/consultation-templates/:id/delete', 'MobileApiController@deleteDoctorConsultationTemplate');
        self::addRoute('GET', '/api/mobile/doctor/patients'                     , 'MobileApiController@doctorPatients');
        self::addRoute('POST', '/api/mobile/doctor/patients/link'               , 'MobileApiController@doctorLinkPatient');
        self::addRoute('POST', '/api/mobile/doctor/patients/register'           , 'MobileApiController@doctorRegisterPatient');
        self::addRoute('GET', '/api/mobile/doctor/patients/:id/snapshot'        , 'MobileApiController@doctorPatientSnapshot');
        self::addRoute('GET', '/api/mobile/doctor/patients/:id/history'         , 'MobileApiController@doctorPatientHistory');
        self::addRoute('GET', '/api/mobile/doctor/patients/:id/documents'       , 'MobileApiController@doctorPatientDocuments');
        self::addRoute('POST', '/api/mobile/doctor/patients/:id/documents/upload', 'MobileApiController@doctorPatientDocumentsUpload');
        self::addRoute('GET', '/api/mobile/doctor/notes'                        , 'MobileApiController@doctorNotes');
        self::addRoute('POST', '/api/mobile/doctor/notes'                       , 'MobileApiController@doctorCreateNote');
        self::addRoute('GET', '/api/mobile/doctor/prescriptions'                , 'MobileApiController@doctorPrescriptions');
        self::addRoute('POST', '/api/mobile/doctor/prescriptions'               , 'MobileApiController@doctorCreatePrescription');
        self::addRoute('GET', '/api/mobile/doctor/financial-history'            , 'MobileApiController@doctorFinancialHistory');

        // ── LANDING (public) ──────────────────────────────────
        self::addRoute('GET',  '/',                               'LandingController@index');

        // ── AUTH (guests only) ────────────────────────────────
        self::addRoute('POST', '/',                               'AuthController@login');
        self::addRoute('ANY', '/login',                           'AuthController@login');
        self::addRoute('GET', '/logout',                          'AuthController@logout');
        self::addRoute('GET', '/register',                        'AuthController@registerSelect');
        self::addRoute('ANY', '/register/doctor',                 'AuthController@registerDoctor');
        self::addRoute('ANY', '/register/patient',                'AuthController@registerPatient');
        self::addRoute('ANY', '/register/subscribe',              'AuthController@registerWithPlan');
        self::addRoute('ANY', '/register/verify-email',           'AuthController@verifyEmail');
        self::addRoute('POST','/register/verify-email/resend',    'AuthController@resendVerification');
        self::addRoute('GET', '/auth/google',                     'AuthController@googleRedirect');
        self::addRoute('GET', '/auth/google/callback',            'AuthController@googleCallback');
        self::addRoute('ANY', '/auth/google/complete',            'AuthController@googleComplete');
        self::addRoute('POST','/auth/firebase/callback',          'AuthController@firebaseCallback');
        self::addRoute('POST','/auth/check',                     'AuthController@checkCredentials');
        self::addRoute('ANY', '/forgot-password',                 'AuthController@forgotPassword');
        self::addRoute('ANY', '/reset-password/:token',           'AuthController@resetPassword');

        // ── DASHBOARD ─────────────────────────────────────────
        self::addRoute('GET', '/dashboard',                       'DashboardController@index');
        self::addRoute('POST','/dashboard/kpis',                  'DashboardController@saveKpis');

        // ── APPOINTMENTS (generic – works for both roles) ─────
        self::addRoute('GET',  '/appointments',                   'AppointmentController@index');
        self::addRoute('ANY',  '/appointments/create',            'AppointmentController@create');
        self::addRoute('GET',  '/appointments/:id/pay',                   'AppointmentController@pay');
        self::addRoute('POST', '/appointments/:id/pay-later',             'AppointmentController@payLater');
        self::addRoute('POST', '/appointments/:id/pay-paypal/create',     'AppointmentController@payPaypalCreate');
        self::addRoute('GET',  '/appointments/:id/pay-paypal/capture',    'AppointmentController@payPaypalCapture');
        self::addRoute('GET',  '/appointments/:id/pay-success',           'AppointmentController@paySuccess');
        self::addRoute('ANY',  '/appointments/:id/cancel',                'AppointmentController@cancelById');
        self::addRoute('POST', '/appointments/:id/accept',                'AppointmentController@acceptAppointment');
        self::addRoute('POST', '/appointments/:id/reject',                'AppointmentController@rejectAppointment');
        self::addRoute('POST', '/appointments/:id/start',                 'AppointmentController@startConsultation');
        self::addRoute('POST', '/appointments/:id/checkin',               'AppointmentController@checkin');
        self::addRoute('GET',  '/appointments/:id/patient-qr',             'AppointmentController@patientQrCode');
        self::addRoute('GET',  '/appointments/:id/patient-checkout-code', 'AppointmentController@patientCheckoutCode');
        self::addRoute('POST', '/appointments/:id/validate-checkout',     'AppointmentController@validateCheckout');
        self::addRoute('ANY',  '/appointments/:id/reschedule',            'AppointmentController@reschedule');
        self::addRoute('POST', '/appointments/:id/complete',              'AppointmentController@complete');
        self::addRoute('POST', '/appointments/:id/rate',                  'AppointmentController@rateDoctor');
        self::addRoute('GET',  '/appointments/:id',                       'AppointmentController@show');

        // ── SUPER ADMIN ───────────────────────────────────────
        self::addRoute('GET', '/superadmin/payments',               'SuperAdminController@payments');
        self::addRoute('ANY', '/superadmin/settings',             'SuperAdminController@settings');
        self::addRoute('POST','/superadmin/settings/test-smtp',   'SuperAdminController@testSmtp');
        self::addRoute('ANY', '/superadmin/users',                'SuperAdminController@users');
        self::addRoute('ANY', '/superadmin/users/:id/approve',    'SuperAdminController@approveUser');
        self::addRoute('ANY', '/superadmin/users/:id/suspend',    'SuperAdminController@suspendUser');
        self::addRoute('ANY', '/superadmin/approve-doctor/:id',   'SuperAdminController@approveUser');
        self::addRoute('ANY', '/superadmin/reject-doctor/:id',    'SuperAdminController@suspendUser');
        self::addRoute('ANY', '/superadmin/plans',                'BillingController@adminIndex');
        self::addRoute('POST','/superadmin/plans/update',         'BillingController@adminUpdatePlan');
        self::addRoute('POST','/superadmin/plans/create',         'BillingController@adminCreatePlan');
        self::addRoute('POST','/superadmin/plans/discounts',      'BillingController@adminSaveDiscounts');
        self::addRoute('ANY', '/superadmin/billing',              'BillingController@adminIndex');
        self::addRoute('POST','/superadmin/billing/set-subscription', 'BillingController@adminSetSubscription');
        self::addRoute('ANY', '/superadmin/billing/hospital',     'BillingController@hospitalMode');
        self::addRoute('GET', '/superadmin/licenses',             'SuperAdminController@licenses');
        self::addRoute('ANY', '/superadmin/licenses/create',      'SuperAdminController@createLicense');
        self::addRoute('POST','/superadmin/licenses/discounts',   'SuperAdminController@saveLicenseDiscounts');
        self::addRoute('POST','/superadmin/licenses/send-quote',  'SuperAdminController@sendLicenseQuote');
        self::addRoute('GET',  '/superadmin/licenses/:id/detail',          'SuperAdminController@licenseDetail');
        self::addRoute('POST', '/superadmin/license/:id/assistant-limits',  'SuperAdminController@licenseAssistantLimits');
        self::addRoute('POST', '/superadmin/license/:id/generate-payment-link', 'SuperAdminController@generateLicensePaymentLink');
        self::addRoute('POST','/superadmin/licenses/:id/create-user', 'SuperAdminController@createUserForLicense');
        self::addRoute('POST','/superadmin/licenses/:id/assign-user', 'SuperAdminController@assignUserToLicense');
        self::addRoute('POST','/superadmin/licenses/:id/remove-user', 'SuperAdminController@removeUserFromLicense');
        // Hospital license public payment page
        self::addRoute('GET', '/hospital-pay/:token',             'SuperAdminController@licensePayPage');
        self::addRoute('POST','/hospital-pay/:token/capture',     'SuperAdminController@licensePayCapture');
        self::addRoute('GET', '/hospital-pay/:token/success',     'SuperAdminController@licensePaySuccess');
        self::addRoute('POST','/hospital-pay/:token/setup-admin', 'SuperAdminController@licenseSetupAdmin');
        // Stripe initial license payment
        self::addRoute('POST','/hospital-pay/:token/stripe/init', 'SuperAdminController@licenseStripePayInit');
        self::addRoute('GET', '/hospital-pay/stripe/return',      'SuperAdminController@licenseStripePayReturn');
        self::addRoute('GET', '/superadmin/iot',                  'IoTController@index');
        self::addRoute('ANY', '/superadmin/iot/create',           'IoTController@create');
        self::addRoute('ANY', '/superadmin/iot/:id/delete',       'IoTController@delete');
        self::addRoute('GET', '/superadmin/audit-log',            'SuperAdminController@auditLog');
        self::addRoute('GET', '/superadmin/error-log',            'SuperAdminController@errorLog');
        self::addRoute('ANY', '/superadmin/chatbot',              'SuperAdminController@chatbot');
        self::addRoute('ANY', '/superadmin/gps-tracker',          'SuperAdminController@gpsTracker');

        // ── SUPERADMIN MANAGEMENT ─────────────────────────────
        self::addRoute('GET', '/superadmin/manage-doctors',             'SuperAdminController@manageDoctors');
        self::addRoute('ANY', '/superadmin/manage-doctors/create',    'SuperAdminController@createDoctor');
        self::addRoute('ANY', '/superadmin/manage-doctors/:id/edit',  'SuperAdminController@editDoctor');
        self::addRoute('GET', '/superadmin/manage-patients',          'SuperAdminController@managePatients');
        self::addRoute('ANY', '/superadmin/manage-patients/create',   'SuperAdminController@createPatient');
        self::addRoute('ANY', '/superadmin/manage-patients/:id/edit', 'SuperAdminController@editPatient');
        self::addRoute('GET', '/superadmin/manage-admins',            'SuperAdminController@manageAdmins');
        self::addRoute('ANY', '/superadmin/manage-admins/create',     'SuperAdminController@createAdmin');
        self::addRoute('ANY', '/superadmin/manage-admins/:id/edit',   'SuperAdminController@editAdmin');
        self::addRoute('GET', '/superadmin/manage-assistants',        'SuperAdminController@manageAssistants');
        self::addRoute('GET', '/superadmin/manage-appointments',                        'SuperAdminController@manageAppointments');
        self::addRoute('GET', '/superadmin/manage-appointments/create',                'SuperAdminController@createAppointment');
        self::addRoute('ANY', '/superadmin/manage-appointments/create/:id',            'SuperAdminController@createAppointmentWithDoctor');
        self::addRoute('GET', '/superadmin/manage-appointments/:id/detail',            'SuperAdminController@appointmentDetail');
        self::addRoute('ANY', '/superadmin/manage-appointments/:id/edit',              'SuperAdminController@editAppointment');
        self::addRoute('POST','/superadmin/manage-appointments/:id/start',             'SuperAdminController@startAppointment');
        self::addRoute('POST','/superadmin/manage-appointments/:id/delete',            'SuperAdminController@deleteAppointment');
        self::addRoute('POST','/superadmin/manage-appointments/:id/complete',          'SuperAdminController@completeAppointment');
        self::addRoute('POST','/superadmin/manage-appointments/:id/documents/upload',  'SuperAdminController@uploadAppointmentDocument');
        self::addRoute('ANY', '/superadmin/soap-notes',                                'SuperAdminController@soapNotes');
        self::addRoute('ANY', '/superadmin/prescriptions',                             'SuperAdminController@superadminPrescriptions');
        self::addRoute('GET', '/superadmin/prescriptions/:id/print',                   'SuperAdminController@printSuperadminPrescription');
        self::addRoute('ANY', '/superadmin/users/:id/edit',                  'SuperAdminController@editUser');
        self::addRoute('POST','/superadmin/users/:id/toggle-status', 'SuperAdminController@toggleStatus');
        self::addRoute('POST','/superadmin/users/:id/delete',        'SuperAdminController@deleteUser');

        // ── HOSPITAL ADMIN ────────────────────────────────────
        self::addRoute('GET', '/hospital/dashboard',              'HospitalAdminController@dashboard');
        self::addRoute('GET', '/hospital/doctors',                'HospitalAdminController@doctors');
        self::addRoute('ANY', '/hospital/doctors/create',         'HospitalAdminController@createDoctor');
        self::addRoute('POST','/hospital/doctors/:id/remove',     'HospitalAdminController@removeDoctor');
        self::addRoute('GET', '/hospital/patients',               'HospitalAdminController@patients');
        self::addRoute('ANY', '/hospital/patients/create',        'HospitalAdminController@createPatient');
        self::addRoute('POST','/hospital/patients/:id/remove',    'HospitalAdminController@removePatient');
        self::addRoute('GET', '/hospital/appointments',           'HospitalAdminController@appointments');
        self::addRoute('GET', '/hospital/assistants',             'HospitalAdminController@assistants');
        self::addRoute('ANY',  '/hospital/settings',                          'HospitalAdminController@settings');
        self::addRoute('POST', '/hospital/settings/assistant-limits',         'HospitalAdminController@settingsAssistantLimits');
        self::addRoute('GET',  '/hospital/renew-license',                     'HospitalAdminController@renewLicense');
        self::addRoute('POST', '/hospital/renew-license/create',              'HospitalAdminController@renewLicenseCreate');
        self::addRoute('POST', '/hospital/renew-license/capture',             'HospitalAdminController@renewLicenseCapture');
        self::addRoute('POST', '/hospital/renew-license/stripe/init',         'HospitalAdminController@renewLicenseStripeInit');
        self::addRoute('GET',  '/hospital/renew-license/stripe/return',       'HospitalAdminController@renewLicenseStripeReturn');
        // Removed MP routes
        // Public renewal URL (no auth required — token-based)
        self::addRoute('GET',  '/hospital/renew-license/pay',                 'HospitalAdminController@renewLicensePay');
        self::addRoute('POST', '/hospital/renew-license/pay/init',            'HospitalAdminController@renewLicensePayInit');
        self::addRoute('POST', '/hospital/renew-license/pay/capture',         'HospitalAdminController@renewLicensePayCapture');
        self::addRoute('POST', '/hospital/renew-license/stripe/pay/init',     'HospitalAdminController@renewLicenseStripePayInit');
        self::addRoute('GET',  '/hospital/renew-license/stripe/pay/return',   'HospitalAdminController@renewLicenseStripePayReturn');
        // Removed MP routes
        // User expansion
        self::addRoute('GET',  '/hospital/expand-users',                      'HospitalAdminController@expandUsers');
        self::addRoute('POST', '/hospital/expand-users/stripe/init',          'HospitalAdminController@expandUsersStripeInit');
        self::addRoute('GET',  '/hospital/expand-users/stripe/return',        'HospitalAdminController@expandUsersStripeReturn');
        self::addRoute('POST', '/hospital/expand-users/paypal/create',        'HospitalAdminController@expandUsersPaypalCreate');
        self::addRoute('POST', '/hospital/expand-users/paypal/capture',       'HospitalAdminController@expandUsersPaypalCapture');
        // Removed MP routes
        self::addRoute('POST','/hospital/avatar',                 'HospitalAdminController@avatar');
        self::addRoute('POST','/hospital/avatar/remove',          'HospitalAdminController@removeAvatar');
        self::addRoute('POST','/hospital/change-password',        'HospitalAdminController@changePassword');
        self::addRoute('POST','/user/change-password',            'AuthController@changePasswordAjax');

        // ── DOCTOR ────────────────────────────────────────────
        self::addRoute('ANY', '/doctor/profile',                  'DoctorController@profile');
        self::addRoute('POST','/doctor/avatar',                   'DoctorController@avatar');
        self::addRoute('POST','/doctor/avatar/remove',            'DoctorController@removeAvatar');
        self::addRoute('ANY', '/doctor/availability',             'DoctorController@availability');
        self::addRoute('GET', '/doctor/calendar',                 'DoctorController@calendar');
        self::addRoute('GET', '/doctor/patients',                 'DoctorController@patients');
        self::addRoute('ANY', '/doctor/patients/register',        'DoctorController@registerPatient');
        self::addRoute('GET', '/doctor/patients/:id',             'DoctorController@patientDetail');
        self::addRoute('GET', '/doctor/appointments',             'AppointmentController@index');
        self::addRoute('ANY', '/doctor/appointments/create',      'AppointmentController@create');
        self::addRoute('GET', '/doctor/appointments/:id',         'AppointmentController@show');
        self::addRoute('GET', '/doctor/history/:patient_id',      'DoctorController@patientHistory');
        self::addRoute('GET', '/doctor/activity',                 'DoctorController@activity');
        self::addRoute('ANY',  '/doctor/notes',                          'DoctorController@notes');
        self::addRoute('POST', '/doctor/notes/create',                    'DoctorController@notes');
        self::addRoute('ANY',  '/doctor/notes/:id',                       'AiController@notes');
        self::addRoute('ANY',  '/doctor/soap/new',                        'AiController@soapNew');
        self::addRoute('ANY',  '/doctor/soap/:note_id',                   'AiController@soapNote');
        self::addRoute('ANY',  '/doctor/consultation-templates',          'DoctorController@consultationTemplates');
        self::addRoute('GET', '/doctor/documents',                'DoctorController@documents');
        self::addRoute('GET', '/doctor/subscription',             'BillingController@doctorSubscription');
        self::addRoute('ANY', '/doctor/prescriptions',            'DoctorController@prescriptions');
        self::addRoute('POST','/doctor/prescriptions/:id/delete', 'DoctorController@deletePrescription');
        self::addRoute('GET', '/doctor/prescriptions/:id/print',  'DoctorController@printPrescription');
        self::addRoute('GET', '/doctor/patient-vitals',           'DoctorController@patientVitals');

        // Phase 3 — Doctor: Expediente Clínico + Historial Financiero + Asistentes
        self::addRoute('GET',  '/doctor/patients/:id/expediente',               'DoctorController@patientExpediente');
        self::addRoute('POST', '/doctor/patients/:id/expediente',               'DoctorController@patientExpediente');
        self::addRoute('GET',  '/doctor/patients/:id/snapshot',                 'DoctorController@patientSnapshot');
        self::addRoute('POST', '/doctor/patients/:id/expediente/notes',         'DoctorController@patientExpedienteNote');
        self::addRoute('POST', '/doctor/patients/:id/expediente/upload',        'DoctorController@patientDocumentUpload');
        self::addRoute('GET',  '/doctor/patients/:id/expediente/print',         'DoctorController@patientExpedientePrint');
        self::addRoute('POST', '/doctor/patients/:id/update-basics',            'DoctorController@updatePatientBasics');
        self::addRoute('POST', '/doctor/notes/:id/sign',                  'DoctorController@signNote');
        self::addRoute('POST', '/doctor/notes/:id/autosave',              'DoctorController@autosaveNote');
        self::addRoute('GET',  '/doctor/financial-history',               'DoctorController@financialHistory');
        self::addRoute('GET',  '/doctor/assistants',                      'DoctorController@assistants');
        self::addRoute('POST', '/doctor/assistants/invite',               'DoctorController@inviteAssistant');
        self::addRoute('POST', '/doctor/assistants/add',                  'DoctorController@addDirectAssistant');
        self::addRoute('POST', '/doctor/assistants/request',              'DoctorController@sendAssistantRequest');
        self::addRoute('POST', '/doctor/assistants/:id/accept',           'DoctorController@acceptAssistant');
        self::addRoute('POST', '/doctor/assistants/:id/remove',           'DoctorController@removeAssistant');
        self::addRoute('POST', '/doctor/assistants/:id/pay',              'DoctorController@configAssistantPay');

        // ── PATIENT ───────────────────────────────────────────
        self::addRoute('ANY', '/patient/profile',                 'PatientController@profile');
        self::addRoute('POST','/patient/avatar',                  'PatientController@avatar');
        self::addRoute('POST','/patient/avatar/remove',           'PatientController@removeAvatar');
        self::addRoute('GET', '/patient/find-doctor',             'PatientController@findDoctor');
        self::addRoute('ANY', '/patient/book/:doctor_id',         'PatientController@book');
        self::addRoute('GET', '/patient/appointments',            'AppointmentController@index');
        self::addRoute('ANY', '/patient/appointments/:id/cancel', 'AppointmentController@cancelById');
        self::addRoute('GET', '/patient/history',                 'PatientController@history');
        self::addRoute('ANY', '/patient/reviews/:doctor_id',      'ReviewController@create');
        self::addRoute('GET', '/patient/ai-assistant',            'AiController@assistant');
        self::addRoute('ANY', '/patient/expediente',              'PatientController@expediente');

        // Phase 3 — Patient: Expediente + Historial Financiero
        self::addRoute('ANY',  '/patient/expediente',             'PatientController@expediente');
        self::addRoute('POST', '/patient/expediente/upload',      'PatientController@expedienteUpload');
        self::addRoute('GET',  '/patient/expediente/print',       'PatientController@expedientePrint');
        self::addRoute('GET',  '/patient/documents',              'PatientController@documents');
        self::addRoute('POST', '/patient/documents/upload',       'PatientController@documentsUpload');
        self::addRoute('POST', '/patient/documents/:id/delete',   'PatientController@documentDelete');
        self::addRoute('GET',  '/patient/financial-history',      'PatientController@financialHistory');

        // Phase 4 — Assistant registration & invitation
        self::addRoute('ANY', '/register/assistant',                      'AuthController@registerAssistant');
        self::addRoute('ANY', '/register/assistant/invite/:token',        'AssistantController@registerInvite');

        // Phase 4 — Assistant panel
        self::addRoute('GET', '/assistant/dashboard',                     'AssistantController@dashboard');
        self::addRoute('GET', '/assistant/patients',                      'AssistantController@patients');
        self::addRoute('GET', '/assistant/patients/:id/expediente',       'AssistantController@patientExpediente');
        self::addRoute('GET', '/assistant/find-doctor',                   'AssistantController@findDoctor');
        self::addRoute('POST','/assistant/find-doctor',                   'AssistantController@findDoctor');
        self::addRoute('GET', '/assistant/doctors',                       'AssistantController@doctors');
        self::addRoute('POST','/assistant/doctors/request',               'AssistantController@sendDoctorRequest');
        self::addRoute('POST','/assistant/doctors/:id/cancel',            'AssistantController@cancelDoctorRequest');
        self::addRoute('POST','/assistant/doctors/:id/accept',            'AssistantController@acceptDoctorRequest');
        self::addRoute('POST','/assistant/doctors/:id/reject',            'AssistantController@rejectDoctorRequest');
        self::addRoute('ANY', '/assistant/profile',                        'AssistantController@profile');
        self::addRoute('POST','/assistant/set-active-doctor',              'AssistantController@setActiveDoctor');
        self::addRoute('ANY', '/assistant/notes',                         'AssistantController@notes');
        self::addRoute('ANY', '/assistant/prescriptions',                 'AssistantController@prescriptions');
        self::addRoute('ANY', '/assistant/appointments/create',           'AppointmentController@create');

        // ── AI ────────────────────────────────────────────────
        self::addRoute('GET', '/ai/chat',                         'AiController@chat');

        // ── BILLING ───────────────────────────────────────────
        self::addRoute('GET', '/billing/plans',                           'BillingController@plans');
        self::addRoute('ANY', '/billing/subscribe',                       'BillingController@subscribe');
        self::addRoute('GET', '/billing/subscribe/success',               'BillingController@subscribeSuccess');
        self::addRoute('GET', '/billing/invoices',                        'BillingController@invoices');

        // PayPal subscription flow (doctor)
        self::addRoute('GET',  '/billing/paypal/return',                  'BillingController@subscribeReturn');
        self::addRoute('GET',  '/billing/paypal/cancel',                  'BillingController@subscribeCancel');

        // Appointment payment (patient)
        self::addRoute('GET',  '/billing/appointment/:appointment_id/pay',              'BillingController@appointmentPay');
        self::addRoute('GET',  '/billing/appointment/:appointment_id/checkout',         'BillingController@appointmentCheckout');
        self::addRoute('GET',  '/billing/appointment/:appointment_id/payment-cancelled','BillingController@appointmentPaymentCancelled');
        self::addRoute('POST', '/billing/appointment/pay',                              'BillingController@appointmentCreateOrder');
        self::addRoute('GET',  '/billing/appointment/return',                           'BillingController@appointmentReturn');

        // Stripe appointment flow
        self::addRoute('POST', '/billing/appointment/stripe/create-intent', 'BillingController@stripeCreateIntent');
        self::addRoute('GET',  '/billing/appointment/stripe/return',        'BillingController@stripeReturn');
        self::addRoute('POST', '/billing/stripe/webhook',                   'BillingController@stripeWebhook');

        // Multi-gateway modal endpoints
        self::addRoute('GET',  '/billing/appointment/:appointment_id/payment-info', 'BillingController@appointmentPaymentInfo');
        self::addRoute('POST', '/billing/appointment/paypal/create-order',          'BillingController@paypalCreateOrderAjax');
        self::addRoute('GET',  '/billing/appointment/paypal/popup-return',          'BillingController@paypalPopupReturn');
        self::addRoute('POST', '/billing/appointment/paypal/capture',               'BillingController@paypalCaptureAjax');

        // ── Subscription — Stripe Checkout ────────────────────
        self::addRoute('GET',  '/billing/subscribe/stripe/return',  'BillingController@stripeSubscribeReturn');
        self::addRoute('GET',  '/billing/subscribe/stripe/cancel',  'BillingController@stripeSubscribeCancel');

        // Removed MP subscription routes

        // ── Subscription — Cancel (GET=confirm page, POST=execute) ─────────
        self::addRoute('ANY',  '/billing/subscribe/cancel/:id',     'BillingController@cancelSubscription');

        // SuperAdmin: payment methods page
        self::addRoute('ANY',  '/superadmin/payment-methods',               'SuperAdminController@paymentMethods');

        // ── SHARED ────────────────────────────────────────────
        self::addRoute('GET',  '/appointment/video/:id',          'AppointmentController@video');

        // ── AJAX / API ────────────────────────────────────────
        self::addRoute('GET',  '/api/calendar/events',            'CalendarController@events');
        self::addRoute('GET',  '/api/calendar/availability',      'CalendarController@availabilitySlots');
        self::addRoute('GET',  '/api/calendar/doctor-days',       'CalendarController@doctorDays');
        self::addRoute('POST', '/api/calendar/create',            'CalendarController@create');
        self::addRoute('POST', '/doctor/availability/override',   'DoctorController@availabilityOverride');
        self::addRoute('POST', '/api/ai/stream',                  'AiController@stream');
        self::addRoute('GET',  '/api/ai/csrf',                    'AiController@csrfRefresh');
        self::addRoute('POST', '/api/ai/briefing',                'AiController@briefing');
        self::addRoute('POST', '/api/ai/assistant',               'AiController@assistantStream');
        self::addRoute('POST', '/billing/paypal/webhook',             'BillingController@paypalWebhook');
        self::addRoute('POST', '/api/paypal/webhook',                 'BillingController@paypalWebhook');

        // ── LANDING: enterprise quoter ────────────────────────
        self::addRoute('POST', '/landing/quote-request',          'LandingController@quoteRequest');

        // ── CRON ─────────────────────────────────────────────
        self::addRoute('GET', '/cron/reminders',                            'CronController@reminders');
        self::addRoute('GET', '/cron/checkin-codes',                        'CronController@checkinCodes');
        self::addRoute('GET', '/cron/cancel-expired-payments',              'CronController@cancelExpiredPayments');
        self::addRoute('GET', '/cron/mark-missed',                          'CronController@markMissed');
        self::addRoute('GET', '/cron/payouts',                              'CronController@payouts');
        self::addRoute('GET', '/cron/subscription-renewal-reminders',       'CronController@subscriptionRenewalReminders');
        self::addRoute('GET', '/cron/expire-subscriptions',                 'CronController@expireSubscriptions');
        self::addRoute('GET', '/cron/license-expiry-reminders',             'CronController@licenseExpiryReminders');
        self::addRoute('POST', '/api/qr/generate',                'ApiController@generateQR');
        self::addRoute('GET',  '/api/iot/status',                 'IoTController@status');
        self::addRoute('POST', '/api/notifications/read-all',     'NotificationController@readAll');
        self::addRoute('GET',  '/notifications',                   'NotificationController@index');
        self::addRoute('POST', '/api/notifications/:id/read',      'NotificationController@readOne');
        self::addRoute('GET',  '/api/doctor/:id/profile',         'PatientController@apiDoctorProfile');

        // ── Chat ─────────────────────────────────────────────
        self::addRoute('GET',  '/chat',                           'ChatController@inbox');
        self::addRoute('GET',  '/chat/:other_user_id',            'ChatController@thread');
        self::addRoute('POST', '/api/chat/send',                  'ChatController@send');
        self::addRoute('GET',  '/api/chat/poll',                  'ChatController@poll');

        // ── NOTIFICATIONS (poll endpoint from main) ───────────
        self::addRoute('GET',  '/api/notifications/poll',         'NotificationController@poll');

        // ── SUPPORT ───────────────────────────────────────────
        self::addRoute('GET',  '/support',                        'SupportController@index');
        self::addRoute('GET',  '/support/create',                 'SupportController@createForm');
        self::addRoute('POST', '/support/create',                 'SupportController@createPost');
        self::addRoute('GET',  '/support/:id',                    'SupportController@view');
        self::addRoute('POST', '/support/:id/reply',              'SupportController@reply');
        self::addRoute('POST', '/support/:id/close',              'SupportController@close');
        // SuperAdmin support routes
        self::addRoute('GET',  '/superadmin/support',             'SupportController@adminIndex');
        self::addRoute('GET',  '/superadmin/support/:id',         'SupportController@adminView');
        self::addRoute('POST', '/superadmin/support/:id/reply',   'SupportController@adminReply');
        self::addRoute('POST', '/superadmin/support/:id/status',  'SupportController@adminSetStatus');
        // HospitalAdmin support routes
        self::addRoute('GET',  '/hospital/support',               'SupportController@hospitalAdminIndex');
        self::addRoute('GET',  '/hospital/support/:id',           'SupportController@hospitalAdminView');
        self::addRoute('POST', '/hospital/support/:id/reply',     'SupportController@hospitalAdminReply');
        self::addRoute('POST', '/hospital/support/:id/status',    'SupportController@hospitalAdminSetStatus');
    }
}
