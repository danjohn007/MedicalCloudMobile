<?php
declare(strict_types=1);

/**
 * MobileApiController — REST JSON API for the iOS/Android patient app.
 *
 * Authentication: JWT Bearer tokens (stateless — no PHP sessions).
 * All responses are JSON.  CORS headers allow the app origin.
 *
 * Routes registered in Router.php under /api/mobile/*
 */
class MobileApiController extends Controller
{
    /** @var array<string, bool> */
    private array $tableExistsCache = [];
    /** @var array<string, bool> */
    private array $columnExistsCache = [];
    /** @var string[] */
    private const SUPPORT_ALLOWED_MIME = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    private const SUPPORT_MAX_BYTES = 10 * 1024 * 1024;

    private function jwtSecret(): string
    {
        return defined('Config::MOBILE_JWT_SECRET')
            ? constant('Config::MOBILE_JWT_SECRET')
            : 'CHANGE_THIS_SECRET_IN_CONFIG';
    }

    private function apiHeaders(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private function ok(array $data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    private function fail(string $message, int $code = 400): void
    {
        http_response_code($code);
        echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }

    private function body(): array
    {
        $raw = file_get_contents('php://input');
        return (array)(json_decode($raw ?: '{}', true) ?? []);
    }

    private function jwtEncode(array $payload): string
    {
        $header  = $this->base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = $this->base64url(json_encode($payload));
        $sig     = $this->base64url(hash_hmac('sha256', "$header.$payload", $this->jwtSecret(), true));
        return "$header.$payload.$sig";
    }

    private function jwtDecode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$header, $payload, $sig] = $parts;
        $expected = $this->base64url(hash_hmac('sha256', "$header.$payload", $this->jwtSecret(), true));
        if (!hash_equals($expected, $sig)) return null;
        $data = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        if (!is_array($data)) return null;
        if (isset($data['exp']) && $data['exp'] < time()) return null;
        return $data;
    }

    private function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function requireJwt(array $roles = ['patient']): array
    {
        $auth = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';
        if ($auth === '') {
            $h = getallheaders();
            $auth = $h['Authorization'] ?? $h['authorization'] ?? '';
        }
        if (!str_starts_with($auth, 'Bearer ')) {
            $this->fail('Token requerido.', 401);
        }
        $payload = $this->jwtDecode(substr($auth, 7));
        if (!$payload) {
            $this->fail('Token invalido o expirado.', 401);
        }
        $role = (string)($payload['role'] ?? '');
        if (!in_array($role, $roles, true)) {
            $this->fail('No tienes permisos para usar este endpoint movil.', 403);
        }
        return $payload;
    }

    private function requireDoctorJwt(bool $requireSubscription = false): array
    {
        $payload = $this->requireJwt(['doctor']);
        $doctorId = (int)($payload['sub'] ?? 0);

        if ($doctorId < 1) {
            $this->fail('Doctor invalido.', 401);
        }

        if ($requireSubscription && !$this->doctorHasActiveSubscription($doctorId)) {
            $this->fail('Tu suscripcion actual no permite usar el workspace movil del doctor.', 403);
        }

        return $payload;
    }

    private function doctorHasActiveSubscription(int $doctorId): bool
    {
        try {
            $stmt = Database::getInstance()->prepare(
                "SELECT id FROM subscriptions WHERE doctor_id = ? AND status IN ('active','trial','paid') LIMIT 1"
            );
            $stmt->execute([$doctorId]);
            return (bool)$stmt->fetchColumn();
        } catch (\Throwable) {
            return true;
        }
    }

    private function doctorHospitalLicenseId(int $doctorId): ?int
    {
        try {
            $stmt = Database::getInstance()->prepare(
                'SELECT hospital_license_id FROM doctor_profiles WHERE user_id = ? LIMIT 1'
            );
            $stmt->execute([$doctorId]);
            $licenseId = (int)($stmt->fetchColumn() ?: 0);
            return $licenseId > 0 ? $licenseId : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function buildDoctorLocation(array $row): string
    {
        $parts = [
            trim((string)($row['address'] ?? '')),
            trim((string)($row['city'] ?? '')),
            trim((string)($row['state'] ?? '')),
        ];

        return implode(', ', array_values(array_filter($parts, static fn(string $value): bool => $value !== '')));
    }

    private function formatDoctorAppointment(array $row, string $baseUrl): array
    {
        return [
            'id' => (int)($row['id'] ?? 0),
            'patient_id' => (int)($row['patient_id'] ?? 0),
            'scheduled_at' => (string)($row['scheduled_at'] ?? ''),
            'end_at' => $row['end_at'] ?? null,
            'checked_in_at' => $row['checked_in_at'] ?? null,
            'checked_out_at' => $row['checked_out_at'] ?? null,
            'pay_deadline' => $row['pay_deadline'] ?? null,
            'type' => (string)($row['type'] ?? ''),
            'status' => (string)($row['status'] ?? ''),
            'reason' => $row['reason'] ?? null,
            'fee' => (float)($row['consultation_fee'] ?? 0),
            'payment_status' => $row['payment_status'] ?? null,
            'patient_name' => (string)($row['patient_name'] ?? ''),
            'patient_avatar' => $this->absoluteUrl($row['patient_avatar'] ?? null, $baseUrl),
            'patient_phone' => $row['patient_phone'] ?? null,
            'location' => $this->buildDoctorLocation($row),
            'specialty' => $row['specialty'] ?? null,
        ];
    }

    private function formatDoctorPatient(array $row, string $baseUrl): array
    {
        $age = null;
        if (!empty($row['birth_date'])) {
            try {
                $age = (new \DateTime((string)$row['birth_date']))->diff(new \DateTime())->y;
            } catch (\Throwable) {
                $age = null;
            }
        }

        return [
            'id' => (int)($row['id'] ?? 0),
            'name' => (string)($row['name'] ?? ''),
            'email' => (string)($row['email'] ?? ''),
            'avatar_url' => $this->absoluteUrl($row['avatar_url'] ?? null, $baseUrl),
            'phone' => $row['phone'] ?? null,
            'birth_date' => $row['birth_date'] ?? null,
            'age' => $age,
            'gender' => $row['gender'] ?? null,
            'blood_type' => $row['blood_type'] ?? null,
            'city' => $row['city'] ?? null,
            'address' => $row['address'] ?? null,
            'allergies' => $row['allergies'] ?? null,
            'chronic_conditions' => $row['chronic_conditions'] ?? null,
            'current_medications' => $row['current_medications'] ?? null,
            'last_appointment' => $row['last_appointment'] ?? null,
            'total_appointments' => (int)($row['total_appointments'] ?? 0),
            'emergency_contact_name' => $row['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $row['emergency_contact_phone'] ?? null,
        ];
    }

    // ── Safe DB helper ────────────────────────────────────────
    private function resolveConsultationFee(array $profile, string $type, bool $waivePayment = false): float
    {
        if ($waivePayment) {
            return 0.0;
        }

        $consultationFee = (float)($profile['consultation_fee'] ?? 0);
        $telemedicineFee = (float)($profile['telemedicine_fee'] ?? 0);
        $homeVisitFee = (float)($profile['home_visit_fee'] ?? 0);

        return match ($type) {
            'virtual' => $telemedicineFee > 0 ? $telemedicineFee : $consultationFee,
            'home_visit' => $homeVisitFee > 0 ? $homeVisitFee : $consultationFee,
            default => $consultationFee,
        };
    }

    private function hydrateDoctorPricing(int $doctorId, array $profile): array
    {
        try {
            $stmt = Database::getInstance()->prepare(
                'SELECT consultation_fee, telemedicine_fee, home_visit_fee, duration_minutes
                 FROM doctor_profiles
                 WHERE user_id = ? LIMIT 1'
            );
            $stmt->execute([$doctorId]);
            $pricing = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable) {
            return $profile;
        }

        if (!$pricing) {
            return $profile;
        }

        foreach (['consultation_fee', 'telemedicine_fee', 'home_visit_fee', 'duration_minutes'] as $field) {
            if (array_key_exists($field, $pricing) && $pricing[$field] !== null && $pricing[$field] !== '') {
                $profile[$field] = $pricing[$field];
            }
        }

        return $profile;
    }

    private function ageFromBirthDate(?string $birthDate): ?int
    {
        if (!$birthDate) {
            return null;
        }

        try {
            return (new \DateTime($birthDate))->diff(new \DateTime())->y;
        } catch (\Throwable) {
            return null;
        }
    }

    private function hasTable(string $table): bool
    {
        if (array_key_exists($table, $this->tableExistsCache)) {
            return $this->tableExistsCache[$table];
        }

        try {
            $stmt = Database::getInstance()->prepare('SHOW TABLES LIKE ?');
            $stmt->execute([$table]);
            return $this->tableExistsCache[$table] = (bool)$stmt->fetchColumn();
        } catch (\Throwable) {
            return $this->tableExistsCache[$table] = false;
        }
    }

    private function hasColumn(string $table, string $column): bool
    {
        $cacheKey = $table . '.' . $column;
        if (array_key_exists($cacheKey, $this->columnExistsCache)) {
            return $this->columnExistsCache[$cacheKey];
        }

        try {
            $stmt = Database::getInstance()->prepare(sprintf('SHOW COLUMNS FROM `%s` LIKE ?', $table));
            $stmt->execute([$column]);
            return $this->columnExistsCache[$cacheKey] = (bool)$stmt->fetchColumn();
        } catch (\Throwable) {
            return $this->columnExistsCache[$cacheKey] = false;
        }
    }

    private function normalizeAccessCode(string $value): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9]/', '', $value));
    }

    private function generateAccessCode(int $length = 10): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $maxIndex = strlen($alphabet) - 1;
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= $alphabet[random_int(0, $maxIndex)];
        }

        return $code;
    }

    private function ensurePatientAccessCode(int $patientId): ?string
    {
        if (!$this->hasColumn('patient_profiles', 'doctor_access_code')) {
            return null;
        }

        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT doctor_access_code FROM patient_profiles WHERE user_id = ? LIMIT 1');
        $stmt->execute([$patientId]);
        $current = $this->normalizeAccessCode((string)($stmt->fetchColumn() ?: ''));
        if (strlen($current) >= 8) {
            return $current;
        }

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = $this->generateAccessCode(10);
            try {
                $db->prepare(
                    'UPDATE patient_profiles
                     SET doctor_access_code = ?
                     WHERE user_id = ? AND (doctor_access_code IS NULL OR doctor_access_code = "")'
                )->execute([$candidate, $patientId]);
            } catch (\Throwable) {
                return null;
            }

            $stmt->execute([$patientId]);
            $saved = $this->normalizeAccessCode((string)($stmt->fetchColumn() ?: ''));
            if ($saved !== '') {
                return $saved;
            }
        }

        return null;
    }

    private function doctorPatientLinksEnabled(): bool
    {
        return $this->hasTable('doctor_patient_links');
    }

    private function patientHasDirectDoctorAssociation(int $doctorId, int $patientId): bool
    {
        $stmt = Database::getInstance()->prepare(
            'SELECT 1 FROM patient_profiles WHERE user_id = ? AND associated_doctor_id = ? LIMIT 1'
        );
        $stmt->execute([$patientId, $doctorId]);
        return (bool)$stmt->fetchColumn();
    }

    private function doctorHasCompletedAppointmentWithPatient(int $doctorId, int $patientId): bool
    {
        $stmt = Database::getInstance()->prepare(
            "SELECT 1
             FROM appointments
             WHERE doctor_id = ?
               AND patient_id = ?
               AND status IN ('completed','finished')
             LIMIT 1"
        );
        $stmt->execute([$doctorId, $patientId]);
        return (bool)$stmt->fetchColumn();
    }

    private function doctorHasPatientLink(int $doctorId, int $patientId): bool
    {
        if (!$this->doctorPatientLinksEnabled()) {
            return false;
        }

        $stmt = Database::getInstance()->prepare(
            'SELECT 1
             FROM doctor_patient_links
             WHERE doctor_id = ? AND patient_id = ? AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute([$doctorId, $patientId]);
        return (bool)$stmt->fetchColumn();
    }

    private function upsertDoctorPatientLink(int $doctorId, int $patientId, string $source): void
    {
        if (!$this->doctorPatientLinksEnabled()) {
            return;
        }

        try {
            Database::getInstance()->prepare(
                "INSERT INTO doctor_patient_links
                    (doctor_id, patient_id, link_source, linked_by_user_id, is_active, verified_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 1, NOW(), NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                    link_source = VALUES(link_source),
                    linked_by_user_id = VALUES(linked_by_user_id),
                    is_active = 1,
                    verified_at = NOW(),
                    updated_at = NOW()"
            )->execute([$doctorId, $patientId, $source, $doctorId]);
        } catch (\Throwable) {
        }
    }

    private function getDoctorPatientAccessReason(int $doctorId, int $patientId): ?string
    {
        $licenseId = $this->doctorHospitalLicenseId($doctorId);
        if ($licenseId) {
            $stmt = Database::getInstance()->prepare(
                "SELECT 1 FROM users WHERE id = ? AND hospital_license_id = ? AND status = 'active' LIMIT 1"
            );
            $stmt->execute([$patientId, $licenseId]);
            if ((bool)$stmt->fetchColumn()) {
                return 'hospital';
            }
        }

        if ($this->patientHasDirectDoctorAssociation($doctorId, $patientId)) {
            $this->upsertDoctorPatientLink($doctorId, $patientId, 'doctor_registered');
            return 'doctor_registered';
        }

        if ($this->doctorHasPatientLink($doctorId, $patientId)) {
            return 'linked';
        }

        if ($this->doctorHasCompletedAppointmentWithPatient($doctorId, $patientId)) {
            $this->upsertDoctorPatientLink($doctorId, $patientId, 'completed_appointment');
            return 'completed_appointment';
        }

        return null;
    }

    private function doctorCanAccessPatient(int $doctorId, int $patientId): bool
    {
        return $this->getDoctorPatientAccessReason($doctorId, $patientId) !== null;
    }

    private function publicDoctorProfileScoreSql(): string
    {
        return implode(' + ', [
            '(CASE WHEN TRIM(COALESCE(dp.bio, "")) <> "" THEN 2 ELSE 0 END)',
            '(CASE WHEN TRIM(COALESCE(dp.subspecialty, "")) <> "" THEN 1 ELSE 0 END)',
            '(CASE WHEN TRIM(COALESCE(dp.address, "")) <> "" THEN 2 ELSE 0 END)',
            '(CASE WHEN TRIM(COALESCE(dp.city, "")) <> "" THEN 1 ELSE 0 END)',
            '(CASE WHEN TRIM(COALESCE(dp.state, "")) <> "" THEN 1 ELSE 0 END)',
            '(CASE WHEN dp.lat IS NOT NULL AND dp.lng IS NOT NULL THEN 2 ELSE 0 END)',
            '(CASE WHEN COALESCE(dp.duration_minutes, 0) > 0 THEN 1 ELSE 0 END)',
            '(CASE WHEN TRIM(COALESCE(dp.schedule_json, "")) <> "" THEN 1 ELSE 0 END)',
            '(CASE WHEN TRIM(COALESCE(dp.photo, u.avatar_url, "")) <> "" THEN 1 ELSE 0 END)',
            '(CASE WHEN TRIM(COALESCE(dp.cedula, "")) <> "" THEN 1 ELSE 0 END)',
        ]);
    }

    private function publicDoctorSearchBase(array $filters): array
    {
        $wheres = [
            'u.status = "active"',
            'u.name != "Doctor"',
            'COALESCE(dp.consultation_fee, 0) > 0',
            'COALESCE(dp.telemedicine_fee, 0) > 0',
        ];
        $params = [];

        if (!empty($filters['search'])) {
            $wheres[] = '(u.name LIKE ? OR dp.specialty LIKE ? OR dp.city LIKE ? OR dp.address LIKE ?)';
            $needle = '%' . $filters['search'] . '%';
            array_push($params, $needle, $needle, $needle, $needle);
        }

        if (!empty($filters['specialty'])) {
            $wheres[] = 'dp.specialty LIKE ?';
            $params[] = '%' . $filters['specialty'] . '%';
        }

        if (!empty($filters['city'])) {
            $wheres[] = '(LOWER(dp.city) LIKE LOWER(?) OR LOWER(dp.state) LIKE LOWER(?))';
            $needle = '%' . $filters['city'] . '%';
            $params[] = $needle;
            $params[] = $needle;
        }

        if (!empty($filters['max_fee']) && (float)$filters['max_fee'] > 0) {
            $wheres[] = 'dp.consultation_fee <= ?';
            $params[] = (float)$filters['max_fee'];
        }

        return ['WHERE ' . implode(' AND ', $wheres), $params];
    }

    private function managedPatientsRows(int $doctorId): array
    {
        $licenseId = $this->doctorHospitalLicenseId($doctorId);
        if ($licenseId) {
            return (new DoctorProfile())->getPatientsOf($doctorId, $licenseId);
        }

        $linkExistsSql = $this->doctorPatientLinksEnabled()
            ? 'OR EXISTS (
                    SELECT 1
                    FROM doctor_patient_links dpl
                    WHERE dpl.doctor_id = ?
                      AND dpl.patient_id = u.id
                      AND dpl.is_active = 1
                )'
            : '';

        $params = [$doctorId, $doctorId, $doctorId];
        if ($this->doctorPatientLinksEnabled()) {
            $params[] = $doctorId;
        }

        return $this->safeQuery(
            "SELECT DISTINCT u.id, u.name, u.email, u.avatar_url,
                    pp.birth_date, pp.gender, pp.blood_type,
                    pp.phone, pp.address, pp.city,
                    pp.emergency_contact_name, pp.emergency_contact_phone,
                    COALESCE(NULLIF(pp.allergies, ''), pmr.allergies) AS allergies,
                    pp.chronic_conditions AS chronic_conditions,
                    COALESCE(NULLIF(pp.current_medications, ''), pmr.current_medications) AS current_medications,
                    pp.associated_doctor_id,
                    MAX(a.scheduled_at) AS last_appointment,
                    COUNT(a.id) AS total_appointments
             FROM users u
             JOIN patient_profiles pp ON pp.user_id = u.id
             LEFT JOIN patient_medical_records pmr ON pmr.patient_id = u.id
             LEFT JOIN appointments a ON a.patient_id = u.id AND a.doctor_id = ?
             WHERE u.status = 'active'
               AND (
                    pp.associated_doctor_id = ?
                    OR EXISTS (
                        SELECT 1
                        FROM appointments a2
                        WHERE a2.doctor_id = ?
                          AND a2.patient_id = u.id
                          AND a2.status IN ('completed', 'finished')
                    )
                    {$linkExistsSql}
               )
             GROUP BY u.id
             ORDER BY MAX(a.scheduled_at) DESC, u.name ASC",
            $params
        );
    }

    private function safeQuery(string $sql, array $params = []): array
    {
        try {
            $stmt = Database::getInstance()->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return []; // table doesn't exist or other error → return empty
        }
    }

    private function isValidTimeValue(string $value): bool
    {
        return (bool)preg_match('/^\d{2}:\d{2}$/', $value);
    }

    private function timeToMinutes(string $value): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $value));
        return $hours * 60 + $minutes;
    }

    private function consultationTemplateDefaults(): array
    {
        return [
            [
                'name' => 'Infeccion respiratoria',
                'color_hex' => '#2563EB',
                'usage_notes' => 'Usala como base para cuadros respiratorios sin datos de alarma; valida sintomas actuales antes de copiar.',
                'subjective' => 'Paciente refiere cuadro respiratorio de inicio reciente con odinofagia, febricula y malestar general.',
                'objective' => 'Signos vitales estables, orofaringe hiperemica, sin datos de dificultad respiratoria ni compromiso sistemico.',
                'assessment' => 'Infeccion respiratoria alta no complicada.',
                'plan' => 'Manejo sintomatico, hidratacion oral, vigilancia de signos de alarma y reevaluacion si persiste fiebre.',
                'diagnosis' => 'Infeccion respiratoria alta no complicada',
            ],
            [
                'name' => 'Control metabolico',
                'color_hex' => '#0F766E',
                'usage_notes' => 'Apropiada para seguimientos metabolicos estables; ajusta metas y estudios segun el caso actual.',
                'subjective' => 'Consulta de seguimiento para control metabolico, adherencia irregular y revision de sintomas recientes.',
                'objective' => 'Paciente hemodinamicamente estable, sin datos de descompensacion aguda, requiere seguimiento de metas clinicas.',
                'assessment' => 'Control metabolico en seguimiento, sin complicaciones agudas al momento.',
                'plan' => 'Reforzar apego terapeutico, actualizar estudios de control y mantener vigilancia de signos de alarma.',
                'diagnosis' => 'Seguimiento de control metabolico',
            ],
            [
                'name' => 'Dolor musculoesqueletico',
                'color_hex' => '#B45309',
                'usage_notes' => 'Util para dolor mecanico sin trauma mayor; revisa limitacion funcional y signos neurologicos antes de reutilizar.',
                'subjective' => 'Paciente refiere dolor musculoesqueletico localizado, de evolucion subaguda, sin antecedente traumatico mayor.',
                'objective' => 'Dolor a la palpacion y movilidad conservada, sin datos neurovasculares de alarma.',
                'assessment' => 'Dolor musculoesqueletico mecanico sin datos de alarma.',
                'plan' => 'Analgesia, reposo relativo, medidas locales y reevaluacion si persiste limitacion funcional.',
                'diagnosis' => 'Dolor musculoesqueletico mecanico',
            ],
        ];
    }

    private function mapDoctorConsultationTemplate(array $row, string $source = 'custom'): array
    {
        return [
            'id' => (int)($row['id'] ?? 0),
            'label' => (string)($row['label'] ?? $row['name'] ?? 'Plantilla clinica'),
            'tone' => (string)($row['tone'] ?? $row['color_hex'] ?? '#2563EB'),
            'subjective' => (string)($row['subjective'] ?? ''),
            'objective' => (string)($row['objective'] ?? ''),
            'assessment' => (string)($row['assessment'] ?? ''),
            'plan' => (string)($row['plan'] ?? $row['plan_text'] ?? ''),
            'diagnosis' => (string)($row['diagnosis'] ?? ''),
            'usage_notes' => (string)($row['usage_notes'] ?? ''),
            'source' => $source,
            'is_active' => isset($row['is_active']) ? (bool)$row['is_active'] : $source === 'default',
            'sort_order' => isset($row['sort_order']) ? (int)$row['sort_order'] : 0,
        ];
    }

    private function supportInput(): array
    {
        $jsonBody = $this->body();
        if (!is_array($jsonBody)) {
            $jsonBody = [];
        }

        return array_merge($jsonBody, $_POST);
    }

    private function requireSupportTables(): void
    {
        if (!$this->hasTable('support_tickets') || !$this->hasTable('support_ticket_messages')) {
            $this->fail('El modulo de soporte todavia no esta disponible en este entorno.', 503);
        }
    }

    private function supportBaseUrl(): string
    {
        return defined('BASE_URL') ? constant('BASE_URL') : 'https://doctorcloud.digital/app/';
    }

    private function supportRoleForJwt(array $jwt): string
    {
        $role = strtolower(trim((string)($jwt['role'] ?? '')));
        return in_array($role, ['doctor', 'patient'], true) ? $role : 'patient';
    }

    private function supportLicenseIdForJwt(array $jwt): ?int
    {
        $role = $this->supportRoleForJwt($jwt);
        $userId = (int)($jwt['sub'] ?? 0);

        if ($role !== 'doctor' || $userId < 1) {
            return null;
        }

        return $this->doctorHospitalLicenseId($userId);
    }

    private function mapSupportTicketRow(array $row): array
    {
        $preview = trim((string)($row['last_message'] ?? ''));
        if ($preview !== '') {
            $preview = mb_substr(preg_replace('/\s+/', ' ', $preview) ?: '', 0, 180);
        }

        return [
            'id' => (int)($row['id'] ?? 0),
            'subject' => (string)($row['subject'] ?? ''),
            'status' => (string)($row['status'] ?? 'open'),
            'priority' => (string)($row['priority'] ?? 'normal'),
            'role' => (string)($row['role'] ?? ''),
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'message_count' => (int)($row['message_count'] ?? 0),
            'last_message_at' => $row['last_message_at'] ?? null,
            'last_message_preview' => $preview !== '' ? $preview : null,
            'is_closed' => (string)($row['status'] ?? '') === 'closed',
        ];
    }

    private function mobileSupportAttachment(): ?string
    {
        if (!isset($_FILES['attachment']) || ($_FILES['attachment']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        $file = $_FILES['attachment'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->fail('Error al subir el archivo adjunto.');
        }

        if ((int)($file['size'] ?? 0) > self::SUPPORT_MAX_BYTES) {
            $this->fail('El archivo excede el maximo permitido de 10 MB.');
        }

        $tmpName = (string)($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            $this->fail('No se recibio un archivo valido.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeReal = (string)($finfo->file($tmpName) ?: '');
        if (!in_array($mimeReal, self::SUPPORT_ALLOWED_MIME, true)) {
            $this->fail('Tipo de archivo no permitido. Usa PDF, JPG, PNG, WEBP, DOC o DOCX.');
        }

        $originalName = (string)($file['name'] ?? 'adjunto');
        $ext = strtolower((string)pathinfo($originalName, PATHINFO_EXTENSION));
        if ($ext === '') {
            $ext = match ($mimeReal) {
                'application/pdf' => 'pdf',
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                'application/msword' => 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
                default => 'bin',
            };
        }

        $safeName = bin2hex(random_bytes(16)) . '.' . $ext;
        $destDir = APP_ROOT . '/storage/uploads/support/';
        if (!is_dir($destDir) && !mkdir($destDir, 0755, true) && !is_dir($destDir)) {
            $this->fail('No se pudo preparar el almacenamiento del adjunto.');
        }

        $destPath = $destDir . $safeName;
        if (!move_uploaded_file($tmpName, $destPath)) {
            $this->fail('No se pudo guardar el archivo adjunto.');
        }

        return 'storage/uploads/support/' . $safeName;
    }

    private function notifySupportAdmins(int $ticketId, ?int $licenseId, string $title, string $body): void
    {
        if (!class_exists('Notification')) {
            return;
        }

        try {
            $pdo = Database::getInstance();
            $baseUrl = $this->supportBaseUrl();

            $stmt = $pdo->query(
                "SELECT u.id
                 FROM users u
                 JOIN roles r ON r.id = u.role_id
                 WHERE r.name = 'superadmin'
                 LIMIT 10"
            );
            foreach ($stmt->fetchAll(\PDO::FETCH_COLUMN) as $uid) {
                Notification::create(
                    (int)$uid,
                    'support_ticket',
                    $title,
                    $body,
                    $baseUrl . 'superadmin/support/' . $ticketId
                );
            }

            if ($licenseId) {
                $stmt2 = $pdo->prepare(
                    "SELECT u.id
                     FROM users u
                     JOIN roles r ON r.id = u.role_id
                     WHERE r.name = 'hospital_admin'
                       AND u.hospital_license_id = ?
                     LIMIT 5"
                );
                $stmt2->execute([$licenseId]);
                foreach ($stmt2->fetchAll(\PDO::FETCH_COLUMN) as $uid) {
                    Notification::create(
                        (int)$uid,
                        'support_ticket',
                        $title,
                        $body,
                        $baseUrl . 'hospital/support/' . $ticketId
                    );
                }
            }
        } catch (\Throwable) {
        }
    }

    // ── AUTH ──────────────────────────────────────────────────

    /** POST /api/mobile/auth/login */
    public function login(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $body     = $this->body();
        $email    = filter_var(trim((string)($body['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $password = (string)($body['password'] ?? '');

        if (!$email || $password === '') {
            $this->fail('Email y contrasena requeridos.');
        }

        $userModel = new User();
        $dummy     = '$2y$12$invalidhashfortimingprotectionxxxxxxxxxxxxxxxxxxxxxxxx';
        $user      = $userModel->findByEmail($email);
        $hash      = $user ? ($user['password_hash'] ?? $dummy) : $dummy;
        $ok        = $user && password_verify($password, $hash);

        if (!$ok) $this->fail('Credenciales incorrectas.', 401);
        if (($user['status'] ?? '') === 'suspended') $this->fail('Cuenta suspendida.', 403);
        if (($user['status'] ?? '') === 'pending_approval') $this->fail('Cuenta pendiente de aprobacion.', 403);
        $role = (string)($user['role_name'] ?? '');
        if (!in_array($role, ['patient', 'doctor'], true)) {
            $this->fail('Credenciales incorrectas.', 401);
        }

        $now   = time();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';
        $token = $this->jwtEncode([
            'sub'   => $user['id'],
            'email' => $user['email'],
            'role'  => $role,
            'iat'   => $now,
            'exp'   => $now + 60 * 60 * 24 * 30,
        ]);

        $this->ok([
            'token' => $token,
            'user'  => [
                'id'         => $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'],
                'avatar_url' => $this->absoluteUrl($user['avatar_url'] ?? null, $baseUrl),
                'role'       => $role,
            ],
        ]);
    }

    /** POST /api/mobile/auth/register */
    public function register(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $body     = $this->body();
        $name     = trim((string)($body['name'] ?? ''));
        $email    = filter_var(trim((string)($body['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $password = (string)($body['password'] ?? '');
        $phone    = preg_replace('/\D/', '', (string)($body['phone'] ?? ''));

        if (!$name || !$email || strlen($password) < 8) {
            $this->fail('Nombre, email valido y contrasena de al menos 8 caracteres son requeridos.');
        }

        $userModel = new User();
        if ($userModel->findByEmail($email)) {
            $this->fail('Este email ya esta registrado.', 409);
        }

        $userId = $userModel->createPatient($name, $email, $password);

        $pp = new PatientProfile();
        $pp->create($userId, ['phone' => $phone ?: null]);

        $now   = time();
        $token = $this->jwtEncode([
            'sub'   => $userId,
            'email' => $email,
            'role'  => 'patient',
            'iat'   => $now,
            'exp'   => $now + 60 * 60 * 24 * 30,
        ]);

        $this->ok([
            'token' => $token,
            'user'  => [
                'id'         => $userId,
                'name'       => $name,
                'email'      => $email,
                'avatar_url' => $this->absoluteUrl(null, defined('BASE_URL') ? constant('BASE_URL') : ''),
                'role'       => 'patient',
            ],
        ], 201);
    }

    // ── ESPECIALIDADES ────────────────────────────────────────

    /** GET /api/mobile/doctor/dashboard */
    public function doctorDashboard(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $db = Database::getInstance();
        $dp = new DoctorProfile();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $stats = $dp->getExtendedStats($doctorId);
        $profile = $this->hydrateDoctorPricing($doctorId, $dp->findByUserId($doctorId) ?: []);

        $upcomingStmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.scheduled_at, a.end_at, a.checked_in_at, a.checked_out_at,
                    a.pay_deadline, a.type, a.status, a.reason,
                    a.consultation_fee, a.payment_status,
                    u.name AS patient_name, u.avatar_url AS patient_avatar,
                    pp.phone AS patient_phone, dp.specialty, dp.address, dp.city, dp.state
             FROM appointments a
             JOIN users u ON u.id = a.patient_id
             LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.doctor_id = ?
               AND a.scheduled_at >= NOW()
               AND a.status NOT IN ('cancelled','completed','rejected','no_show')
             ORDER BY a.scheduled_at ASC
             LIMIT 8"
        );
        $upcomingStmt->execute([$doctorId]);
        $upcoming = $upcomingStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $todayStmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.scheduled_at, a.end_at, a.checked_in_at, a.checked_out_at,
                    a.pay_deadline, a.type, a.status, a.reason,
                    a.consultation_fee, a.payment_status,
                    u.name AS patient_name, u.avatar_url AS patient_avatar,
                    pp.phone AS patient_phone, dp.specialty, dp.address, dp.city, dp.state
             FROM appointments a
             JOIN users u ON u.id = a.patient_id
             LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.doctor_id = ? AND DATE(a.scheduled_at) = CURDATE()
             ORDER BY a.scheduled_at ASC
             LIMIT 12"
        );
        $todayStmt->execute([$doctorId]);
        $today = $todayStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $recentPatients = array_slice($this->managedPatientsRows($doctorId), 0, 5);

        $this->ok([
            'ok' => true,
            'doctor' => [
                'id' => (int)($profile['user_id'] ?? $doctorId),
                'name' => (string)($profile['name'] ?? ''),
                'email' => (string)($profile['email'] ?? ''),
                'avatar_url' => $this->absoluteUrl($profile['photo'] ?? $profile['avatar_url'] ?? null, $baseUrl),
                'specialty' => (string)($profile['specialty'] ?? ''),
                'subspecialty' => $profile['subspecialty'] ?? null,
            ],
            'stats' => $stats,
            'upcoming' => array_map(fn(array $row): array => $this->formatDoctorAppointment($row, $baseUrl), $upcoming),
            'today' => array_map(fn(array $row): array => $this->formatDoctorAppointment($row, $baseUrl), $today),
            'recent_patients' => array_map(fn(array $row): array => $this->formatDoctorPatient($row, $baseUrl), $recentPatients),
        ]);
    }

    /** GET /api/mobile/doctor/profile */
    public function doctorProfileSettings(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $stmt = Database::getInstance()->prepare(
            "SELECT u.id AS user_id, u.name, u.email, u.avatar_url,
                    dp.cedula, dp.specialty, dp.subspecialty, dp.bio, dp.photo,
                    dp.consultation_fee, dp.telemedicine_fee, dp.home_visit_fee,
                    dp.duration_minutes, dp.address, dp.city, dp.state, dp.lat, dp.lng
             FROM users u
             LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
             WHERE u.id = ? AND u.role_id = 2
             LIMIT 1"
        );
        $stmt->execute([$doctorId]);
        $doctor = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$doctor) {
            $this->fail('Doctor no encontrado.', 404);
        }

        $doctor = $this->hydrateDoctorPricing($doctorId, $doctor);

        $this->ok([
            'ok' => true,
            'data' => $this->formatDoctor($doctor, $baseUrl, true) + [
                'email' => (string)($doctor['email'] ?? ''),
                'avatar_url' => $this->absoluteUrl($doctor['photo'] ?? $doctor['avatar_url'] ?? null, $baseUrl),
                'cedula' => $doctor['cedula'] ?? null,
            ],
        ]);
    }

    /** PUT /api/mobile/doctor/profile */
    public function updateDoctorProfile(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();

        $name = trim((string)($body['name'] ?? ''));
        $specialty = trim((string)($body['specialty'] ?? ''));
        $consultationFee = max(0, (float)($body['consultation_fee'] ?? 0));
        $telemedicineFee = max(0, (float)($body['telemedicine_fee'] ?? 0));

        if ($name === '' || $specialty === '') {
            $this->fail('Nombre y especialidad son obligatorios.', 400);
        }

        if ($consultationFee <= 0 || $telemedicineFee <= 0) {
            $this->fail('Las tarifas de consulta presencial y videoconsulta deben ser mayores a 0.', 400);
        }

        $profileData = [
            'specialty' => $specialty,
            'subspecialty' => trim((string)($body['subspecialty'] ?? '')) ?: null,
            'bio' => trim((string)($body['bio'] ?? '')) ?: null,
            'consultation_fee' => $consultationFee,
            'telemedicine_fee' => $telemedicineFee,
            'home_visit_fee' => max(0, (float)($body['home_visit_fee'] ?? 0)),
            'duration_minutes' => max(15, (int)($body['duration_minutes'] ?? 30)),
            'address' => trim((string)($body['address'] ?? '')) ?: null,
            'city' => trim((string)($body['city'] ?? '')) ?: null,
            'state' => trim((string)($body['state'] ?? '')) ?: null,
        ];

        if ($this->hasColumn('doctor_profiles', 'lat') && array_key_exists('lat', $body)) {
            $profileData['lat'] = $body['lat'] !== null && $body['lat'] !== '' ? (float)$body['lat'] : null;
        }
        if ($this->hasColumn('doctor_profiles', 'lng') && array_key_exists('lng', $body)) {
            $profileData['lng'] = $body['lng'] !== null && $body['lng'] !== '' ? (float)$body['lng'] : null;
        }

        $db = Database::getInstance();
        $db->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$name, $doctorId]);

        $existing = $db->prepare('SELECT user_id FROM doctor_profiles WHERE user_id = ? LIMIT 1');
        $existing->execute([$doctorId]);

        if ((bool)$existing->fetchColumn()) {
            $sets = [];
            $params = [];
            foreach ($profileData as $column => $value) {
                $sets[] = "{$column} = ?";
                $params[] = $value;
            }
            $params[] = $doctorId;

            $db->prepare('UPDATE doctor_profiles SET ' . implode(', ', $sets) . ' WHERE user_id = ?')
                ->execute($params);
        } else {
            $columns = array_keys($profileData);
            $placeholders = implode(', ', array_fill(0, count($columns) + 1, '?'));
            $params = [$doctorId];
            foreach ($columns as $column) {
                $params[] = $profileData[$column];
            }
            $db->prepare(
                'INSERT INTO doctor_profiles (user_id, ' . implode(', ', $columns) . ') VALUES (' . $placeholders . ')'
            )->execute($params);
        }

        $this->ok(['ok' => true, 'message' => 'Configuracion del doctor actualizada correctamente.']);
    }

    /** GET /api/mobile/doctor/availability?month=YYYY-MM */
    public function doctorAvailabilitySettings(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $month = trim((string)($_GET['month'] ?? date('Y-m')));

        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            $this->fail('Formato de mes invalido. Usa YYYY-MM.', 400);
        }

        $dp = new DoctorProfile();
        $schedule = $dp->getAvailability($doctorId);
        $overrides = $dp->getAvailabilityOverrides($doctorId, $month);

        $this->ok([
            'ok' => true,
            'schedule' => array_map(static function (array $item): array {
                return [
                    'day_of_week' => (int)($item['day_of_week'] ?? -1),
                    'start_time' => $item['start_time'] ?? null,
                    'end_time' => $item['end_time'] ?? null,
                    'slot_duration_minutes' => (int)($item['slot_duration_minutes'] ?? 30),
                    'is_active' => (int)($item['is_active'] ?? 1),
                    'break_start' => $item['break_start'] ?? null,
                    'break_end' => $item['break_end'] ?? null,
                ];
            }, $schedule),
            'overrides' => array_map(static function (array $item): array {
                return [
                    'override_date' => $item['override_date'] ?? null,
                    'start_time' => $item['start_time'] ?? null,
                    'end_time' => $item['end_time'] ?? null,
                    'is_off' => !empty($item['is_off']) ? 1 : 0,
                    'reason' => $item['reason'] ?? null,
                ];
            }, array_values($overrides)),
        ]);
    }

    /** PUT /api/mobile/doctor/availability */
    public function updateDoctorAvailability(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();
        $rawSchedule = $body['schedule'] ?? null;

        if (!is_array($rawSchedule)) {
            $this->fail('Schedule invalido.', 400);
        }

        $allowedDays = [0, 1, 2, 3, 4, 5, 6];
        $schedule = [];

        foreach ($rawSchedule as $item) {
            if (!is_array($item)) {
                continue;
            }

            $day = (int)($item['day'] ?? -1);
            $enabled = !empty($item['enabled']);
            $start = trim((string)($item['start'] ?? '09:00'));
            $end = trim((string)($item['end'] ?? '17:00'));
            $breakStart = trim((string)($item['break_start'] ?? ''));
            $breakEnd = trim((string)($item['break_end'] ?? ''));
            $duration = max(15, (int)($item['duration'] ?? 30));

            if (!in_array($day, $allowedDays, true)) {
                $this->fail('Dia invalido en horario semanal.', 400);
            }

            if (!$enabled) {
                continue;
            }

            if (!$this->isValidTimeValue($start) || !$this->isValidTimeValue($end)) {
                $this->fail('Horario invalido. Usa HH:MM.', 400);
            }

            if ($this->timeToMinutes($start) >= $this->timeToMinutes($end)) {
                $this->fail('La hora de inicio debe ser menor que la hora final.', 400);
            }

            if ($breakStart !== '' || $breakEnd !== '') {
                if (!$this->isValidTimeValue($breakStart) || !$this->isValidTimeValue($breakEnd)) {
                    $this->fail('Descanso invalido. Usa HH:MM.', 400);
                }

                $breakStartMinutes = $this->timeToMinutes($breakStart);
                $breakEndMinutes = $this->timeToMinutes($breakEnd);

                if (
                    $breakStartMinutes < $this->timeToMinutes($start) ||
                    $breakEndMinutes > $this->timeToMinutes($end) ||
                    $breakStartMinutes >= $breakEndMinutes
                ) {
                    $this->fail('El descanso debe quedar dentro de la jornada.', 400);
                }
            }

            $schedule[] = [
                'day' => $day,
                'start' => $start,
                'end' => $end,
                'duration' => $duration,
                'break_start' => $breakStart !== '' ? $breakStart : null,
                'break_end' => $breakEnd !== '' ? $breakEnd : null,
            ];
        }

        (new DoctorProfile())->saveAvailability($doctorId, $schedule);

        $this->ok([
            'ok' => true,
            'message' => 'Horario semanal actualizado correctamente.',
        ]);
    }

    /** POST /api/mobile/doctor/availability/override */
    public function doctorAvailabilityOverride(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();

        $date = trim((string)($body['date'] ?? ''));
        $clear = !empty($body['clear']);
        $isOff = !empty($body['is_off']);
        $startTime = trim((string)($body['start_time'] ?? ''));
        $endTime = trim((string)($body['end_time'] ?? ''));
        $reason = trim((string)($body['reason'] ?? '')) ?: null;

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $this->fail('Fecha invalida. Usa YYYY-MM-DD.', 400);
        }

        $dp = new DoctorProfile();

        if ($clear) {
            $dp->deleteAvailabilityOverride($doctorId, $date);
            $this->ok([
                'ok' => true,
                'message' => 'Se elimino el ajuste especial del dia.',
            ]);
            return;
        }

        if (!$isOff) {
            if ($startTime === '' || $endTime === '') {
                $this->fail('Debes indicar un horario o marcar el dia como descanso.', 400);
            }

            if (!$this->isValidTimeValue($startTime) || !$this->isValidTimeValue($endTime)) {
                $this->fail('Horario invalido. Usa HH:MM.', 400);
            }

            if ($this->timeToMinutes($startTime) >= $this->timeToMinutes($endTime)) {
                $this->fail('La hora de inicio debe ser menor que la hora final.', 400);
            }
        }

        $dp->saveAvailabilityOverride($doctorId, $date, [
            'start_time' => $isOff ? null : $startTime,
            'end_time' => $isOff ? null : $endTime,
            'is_off' => $isOff ? 1 : 0,
            'reason' => $reason,
        ]);

        $this->ok([
            'ok' => true,
            'message' => $isOff
                ? 'Dia bloqueado correctamente.'
                : 'Ajuste especial guardado correctamente.',
        ]);
    }

    /** GET /api/mobile/doctor/consultation-templates */
    public function doctorConsultationTemplates(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];

        $defaults = array_map(
            fn(array $template): array => $this->mapDoctorConsultationTemplate($template, 'default'),
            $this->consultationTemplateDefaults()
        );

        $storageReady = true;
        $customTemplates = [];

        try {
            $stmt = Database::getInstance()->prepare(
                'SELECT id, name, color_hex, usage_notes, subjective, objective, assessment, plan, diagnosis, is_active, sort_order, updated_at
                 FROM doctor_consultation_templates
                 WHERE doctor_id = ?
                 ORDER BY is_active DESC, sort_order ASC, updated_at DESC, id DESC'
            );
            $stmt->execute([$doctorId]);
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $customTemplates = array_map(
                fn(array $row): array => $this->mapDoctorConsultationTemplate($row, 'custom'),
                $rows
            );
        } catch (\Throwable) {
            $storageReady = false;
        }

        $activeCustom = array_values(array_filter(
            $customTemplates,
            static fn(array $template): bool => !empty($template['is_active'])
        ));

        $this->ok([
            'ok' => true,
            'storage_ready' => $storageReady,
            'data' => $customTemplates,
            'defaults' => $defaults,
            'library' => !empty($activeCustom) ? $activeCustom : $defaults,
        ]);
    }

    /** POST /api/mobile/doctor/consultation-templates */
    public function saveDoctorConsultationTemplate(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];

        if (!$this->hasTable('doctor_consultation_templates')) {
            $this->fail('El almacenamiento de plantillas todavia no esta disponible en este entorno.', 503);
        }

        $body = $this->body();
        $templateId = (int)($body['template_id'] ?? $body['id'] ?? 0);
        $name = trim((string)($body['name'] ?? ''));
        $colorHex = strtoupper(trim((string)($body['color_hex'] ?? '#2563EB')));
        $usageNotes = trim((string)($body['usage_notes'] ?? ''));
        $subjective = trim((string)($body['subjective'] ?? ''));
        $objective = trim((string)($body['objective'] ?? ''));
        $assessment = trim((string)($body['assessment'] ?? ''));
        $plan = trim((string)($body['plan'] ?? ''));
        $diagnosis = trim((string)($body['diagnosis'] ?? ''));
        $sortOrder = max(0, min(999, (int)($body['sort_order'] ?? 0)));
        $isActive = !array_key_exists('is_active', $body) || !empty($body['is_active']) ? 1 : 0;

        if (!preg_match('/^#[0-9A-F]{6}$/', $colorHex)) {
            $colorHex = '#2563EB';
        }

        if ($name === '') {
            $this->fail('Asigna un nombre a la plantilla.', 400);
        }

        if ($subjective === '' && $objective === '' && $assessment === '' && $plan === '' && $diagnosis === '') {
            $this->fail('La plantilla debe incluir al menos un bloque clinico o un diagnostico base.', 400);
        }

        $db = Database::getInstance();

        try {
            if ($templateId > 0) {
                $updateStmt = $db->prepare(
                    'UPDATE doctor_consultation_templates
                     SET name = ?, color_hex = ?, usage_notes = ?, subjective = ?, objective = ?,
                         assessment = ?, plan = ?, diagnosis = ?, is_active = ?, sort_order = ?, updated_at = NOW()
                     WHERE id = ? AND doctor_id = ?'
                );
                $updateStmt->execute([
                    $name,
                    $colorHex,
                    $usageNotes !== '' ? $usageNotes : null,
                    $subjective !== '' ? $subjective : null,
                    $objective !== '' ? $objective : null,
                    $assessment !== '' ? $assessment : null,
                    $plan !== '' ? $plan : null,
                    $diagnosis !== '' ? $diagnosis : null,
                    $isActive,
                    $sortOrder,
                    $templateId,
                    $doctorId,
                ]);

                if ($updateStmt->rowCount() < 1) {
                    $checkStmt = $db->prepare(
                        'SELECT id FROM doctor_consultation_templates WHERE id = ? AND doctor_id = ? LIMIT 1'
                    );
                    $checkStmt->execute([$templateId, $doctorId]);
                    if (!$checkStmt->fetchColumn()) {
                        $this->fail('Plantilla no encontrada.', 404);
                    }
                }
            } else {
                $db->prepare(
                    'INSERT INTO doctor_consultation_templates
                       (doctor_id, name, color_hex, usage_notes, subjective, objective, assessment, plan, diagnosis, is_active, sort_order, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
                )->execute([
                    $doctorId,
                    $name,
                    $colorHex,
                    $usageNotes !== '' ? $usageNotes : null,
                    $subjective !== '' ? $subjective : null,
                    $objective !== '' ? $objective : null,
                    $assessment !== '' ? $assessment : null,
                    $plan !== '' ? $plan : null,
                    $diagnosis !== '' ? $diagnosis : null,
                    $isActive,
                    $sortOrder,
                ]);
                $templateId = (int)$db->lastInsertId();
            }
        } catch (\Throwable $e) {
            error_log('[MobileApiController::saveDoctorConsultationTemplate] ' . $e->getMessage());
            $this->fail('No se pudo guardar la plantilla. Verifica la migracion de plantillas.', 500);
        }

        $savedStmt = $db->prepare(
            'SELECT id, name, color_hex, usage_notes, subjective, objective, assessment, plan, diagnosis, is_active, sort_order
             FROM doctor_consultation_templates
             WHERE id = ? AND doctor_id = ?
             LIMIT 1'
        );
        $savedStmt->execute([$templateId, $doctorId]);
        $saved = $savedStmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        $this->ok([
            'ok' => true,
            'message' => array_key_exists('template_id', $body) || array_key_exists('id', $body)
                ? 'Plantilla actualizada.'
                : 'Plantilla guardada.',
            'template' => $saved ? $this->mapDoctorConsultationTemplate($saved, 'custom') : null,
        ]);
    }

    /** POST /api/mobile/doctor/consultation-templates/:id/delete */
    public function deleteDoctorConsultationTemplate(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $templateId = (int)$id;

        if ($templateId <= 0) {
            $this->fail('Plantilla invalida.', 400);
        }

        if (!$this->hasTable('doctor_consultation_templates')) {
            $this->fail('El almacenamiento de plantillas todavia no esta disponible en este entorno.', 503);
        }

        $stmt = Database::getInstance()->prepare(
            'DELETE FROM doctor_consultation_templates WHERE id = ? AND doctor_id = ?'
        );
        $stmt->execute([$templateId, $doctorId]);

        if ($stmt->rowCount() < 1) {
            $this->fail('Plantilla no encontrada.', 404);
        }

        $this->ok([
            'ok' => true,
            'message' => 'Plantilla eliminada.',
        ]);
    }

    /** POST /api/mobile/doctor/appointments */
    public function doctorCreateAppointment(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();

        $patientId = (int)($body['patient_id'] ?? 0);
        $date = trim((string)($body['date'] ?? ''));
        $time = trim((string)($body['time'] ?? ''));
        $rawType = strtolower(trim((string)($body['type'] ?? 'presential')));
        $typeMap = [
            'presencial' => 'presential',
            'presential' => 'presential',
            'videoconsulta' => 'virtual',
            'virtual' => 'virtual',
            'domicilio' => 'home_visit',
            'home_visit' => 'home_visit',
        ];
        $type = $typeMap[$rawType] ?? '';
        $reason = trim((string)($body['reason'] ?? ''));
        $notes = trim((string)($body['notes'] ?? ''));
        $waivePayment = !empty($body['waive_payment']);

        if ($patientId <= 0 || $date === '' || $time === '' || $reason === '') {
            $this->fail('patient_id, date, time y reason son requeridos.', 400);
        }

        if (!in_array($type, ['presential', 'virtual', 'home_visit'], true)) {
            $this->fail('Tipo de cita invalido.', 400);
        }

        if (!$this->doctorCanAccessPatient($doctorId, $patientId)) {
            $this->fail('No tienes acceso a este paciente.', 403);
        }

        $scheduledAt = $date . ' ' . $time . ':00';
        $scheduledTs = strtotime($scheduledAt);
        if (!$scheduledTs || $scheduledTs <= time()) {
            $this->fail('La fecha de la cita debe ser futura.', 400);
        }

        $dp = new DoctorProfile();
        $profile = $this->hydrateDoctorPricing($doctorId, $dp->findByUserId($doctorId) ?: []);
        if (!$profile) {
            $this->fail('Doctor no encontrado.', 404);
        }

        $durationMinutes = (int)($profile['duration_minutes'] ?? 30);
        if ($durationMinutes < 5) {
            $durationMinutes = 30;
        }
        $endAt = date('Y-m-d H:i:s', $scheduledTs + $durationMinutes * 60);

        $db = Database::getInstance();

        $doctorConflictStmt = $db->prepare(
            "SELECT id FROM appointments
             WHERE doctor_id = ?
               AND status NOT IN ('cancelled','rejected','missed','no_show')
               AND scheduled_at < ?
               AND COALESCE(end_at, DATE_ADD(scheduled_at, INTERVAL 30 MINUTE)) > ?
             LIMIT 1"
        );
        $doctorConflictStmt->execute([$doctorId, $endAt, $scheduledAt]);
        if ($doctorConflictStmt->fetchColumn()) {
            $this->fail('Ese horario ya no esta disponible para el doctor.', 409);
        }

        $patientConflictStmt = $db->prepare(
            "SELECT id FROM appointments
             WHERE patient_id = ?
               AND status NOT IN ('cancelled','rejected','missed','no_show')
               AND scheduled_at < ?
               AND COALESCE(end_at, DATE_ADD(scheduled_at, INTERVAL 30 MINUTE)) > ?
             LIMIT 1"
        );
        $patientConflictStmt->execute([$patientId, $endAt, $scheduledAt]);
        if ($patientConflictStmt->fetchColumn()) {
            $this->fail('El paciente ya tiene una cita en ese horario.', 409);
        }

        $fee = $this->resolveConsultationFee($profile, $type, $waivePayment);

        $status = $fee > 0 ? 'pending_payment' : 'confirmed';
        $paymentStatus = $fee > 0 ? 'pending' : 'not_required';
        $videoRoomId = $type === 'virtual' ? ('mu-' . bin2hex(random_bytes(6))) : null;

        $db->prepare(
            'INSERT INTO appointments
               (doctor_id, patient_id, scheduled_at, end_at, type, status, reason, notes,
                video_room_id, created_by_role, consultation_fee, payment_status, pay_deadline, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW())'
        )->execute([
            $doctorId,
            $patientId,
            $scheduledAt,
            $endAt,
            $type,
            $status,
            $reason,
            $notes !== '' ? $notes : null,
            $videoRoomId,
            'doctor',
            $fee,
            $paymentStatus,
        ]);

        $appointmentId = (int)$db->lastInsertId();

        $this->ok([
            'ok' => true,
            'id' => $appointmentId,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'fee' => $fee,
            'message' => $fee > 0
                ? 'Cita creada. El paciente podra pagarla despues desde la app.'
                : 'Cita creada sin cargo para el paciente.',
        ], 201);
    }

    /** GET /api/mobile/doctor/appointments?scope=today|upcoming|completed|in_consultation */
    public function doctorAppointments(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $scope = strtolower(trim((string)($_GET['scope'] ?? 'upcoming')));
        $db = Database::getInstance();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $condition = match ($scope) {
            'today' => "DATE(a.scheduled_at) = CURDATE() AND a.status NOT IN ('cancelled','rejected','no_show')",
            'completed' => "a.status = 'completed'",
            'in_consultation' => "a.status = 'in_consultation'",
            default => "a.scheduled_at >= NOW() AND a.status NOT IN ('completed','cancelled','rejected','no_show')",
        };

        $stmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.scheduled_at, a.end_at, a.checked_in_at, a.checked_out_at,
                    a.pay_deadline, a.type, a.status, a.reason,
                    a.consultation_fee, a.payment_status,
                    u.name AS patient_name, u.avatar_url AS patient_avatar,
                    pp.phone AS patient_phone, dp.specialty, dp.address, dp.city, dp.state
             FROM appointments a
             JOIN users u ON u.id = a.patient_id
             LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.doctor_id = ? AND {$condition}
             ORDER BY a.scheduled_at " . ($scope === 'completed' ? 'DESC' : 'ASC') . "
             LIMIT 50"
        );
        $stmt->execute([$doctorId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $this->ok([
            'ok' => true,
            'scope' => $scope,
            'data' => array_map(fn(array $row): array => $this->formatDoctorAppointment($row, $baseUrl), $rows),
        ]);
    }

    /** GET /api/mobile/doctor/patients */
    public function doctorPatients(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $rows = $this->managedPatientsRows($doctorId);

        $this->ok([
            'ok' => true,
            'data' => array_map(fn(array $row): array => $this->formatDoctorPatient($row, $baseUrl), $rows),
        ]);
    }

    /** POST /api/mobile/doctor/patients/link */
    public function doctorLinkPatient(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();
        $code = $this->normalizeAccessCode((string)($body['access_code'] ?? ''));

        if (strlen($code) < 8) {
            $this->fail('Ingresa un codigo valido de al menos 8 caracteres.', 400);
        }

        if (!$this->hasColumn('patient_profiles', 'doctor_access_code')) {
            $this->fail('El codigo de acceso de pacientes aun no esta habilitado en este entorno.', 409);
        }

        $stmt = Database::getInstance()->prepare(
            "SELECT u.id, u.name, u.email, u.avatar_url,
                    pp.birth_date, pp.gender, pp.blood_type, pp.phone, pp.address, pp.city,
                    pp.emergency_contact_name, pp.emergency_contact_phone,
                    pp.allergies, pp.chronic_conditions, pp.current_medications,
                    MAX(a.scheduled_at) AS last_appointment,
                    COUNT(a.id) AS total_appointments
             FROM patient_profiles pp
             JOIN users u ON u.id = pp.user_id
             LEFT JOIN appointments a ON a.patient_id = u.id AND a.doctor_id = ?
             WHERE pp.doctor_access_code = ?
               AND u.status = 'active'
             GROUP BY u.id
             LIMIT 1"
        );
        $stmt->execute([$doctorId, $code]);
        $patient = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$patient) {
            $this->fail('No se encontro un paciente activo con ese codigo.', 404);
        }

        $patientId = (int)($patient['id'] ?? 0);
        if ($patientId <= 0) {
            $this->fail('Paciente invalido.', 404);
        }

        $this->upsertDoctorPatientLink($doctorId, $patientId, 'patient_code');

        $this->ok([
            'ok' => true,
            'message' => 'Paciente vinculado correctamente.',
            'patient' => $this->formatDoctorPatient($patient, defined('BASE_URL') ? constant('BASE_URL') : ''),
        ]);
    }

    /** POST /api/mobile/doctor/patients/register */
    public function doctorRegisterPatient(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();

        $name = trim((string)($body['name'] ?? ''));
        $email = filter_var(trim((string)($body['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $phone = preg_replace('/\D/', '', (string)($body['phone'] ?? ''));
        $gender = trim((string)($body['gender'] ?? '')) ?: null;
        $birthDate = trim((string)($body['birth_date'] ?? '')) ?: null;

        if ($name === '' || !$email) {
            $this->fail('Nombre y correo valido son obligatorios.', 400);
        }

        $userModel = new User();
        if ($userModel->findByEmail($email)) {
            $this->fail('Ya existe un usuario con ese correo.', 409);
        }

        $db = Database::getInstance();
        $licenseId = $this->doctorHospitalLicenseId($doctorId);
        $rawPassword = bin2hex(random_bytes(6));
        $hash = password_hash($rawPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        $db->beginTransaction();
        try {
            $db->prepare(
                "INSERT INTO users (name, email, password_hash, role_id, status)
                 VALUES (?, ?, ?, 3, 'active')"
            )->execute([$name, $email, $hash]);
            $newUserId = (int)$db->lastInsertId();

            try {
                $db->prepare('UPDATE users SET force_password_change = 1 WHERE id = ?')->execute([$newUserId]);
            } catch (\Throwable) {
            }

            $columns = ['user_id', 'phone', 'gender', 'birth_date', 'associated_doctor_id'];
            $values = [$newUserId, $phone ?: null, $gender, $birthDate, $doctorId];

            if ($this->hasColumn('patient_profiles', 'lat') && array_key_exists('lat', $body)) {
                $columns[] = 'lat';
                $values[] = $body['lat'] !== null && $body['lat'] !== '' ? (float)$body['lat'] : null;
            }
            if ($this->hasColumn('patient_profiles', 'lng') && array_key_exists('lng', $body)) {
                $columns[] = 'lng';
                $values[] = $body['lng'] !== null && $body['lng'] !== '' ? (float)$body['lng'] : null;
            }
            if (array_key_exists('address', $body)) {
                $columns[] = 'address';
                $values[] = trim((string)($body['address'] ?? '')) ?: null;
            }
            if (array_key_exists('city', $body)) {
                $columns[] = 'city';
                $values[] = trim((string)($body['city'] ?? '')) ?: null;
            }
            if (array_key_exists('state', $body)) {
                $columns[] = 'state';
                $values[] = trim((string)($body['state'] ?? '')) ?: null;
            }

            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            $db->prepare(
                'INSERT INTO patient_profiles (' . implode(', ', $columns) . ') VALUES (' . $placeholders . ')'
            )->execute($values);

            if ($licenseId) {
                $db->prepare('UPDATE users SET hospital_license_id = ? WHERE id = ?')->execute([$licenseId, $newUserId]);
            }

            $db->commit();
            $this->ensurePatientAccessCode($newUserId);
            $this->upsertDoctorPatientLink($doctorId, $newUserId, 'doctor_registered');
        } catch (\Throwable $e) {
            $db->rollBack();
            error_log('[MobileApiController::doctorRegisterPatient] ' . $e->getMessage());
            $this->fail('No se pudo registrar el paciente.', 500);
        }

        $doctorName = trim((string)($jwt['name'] ?? '')) ?: 'Doctor';
        try {
            $clinicName = null;
            if ($licenseId) {
                $clinicStmt = $db->prepare('SELECT name FROM hospital_licenses WHERE id = ? LIMIT 1');
                $clinicStmt->execute([$licenseId]);
                $clinicName = $clinicStmt->fetchColumn() ?: null;
            }

            Mailer::sendWelcomeCredentials(
                (string)$email,
                $name,
                'Paciente',
                $rawPassword,
                'https://doctorcloud.digital/app/login',
                $clinicName ?: null,
                'el Dr. ' . $doctorName
            );
        } catch (\Throwable) {
        }

        $this->ok([
            'ok' => true,
            'message' => 'Paciente registrado y vinculado correctamente. Se enviaron credenciales por correo.',
        ], 201);
    }

    /** GET /api/mobile/doctor/patients/:id/snapshot */
    public function doctorPatientSnapshot(string $id): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $patientId = (int)$id;

        if ($patientId <= 0) {
            $this->fail('Paciente invalido.', 400);
        }

        if (!$this->doctorCanAccessPatient($doctorId, $patientId)) {
            $this->fail('No tienes acceso a este paciente.', 403);
        }

        $db = Database::getInstance();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $stmt = $db->prepare(
            'SELECT u.id, u.name, u.email, u.avatar_url,
                    pp.birth_date, pp.gender, pp.blood_type, pp.phone,
                    pp.height_cm, pp.weight_kg, pp.occupation,
                    pp.allergies, pp.chronic_conditions, pp.current_medications,
                    pp.address, pp.city, pp.state,
                    pp.emergency_contact_name, pp.emergency_contact_phone
             FROM users u
             LEFT JOIN patient_profiles pp ON pp.user_id = u.id
             WHERE u.id = ? LIMIT 1'
        );
        $stmt->execute([$patientId]);
        $patient = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$patient) {
            $this->fail('Paciente no encontrado.', 404);
        }

        $recordStmt = $db->prepare(
            'SELECT * FROM patient_medical_records WHERE patient_id = ? LIMIT 1'
        );
        $recordStmt->execute([$patientId]);
        $record = $recordStmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        $patient['id'] = (int)($patient['id'] ?? $patientId);
        $patient['avatar_url'] = $this->absoluteUrl($patient['avatar_url'] ?? null, $baseUrl);
        $patient['age'] = $this->ageFromBirthDate($patient['birth_date'] ?? null);

        $this->ok([
            'ok' => true,
            'patient' => $patient,
            'record' => $record,
            'age' => $patient['age'],
            'updatedAt' => date('c'),
        ]);
    }

    /** GET /api/mobile/doctor/patients/:id/history */
    public function doctorPatientHistory(string $id): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $patientId = (int)$id;

        if ($patientId <= 0) {
            $this->fail('Paciente invalido.', 400);
        }

        if (!$this->doctorCanAccessPatient($doctorId, $patientId)) {
            $this->fail('No tienes acceso a este paciente.', 403);
        }

        $db = Database::getInstance();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $stmt = $db->prepare(
            'SELECT u.id, u.name, u.email, u.avatar_url,
                    pp.birth_date, pp.gender, pp.blood_type, pp.phone,
                    pp.allergies, pp.current_medications
             FROM users u
             LEFT JOIN patient_profiles pp ON pp.user_id = u.id
             WHERE u.id = ? LIMIT 1'
        );
        $stmt->execute([$patientId]);
        $patient = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$patient) {
            $this->fail('Paciente no encontrado.', 404);
        }

        $patient['id'] = (int)($patient['id'] ?? $patientId);
        $patient['avatar_url'] = $this->absoluteUrl($patient['avatar_url'] ?? null, $baseUrl);
        $patient['age'] = $this->ageFromBirthDate($patient['birth_date'] ?? null);

        $notes = $this->safeQuery(
            'SELECT mn.id, mn.appointment_id, mn.subjective, mn.objective, mn.assessment,
                    mn.plan_text, mn.created_at,
                    a.scheduled_at, a.type AS appt_type, a.reason AS appt_reason
             FROM medical_notes mn
             LEFT JOIN appointments a ON a.id = mn.appointment_id
             WHERE mn.patient_id = ?
             ORDER BY a.scheduled_at DESC, mn.created_at DESC
             LIMIT 50',
            [$patientId]
        );

        $prescriptions = $this->safeQuery(
            'SELECT p.id, p.appointment_id, p.diagnosis, p.medications, p.instructions,
                    p.issued_date, p.status, u.name AS doctor_name, a.scheduled_at AS appt_date
             FROM prescriptions p
             JOIN users u ON u.id = p.doctor_id
             LEFT JOIN appointments a ON a.id = p.appointment_id
             WHERE p.patient_id = ?
             ORDER BY p.issued_date DESC, p.id DESC
             LIMIT 50',
            [$patientId]
        );

        $history = $this->safeQuery(
            'SELECT mh.id, mh.category, mh.description, mh.date_recorded, mh.created_at,
                    u.name AS doctor_name
             FROM medical_history mh
             LEFT JOIN users u ON u.id = mh.recorded_by_doctor_id
             WHERE mh.patient_id = ?
             ORDER BY mh.date_recorded DESC, mh.created_at DESC
             LIMIT 100',
            [$patientId]
        );

        $this->ok([
            'ok' => true,
            'patient' => $patient,
            'notes' => $notes,
            'prescriptions' => $prescriptions,
            'history' => $history,
        ]);
    }

    /** GET /api/mobile/doctor/patients/:id/documents */
    public function doctorPatientDocuments(string $id): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $patientId = (int)$id;

        if ($patientId <= 0) {
            $this->fail('Paciente invalido.', 400);
        }

        if (!$this->doctorCanAccessPatient($doctorId, $patientId)) {
            $this->fail('No tienes acceso a este paciente.', 403);
        }

        $db = Database::getInstance();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $patientStmt = $db->prepare(
            'SELECT u.id, u.name, u.avatar_url
             FROM users u
             WHERE u.id = ?
             LIMIT 1'
        );
        $patientStmt->execute([$patientId]);
        $patient = $patientStmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$patient) {
            $this->fail('Paciente no encontrado.', 404);
        }

        $rows = $this->safeQuery(
            'SELECT pd.id, pd.document_type, pd.title, pd.file_path, pd.file_mime,
                    pd.file_size_kb, pd.notes, pd.created_at, u.name AS uploader_name
             FROM patient_documents pd
             LEFT JOIN users u ON u.id = pd.uploaded_by
             WHERE pd.patient_id = ?
             ORDER BY pd.created_at DESC
             LIMIT 100',
            [$patientId]
        );

        $patient['id'] = (int)($patient['id'] ?? $patientId);
        $patient['avatar_url'] = $this->absoluteUrl($patient['avatar_url'] ?? null, $baseUrl);

        $data = array_map(function (array $row) use ($baseUrl): array {
            $path = (string)($row['file_path'] ?? '');

            return [
                'id' => (int)($row['id'] ?? 0),
                'document_type' => $row['document_type'] ?? 'other',
                'title' => $row['title'] ?? 'Documento',
                'file_path' => $path,
                'file_url' => $path !== '' ? rtrim($baseUrl, '/') . '/' . ltrim($path, '/') : null,
                'file_mime' => $row['file_mime'] ?? null,
                'file_size_kb' => (int)($row['file_size_kb'] ?? 0),
                'notes' => $row['notes'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'uploader_name' => $row['uploader_name'] ?? null,
            ];
        }, $rows);

        $this->ok([
            'ok' => true,
            'patient' => $patient,
            'data' => $data,
        ]);
    }

    /** POST /api/mobile/doctor/patients/:id/documents/upload */
    public function doctorPatientDocumentsUpload(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $patientId = (int)$id;

        if ($patientId <= 0) {
            $this->fail('Paciente invalido.', 400);
        }

        if (!$this->doctorCanAccessPatient($doctorId, $patientId)) {
            $this->fail('No tienes acceso a este paciente.', 403);
        }

        if (empty($_FILES['document_file'])) {
            $this->fail('No se recibio ningun archivo.', 400);
        }

        $file = $_FILES['document_file'];
        $allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string)$finfo->file($file['tmp_name']);
        if (!in_array($mime, $allowed, true)) {
            $this->fail('Tipo de archivo no permitido. Solo PDF, JPG o PNG.', 422);
        }

        $maxBytes = 10 * 1024 * 1024;
        if ((int)$file['size'] > $maxBytes) {
            $this->fail('El archivo excede el tamano maximo de 10 MB.', 422);
        }

        $dir = APP_ROOT . '/storage/uploads/documents/' . $patientId . '/';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            $this->fail('No se pudo crear el directorio de carga.', 500);
        }

        $ext = strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION));
        if ($ext === '') {
            $ext = match ($mime) {
                'application/pdf' => 'pdf',
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                default => 'bin',
            };
        }

        $filename = bin2hex(random_bytes(8)) . '_' . time() . ($ext !== '' ? '.' . $ext : '');
        $destPath = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            $this->fail('No se pudo guardar el archivo.', 500);
        }

        $relativePath = 'storage/uploads/documents/' . $patientId . '/' . $filename;
        $sizeKb = (int)round(((int)$file['size']) / 1024);
        $docType = trim((string)($_POST['document_type'] ?? 'other')) ?: 'other';
        $title = trim((string)($_POST['title'] ?? '')) ?: 'Documento';
        $notes = trim((string)($_POST['notes'] ?? ''));

        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO patient_documents
               (patient_id, uploaded_by, document_type, title, file_path, file_mime, file_size_kb, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $patientId,
            $doctorId,
            $docType,
            $title,
            $relativePath,
            $mime,
            $sizeKb,
            $notes !== '' ? $notes : null,
        ]);

        $docId = (int)$pdo->lastInsertId();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';
        $uploaderName = null;

        try {
            $uploaderStmt = $pdo->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
            $uploaderStmt->execute([$doctorId]);
            $uploaderName = $uploaderStmt->fetchColumn() ?: null;
        } catch (\Throwable) {
            $uploaderName = null;
        }

        $this->ok([
            'id' => $docId,
            'message' => 'Documento subido correctamente al expediente del paciente.',
            'document' => [
                'id' => $docId,
                'document_type' => $docType,
                'title' => $title,
                'file_path' => $relativePath,
                'file_url' => rtrim($baseUrl, '/') . '/' . ltrim($relativePath, '/'),
                'file_mime' => $mime,
                'file_size_kb' => $sizeKb,
                'notes' => $notes !== '' ? $notes : null,
                'uploader_name' => $uploaderName,
            ],
        ], 201);
    }

    /** GET /api/mobile/doctor/notes */
    public function doctorNotes(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $rows = $this->safeQuery(
            'SELECT mn.id, mn.patient_id, mn.appointment_id, mn.subjective, mn.objective,
                    mn.assessment, mn.plan_text, mn.created_at,
                    u.name AS patient_name, u.avatar_url AS patient_avatar_url,
                    a.scheduled_at, a.type AS appt_type, a.reason AS appt_reason
             FROM medical_notes mn
             JOIN users u ON u.id = mn.patient_id
             LEFT JOIN appointments a ON a.id = mn.appointment_id
             WHERE mn.doctor_id = ?
             ORDER BY COALESCE(a.scheduled_at, mn.created_at) DESC, mn.id DESC
             LIMIT 150',
            [$doctorId]
        );

        $data = array_map(function (array $row) use ($baseUrl): array {
            return [
                'id' => (int)($row['id'] ?? 0),
                'patient_id' => isset($row['patient_id']) ? (int)$row['patient_id'] : null,
                'patient_name' => $row['patient_name'] ?? null,
                'patient_avatar_url' => $this->absoluteUrl($row['patient_avatar_url'] ?? null, $baseUrl),
                'appointment_id' => isset($row['appointment_id']) ? (int)$row['appointment_id'] : null,
                'subjective' => $row['subjective'] ?? null,
                'objective' => $row['objective'] ?? null,
                'assessment' => $row['assessment'] ?? null,
                'plan_text' => $row['plan_text'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'scheduled_at' => $row['scheduled_at'] ?? null,
                'appt_type' => $row['appt_type'] ?? null,
                'appt_reason' => $row['appt_reason'] ?? null,
            ];
        }, $rows);

        $this->ok([
            'ok' => true,
            'data' => $data,
        ]);
    }

    /** POST /api/mobile/doctor/notes */
    public function doctorCreateNote(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();

        $patientId = (int)($body['patient_id'] ?? 0);
        $subjective = trim((string)($body['subjective'] ?? ''));
        $objective = trim((string)($body['objective'] ?? ''));
        $assessment = trim((string)($body['assessment'] ?? ''));
        $planText = trim((string)($body['plan_text'] ?? ''));

        if ($patientId <= 0) {
            $this->fail('Paciente invalido.', 400);
        }

        if (!$this->doctorCanAccessPatient($doctorId, $patientId)) {
            $this->fail('No tienes acceso a este paciente.', 403);
        }

        if ($subjective === '' && $objective === '' && $assessment === '' && $planText === '') {
            $this->fail('Agrega al menos un dato clinico para guardar la nota.', 400);
        }

        $db = Database::getInstance();
        $stmt = $db->prepare(
            'INSERT INTO medical_notes
               (appointment_id, doctor_id, patient_id, subjective, objective, assessment, plan_text)
             VALUES (NULL, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $doctorId,
            $patientId,
            $subjective !== '' ? $subjective : null,
            $objective !== '' ? $objective : null,
            $assessment !== '' ? $assessment : null,
            $planText !== '' ? $planText : null,
        ]);

        $this->ok([
            'ok' => true,
            'id' => (int)$db->lastInsertId(),
            'message' => 'Nota guardada correctamente.',
        ], 201);
    }

    /** GET /api/mobile/doctor/appointments/:id */
    public function doctorAppointmentDetail(string $id): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $appointmentId = (int)$id;

        if ($appointmentId <= 0) {
            $this->fail('Cita invalida.', 400);
        }

        $db = Database::getInstance();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $stmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.scheduled_at, a.end_at, a.checked_in_at, a.checked_out_at,
                    a.pay_deadline, a.type, a.status, a.reason,
                    a.consultation_fee, a.payment_status,
                    a.video_room_id,
                    u.name AS patient_name, u.email AS patient_email, u.avatar_url AS patient_avatar,
                    pp.phone AS patient_phone, pp.birth_date AS patient_birth_date,
                    pp.gender AS patient_gender, pp.blood_type AS patient_blood_type,
                    pp.allergies AS patient_allergies, pp.current_medications AS patient_current_medications,
                    dp.specialty, dp.address, dp.city, dp.state
             FROM appointments a
             JOIN users u ON u.id = a.patient_id
             LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ? AND a.doctor_id = ?
             LIMIT 1"
        );
        $stmt->execute([$appointmentId, $doctorId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$row) {
            $this->fail('Cita no encontrada.', 404);
        }

        $payload = $this->formatDoctorAppointment($row, $baseUrl);
        $payload['patient_email'] = $row['patient_email'] ?? null;
        $payload['patient_birth_date'] = $row['patient_birth_date'] ?? null;
        $payload['patient_age'] = $this->ageFromBirthDate($row['patient_birth_date'] ?? null);
        $payload['patient_gender'] = $row['patient_gender'] ?? null;
        $payload['patient_blood_type'] = $row['patient_blood_type'] ?? null;
        $payload['patient_allergies'] = $row['patient_allergies'] ?? null;
        $payload['patient_current_medications'] = $row['patient_current_medications'] ?? null;
        $payload['video_room_id'] = $row['video_room_id'] ?? null;

        $noteRows = $this->safeQuery(
            'SELECT id, appointment_id, subjective, objective, assessment, plan_text, created_at
             FROM medical_notes
             WHERE appointment_id = ? AND doctor_id = ?
             ORDER BY id DESC
             LIMIT 1',
            [$appointmentId, $doctorId]
        );

        $rxRows = $this->safeQuery(
            'SELECT id, appointment_id, diagnosis, medications, instructions, issued_date, status
             FROM prescriptions
             WHERE appointment_id = ? AND doctor_id = ?
             ORDER BY id DESC
             LIMIT 1',
            [$appointmentId, $doctorId]
        );

        $countStmt = $db->prepare(
            "SELECT COUNT(*) FROM appointments
             WHERE doctor_id = ? AND patient_id = ? AND id != ?
               AND status IN ('completed','in_consultation','confirmed')"
        );
        $countStmt->execute([$doctorId, (int)$row['patient_id'], $appointmentId]);

        $payload['note'] = $noteRows[0] ?? null;
        $payload['prescription'] = $rxRows[0] ?? null;
        $payload['prior_consultations'] = (int)$countStmt->fetchColumn();

        $this->ok([
            'ok' => true,
            'data' => $payload,
        ]);
    }

    /** POST /api/mobile/doctor/appointments/:id/checkin */
    public function doctorAppointmentCheckin(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $appointmentId = (int)$id;
        $body = $this->body();
        $code = strtoupper(trim((string)($body['code'] ?? '')));

        if ($appointmentId <= 0 || $code === '') {
            $this->fail('Codigo de check-in requerido.', 400);
        }

        $db = Database::getInstance();
        $stmt = $db->prepare(
            "SELECT id, patient_id, type, status, scheduled_at,
                    COALESCE(payment_status, 'not_required') AS payment_status,
                    checkin_code, checkin_code_expires_at, checked_in_at
             FROM appointments
             WHERE id = ? AND doctor_id = ?
             LIMIT 1"
        );
        $stmt->execute([$appointmentId, $doctorId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$appt) {
            $this->fail('Cita no encontrada.', 404);
        }

        if (($appt['type'] ?? '') !== 'presential') {
            $this->fail('El check-in manual solo aplica para citas presenciales.', 409);
        }

        if (($appt['status'] ?? '') === 'in_consultation') {
            $this->ok([
                'ok' => true,
                'message' => 'La consulta ya esta en curso.',
                'in_consultation' => true,
            ]);
        }

        if (($appt['status'] ?? '') !== 'confirmed') {
            $this->fail('Solo se puede registrar check-in en citas confirmadas.', 409);
        }

        if (($appt['payment_status'] ?? 'not_required') === 'pending') {
            $this->fail('No se puede iniciar la consulta con pago pendiente.', 409);
        }

        if (empty($appt['checkin_code'])) {
            $this->fail('El paciente aun no ha generado su codigo de check-in.', 409);
        }

        if (!hash_equals((string)$appt['checkin_code'], $code)) {
            $this->fail('Codigo de check-in incorrecto.', 409);
        }

        if (!empty($appt['checkin_code_expires_at']) && strtotime((string)$appt['checkin_code_expires_at']) < time()) {
            $this->fail('El codigo de check-in ya expiro.', 409);
        }

        $db->prepare(
            "UPDATE appointments
             SET checked_in_at = NOW(), status = 'in_consultation', updated_at = NOW()
             WHERE id = ? AND doctor_id = ?"
        )->execute([$appointmentId, $doctorId]);

        $this->ok([
            'ok' => true,
            'message' => 'Check-in registrado. Consulta iniciada.',
            'in_consultation' => true,
        ]);
    }

    /** POST /api/mobile/doctor/appointments/:id/complete */
    public function doctorAppointmentComplete(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $appointmentId = (int)$id;
        $body = $this->body();
        $code = strtoupper(trim((string)($body['checkout_code'] ?? '')));
        $force = !empty($body['force']);

        if ($appointmentId <= 0) {
            $this->fail('Cita invalida.', 400);
        }

        $db = Database::getInstance();
        $stmt = $db->prepare(
            "SELECT id, patient_id, type, status, checkout_code, checkout_code_expires_at, checked_out_at
             FROM appointments
             WHERE id = ? AND doctor_id = ?
             LIMIT 1"
        );
        $stmt->execute([$appointmentId, $doctorId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$appt) {
            $this->fail('Cita no encontrada.', 404);
        }

        if (($appt['status'] ?? '') !== 'in_consultation') {
            $this->fail('La consulta no esta activa.', 409);
        }

        $isPresential = ($appt['type'] ?? '') === 'presential';

        if ($isPresential && !$force) {
            if ($code === '') {
                $this->fail('Debes ingresar el codigo de cierre del paciente.', 400);
            }

            if (empty($appt['checkout_code'])) {
                $this->fail('El paciente aun no ha generado su codigo de cierre.', 409);
            }

            if (!hash_equals((string)$appt['checkout_code'], $code)) {
                $this->fail('Codigo de cierre incorrecto.', 409);
            }

            if (!empty($appt['checkout_code_expires_at']) && strtotime((string)$appt['checkout_code_expires_at']) < time()) {
                $this->fail('El codigo de cierre ya expiro. Pide uno nuevo al paciente.', 409);
            }
        }

        try {
            if ($isPresential && !$force) {
                $db->prepare(
                    "UPDATE appointments
                     SET status = 'completed', completed_at = NOW(), checked_out_at = NOW(), updated_at = NOW()
                     WHERE id = ? AND doctor_id = ?"
                )->execute([$appointmentId, $doctorId]);
            } else {
                $db->prepare(
                    "UPDATE appointments
                     SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                     WHERE id = ? AND doctor_id = ?"
                )->execute([$appointmentId, $doctorId]);
            }
        } catch (\Throwable) {
            $this->fail('No se pudo completar la cita.', 500);
        }

        $this->ok([
            'ok' => true,
            'message' => $force
                ? 'Consulta cerrada de forma manual.'
                : 'Consulta completada correctamente.',
            'status' => 'completed',
        ]);
    }

    /** POST /api/mobile/doctor/appointments/:id/status */
    public function doctorAppointmentUpdateStatus(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $appointmentId = (int)$id;
        $body = $this->body();
        $action = strtolower(trim((string)($body['action'] ?? $body['status'] ?? '')));

        $allowed = ['confirmed', 'in_consultation', 'completed', 'cancelled', 'no_show'];
        if ($appointmentId <= 0 || !in_array($action, $allowed, true)) {
            $this->fail('Accion de cita invalida.', 400);
        }

        $db = Database::getInstance();
        $stmt = $db->prepare(
            "SELECT id, patient_id, scheduled_at, type, status, consultation_fee, payment_status, checked_in_at
             FROM appointments
             WHERE id = ? AND doctor_id = ?
             LIMIT 1"
        );
        $stmt->execute([$appointmentId, $doctorId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$appt) {
            $this->fail('Cita no encontrada.', 404);
        }

        $current = (string)($appt['status'] ?? '');
        if (in_array($current, ['cancelled', 'completed'], true) && $action !== $current) {
            $this->fail('Esta cita ya no permite cambios de estado.', 409);
        }

        if (
            $action === 'confirmed'
            && (float)($appt['consultation_fee'] ?? 0) > 0
            && !in_array((string)($appt['payment_status'] ?? ''), ['paid', 'not_required', 'waived'], true)
        ) {
            $this->fail('La cita aun tiene pago pendiente.', 409);
        }

        if ($action === 'in_consultation') {
            if ($current === 'in_consultation') {
                $this->ok([
                    'ok' => true,
                    'status' => 'in_consultation',
                    'message' => 'La consulta ya esta en curso.',
                ]);
            }

            if ($current !== 'confirmed') {
                $this->fail('Solo se puede iniciar una cita confirmada.', 409);
            }

            if (($appt['payment_status'] ?? 'not_required') === 'pending') {
                $this->fail('No se puede iniciar la consulta con pago pendiente.', 409);
            }

            $scheduledTs = !empty($appt['scheduled_at']) ? strtotime((string)$appt['scheduled_at']) : 0;
            if ($scheduledTs <= 0 || date('Y-m-d', $scheduledTs) !== date('Y-m-d')) {
                $this->fail('Solo puedes iniciar la consulta el mismo dia agendado.', 409);
            }

            if (($appt['type'] ?? '') === 'presential' && empty($appt['checked_in_at'])) {
                $this->fail('Registra primero el check-in del paciente para iniciar la consulta presencial.', 409);
            }
        }

        if ($action === 'completed' && ($appt['type'] ?? '') === 'presential') {
            $this->fail('Usa el flujo de cierre con codigo del paciente para completar esta consulta.', 409);
        }

        try {
            if ($action === 'in_consultation') {
                $db->prepare(
                    "UPDATE appointments
                     SET status = 'in_consultation', updated_at = NOW()
                     WHERE id = ?"
                )->execute([$appointmentId]);
            } elseif ($action === 'completed') {
                $db->prepare(
                    "UPDATE appointments
                     SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                     WHERE id = ?"
                )->execute([$appointmentId]);
            } elseif ($action === 'cancelled') {
                $db->prepare(
                    "UPDATE appointments
                     SET status = 'cancelled', cancelled_by = 'doctor', updated_at = NOW()
                     WHERE id = ?"
                )->execute([$appointmentId]);
            } else {
                $db->prepare(
                    "UPDATE appointments
                     SET status = ?, updated_at = NOW()
                     WHERE id = ?"
                )->execute([$action, $appointmentId]);
            }
        } catch (\Throwable) {
            $db->prepare(
                "UPDATE appointments
                 SET status = ?, updated_at = NOW()
                 WHERE id = ?"
            )->execute([$action, $appointmentId]);
        }

        $labels = [
            'confirmed' => 'Cita confirmada.',
            'in_consultation' => 'Consulta iniciada.',
            'completed' => 'Consulta completada.',
            'cancelled' => 'Cita cancelada.',
            'no_show' => 'Paciente marcado como no asistio.',
        ];

        $this->ok([
            'ok' => true,
            'status' => $action,
            'message' => $labels[$action] ?? 'Estado actualizado.',
        ]);
    }

    /** GET|POST /api/mobile/doctor/appointments/:id/soap */
    public function doctorAppointmentSoap(string $id): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $appointmentId = (int)$id;

        if ($appointmentId <= 0) {
            $this->fail('Cita invalida.', 400);
        }

        $db = Database::getInstance();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $stmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.scheduled_at, a.end_at, a.checked_in_at, a.checked_out_at,
                    a.pay_deadline, a.type, a.status, a.reason,
                    a.consultation_fee, a.payment_status, a.video_room_id,
                    u.name AS patient_name, u.email AS patient_email, u.avatar_url AS patient_avatar,
                    pp.phone AS patient_phone, pp.birth_date AS patient_birth_date,
                    pp.gender AS patient_gender, pp.blood_type AS patient_blood_type,
                    pp.allergies AS patient_allergies, pp.current_medications AS patient_current_medications,
                    dp.specialty, dp.address, dp.city, dp.state
             FROM appointments a
             JOIN users u ON u.id = a.patient_id
             LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ? AND a.doctor_id = ?
             LIMIT 1"
        );
        $stmt->execute([$appointmentId, $doctorId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        if (!$row) {
            $this->fail('Cita no encontrada.', 404);
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (($row['status'] ?? '') === 'completed') {
                $this->fail('Esta consulta ya esta completada y sus notas son de solo lectura.', 409);
            }

            $body = $this->body();
            $subjective = trim((string)($body['subjective'] ?? ''));
            $objective = trim((string)($body['objective'] ?? ''));
            $assessment = trim((string)($body['assessment'] ?? ''));
            $planText = trim((string)($body['plan_text'] ?? ''));
            $rxDiagnosis = trim((string)($body['rx_diagnosis'] ?? ''));
            $rxMedications = trim((string)($body['rx_medications'] ?? ''));
            $rxInstructions = trim((string)($body['rx_instructions'] ?? ''));
            $rxValidDays = max(1, (int)($body['rx_valid_days'] ?? 30));

            $existingNoteStmt = $db->prepare(
                'SELECT id FROM medical_notes WHERE appointment_id = ? AND doctor_id = ? LIMIT 1'
            );
            $existingNoteStmt->execute([$appointmentId, $doctorId]);
            $noteId = $existingNoteStmt->fetchColumn();

            if ($noteId) {
                $db->prepare(
                    'UPDATE medical_notes
                     SET subjective = ?, objective = ?, assessment = ?, plan_text = ?, updated_at = NOW()
                     WHERE id = ?'
                )->execute([$subjective ?: null, $objective ?: null, $assessment ?: null, $planText ?: null, $noteId]);
            } else {
                $db->prepare(
                    'INSERT INTO medical_notes (appointment_id, doctor_id, patient_id, subjective, objective, assessment, plan_text)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                )->execute([
                    $appointmentId,
                    $doctorId,
                    (int)$row['patient_id'],
                    $subjective ?: null,
                    $objective ?: null,
                    $assessment ?: null,
                    $planText ?: null,
                ]);
            }

            $prescriptionSaved = false;
            if ($rxDiagnosis !== '' && $rxMedications !== '') {
                $existingRxStmt = $db->prepare(
                    'SELECT id FROM prescriptions WHERE appointment_id = ? AND doctor_id = ? ORDER BY id DESC LIMIT 1'
                );
                $existingRxStmt->execute([$appointmentId, $doctorId]);
                $rxId = $existingRxStmt->fetchColumn();

                if ($rxId) {
                    $db->prepare(
                        'UPDATE prescriptions
                         SET diagnosis = ?, medications = ?, instructions = ?, valid_days = ?, status = "active"
                         WHERE id = ?'
                    )->execute([$rxDiagnosis, $rxMedications, $rxInstructions ?: null, $rxValidDays, $rxId]);
                } else {
                    $db->prepare(
                        'INSERT INTO prescriptions
                         (doctor_id, patient_id, appointment_id, diagnosis, medications, instructions, issued_date, valid_days, status)
                         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, "active")'
                    )->execute([
                        $doctorId,
                        (int)$row['patient_id'],
                        $appointmentId,
                        $rxDiagnosis,
                        $rxMedications,
                        $rxInstructions ?: null,
                        $rxValidDays,
                    ]);
                }

                $prescriptionSaved = true;
            }

            if ($assessment !== '') {
                $histStmt = $db->prepare(
                    "SELECT id FROM medical_history WHERE patient_id = ? AND appointment_id = ? AND category = 'diagnosis' LIMIT 1"
                );
                $histStmt->execute([(int)$row['patient_id'], $appointmentId]);

                if (!$histStmt->fetchColumn()) {
                    $db->prepare(
                        "INSERT INTO medical_history
                         (patient_id, category, description, date_recorded, recorded_by_doctor_id, appointment_id)
                         VALUES (?, 'diagnosis', ?, CURDATE(), ?, ?)"
                    )->execute([(int)$row['patient_id'], $assessment, $doctorId, $appointmentId]);
                }
            }

            $this->ok([
                'ok' => true,
                'message' => 'Nota clinica guardada correctamente.',
                'note_saved' => true,
                'prescription_saved' => $prescriptionSaved,
            ]);
        }

        $recordStmt = $db->prepare(
            'SELECT * FROM patient_medical_records WHERE patient_id = ? LIMIT 1'
        );
        $recordStmt->execute([(int)$row['patient_id']]);
        $medicalRecord = $recordStmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        $noteStmt = $db->prepare(
            'SELECT id, appointment_id, subjective, objective, assessment, plan_text, created_at
             FROM medical_notes
             WHERE appointment_id = ? AND doctor_id = ?
             ORDER BY id DESC
             LIMIT 1'
        );
        $noteStmt->execute([$appointmentId, $doctorId]);
        $note = $noteStmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        $rxStmt = $db->prepare(
            'SELECT id, appointment_id, diagnosis, medications, instructions, valid_days, issued_date, status
             FROM prescriptions
             WHERE appointment_id = ? AND doctor_id = ?
             ORDER BY id DESC
             LIMIT 1'
        );
        $rxStmt->execute([$appointmentId, $doctorId]);
        $prescription = $rxStmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        $payload = $this->formatDoctorAppointment($row, $baseUrl);
        $payload['patient_email'] = $row['patient_email'] ?? null;
        $payload['patient_birth_date'] = $row['patient_birth_date'] ?? null;
        $payload['patient_age'] = $this->ageFromBirthDate($row['patient_birth_date'] ?? null);
        $payload['patient_gender'] = $row['patient_gender'] ?? null;
        $payload['patient_blood_type'] = $row['patient_blood_type'] ?? null;
        $payload['patient_allergies'] = $row['patient_allergies'] ?? null;
        $payload['patient_current_medications'] = $row['patient_current_medications'] ?? null;
        $payload['video_room_id'] = $row['video_room_id'] ?? null;

        $this->ok([
            'ok' => true,
            'appointment' => $payload,
            'medical_record' => $medicalRecord,
            'note' => $note,
            'prescription' => $prescription,
        ]);
    }

    /** GET /api/mobile/doctor/prescriptions */
    public function doctorPrescriptions(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $db = Database::getInstance();

        $rows = $this->safeQuery(
            "SELECT p.id, p.patient_id, p.appointment_id, p.diagnosis, p.medications, p.instructions,
                    p.valid_days, p.issued_date, p.status,
                    u.name AS patient_name,
                    a.scheduled_at AS appt_date, a.type AS appt_type
             FROM prescriptions p
             JOIN users u ON u.id = p.patient_id
             LEFT JOIN appointments a ON a.id = p.appointment_id
             WHERE p.doctor_id = ?
             ORDER BY p.issued_date DESC, p.id DESC
             LIMIT 150",
            [$doctorId]
        );

        $summaryStmt = $db->prepare(
            "SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
                COALESCE(SUM(CASE WHEN YEAR(issued_date) = YEAR(NOW()) AND MONTH(issued_date) = MONTH(NOW()) THEN 1 ELSE 0 END), 0) AS this_month,
                COALESCE(SUM(CASE WHEN appointment_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS linked_to_appointments
             FROM prescriptions
             WHERE doctor_id = ?"
        );
        $summaryStmt->execute([$doctorId]);
        $summary = $summaryStmt->fetch(\PDO::FETCH_ASSOC) ?: [];

        $mapped = array_map(static fn(array $row): array => [
            'id' => (int)($row['id'] ?? 0),
            'patient_id' => isset($row['patient_id']) ? (int)$row['patient_id'] : null,
            'patient_name' => $row['patient_name'] ?? null,
            'appointment_id' => isset($row['appointment_id']) ? (int)$row['appointment_id'] : null,
            'diagnosis' => $row['diagnosis'] ?? null,
            'medications' => $row['medications'] ?? null,
            'instructions' => $row['instructions'] ?? null,
            'valid_days' => isset($row['valid_days']) ? (int)$row['valid_days'] : null,
            'issued_date' => $row['issued_date'] ?? null,
            'status' => $row['status'] ?? null,
            'appt_date' => $row['appt_date'] ?? null,
            'appt_type' => $row['appt_type'] ?? null,
        ], $rows);

        $this->ok([
            'ok' => true,
            'summary' => [
                'total' => (int)($summary['total'] ?? 0),
                'active' => (int)($summary['active'] ?? 0),
                'this_month' => (int)($summary['this_month'] ?? 0),
                'linked_to_appointments' => (int)($summary['linked_to_appointments'] ?? 0),
            ],
            'data' => $mapped,
        ]);
    }

    /** POST /api/mobile/doctor/prescriptions */
    public function doctorCreatePrescription(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $body = $this->body();

        $patientId = (int)($body['patient_id'] ?? 0);
        $diagnosis = trim((string)($body['diagnosis'] ?? ''));
        $medications = trim((string)($body['medications'] ?? ''));
        $instructions = trim((string)($body['instructions'] ?? ''));
        $validDays = max(1, (int)($body['valid_days'] ?? 30));

        if ($patientId <= 0) {
            $this->fail('Paciente invalido.', 400);
        }

        if (!$this->doctorCanAccessPatient($doctorId, $patientId)) {
            $this->fail('No tienes acceso a este paciente.', 403);
        }

        if ($diagnosis === '' || $medications === '') {
            $this->fail('Diagnostico y medicamentos son obligatorios.', 400);
        }

        $db = Database::getInstance();
        $profileStmt = $db->prepare(
            'SELECT pp.birth_date, pp.weight_kg, pp.height_cm, pp.blood_type,
                    COALESCE(NULLIF(pp.allergies, ""), pmr.allergies) AS allergies
             FROM patient_profiles pp
             LEFT JOIN patient_medical_records pmr ON pmr.patient_id = pp.user_id
             WHERE pp.user_id = ?
             LIMIT 1'
        );
        $profileStmt->execute([$patientId]);
        $profile = $profileStmt->fetch(\PDO::FETCH_ASSOC) ?: [];

        $patientAge = $this->ageFromBirthDate($profile['birth_date'] ?? null);
        $patientWeight = isset($profile['weight_kg']) && $profile['weight_kg'] !== ''
            ? (float)$profile['weight_kg']
            : null;
        $patientHeight = isset($profile['height_cm']) && $profile['height_cm'] !== ''
            ? (float)$profile['height_cm']
            : null;

        $stmt = $db->prepare(
            'INSERT INTO prescriptions
               (doctor_id, patient_id, appointment_id, patient_age, patient_weight,
                patient_height, patient_blood_type, patient_allergies, diagnosis,
                medications, instructions, issued_date, valid_days, status)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, "active")'
        );
        $stmt->execute([
            $doctorId,
            $patientId,
            $patientAge,
            $patientWeight,
            $patientHeight,
            $profile['blood_type'] ?? null,
            $profile['allergies'] ?? null,
            $diagnosis,
            $medications,
            $instructions !== '' ? $instructions : null,
            $validDays,
        ]);

        $this->ok([
            'ok' => true,
            'id' => (int)$db->lastInsertId(),
            'message' => 'Receta guardada correctamente.',
        ], 201);
    }

    /** GET /api/mobile/doctor/financial-history */
    public function doctorFinancialHistory(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireDoctorJwt();
        $doctorId = (int)$jwt['sub'];
        $db = Database::getInstance();

        $consultationsStmt = $db->prepare(
            "SELECT p.id, p.appointment_id, p.amount, p.currency, p.method, p.status, p.created_at,
                    p.paypal_order_id,
                    u.name AS patient_name,
                    a.scheduled_at, a.type AS appointment_type
             FROM payments p
             LEFT JOIN appointments a ON a.id = p.appointment_id
             LEFT JOIN users u ON u.id = a.patient_id
             WHERE p.doctor_id = ? AND p.type = 'consultation'
             ORDER BY p.created_at DESC
             LIMIT 200"
        );
        $consultationsStmt->execute([$doctorId]);
        $consultations = $consultationsStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $subscriptionsStmt = $db->prepare(
            "SELECT id, amount, currency, method, status, created_at, paypal_order_id
             FROM payments
             WHERE doctor_id = ? AND type = 'subscription'
             ORDER BY created_at DESC
             LIMIT 100"
        );
        $subscriptionsStmt->execute([$doctorId]);
        $subscriptions = $subscriptionsStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $summaryStmt = $db->prepare(
            "SELECT
                COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW()) AND type = 'consultation' AND status = 'completed' THEN amount ELSE 0 END), 0) AS this_month,
                COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(NOW()) AND type = 'consultation' AND status = 'completed' THEN amount ELSE 0 END), 0) AS this_year,
                COALESCE(COUNT(CASE WHEN type = 'consultation' AND status = 'completed' THEN 1 END), 0) AS total_consultations
             FROM payments
             WHERE doctor_id = ?"
        );
        $summaryStmt->execute([$doctorId]);
        $summary = $summaryStmt->fetch(\PDO::FETCH_ASSOC) ?: [];

        $mappedConsultations = array_map(static fn(array $row): array => [
            'id' => (int)($row['id'] ?? 0),
            'appointment_id' => isset($row['appointment_id']) ? (int)$row['appointment_id'] : null,
            'patient_name' => $row['patient_name'] ?? null,
            'amount' => (float)($row['amount'] ?? 0),
            'currency' => strtoupper((string)($row['currency'] ?? 'MXN')),
            'method' => $row['method'] ?? null,
            'status' => $row['status'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'scheduled_at' => $row['scheduled_at'] ?? null,
            'appointment_type' => $row['appointment_type'] ?? null,
            'paypal_order_id' => $row['paypal_order_id'] ?? null,
        ], $consultations);

        $mappedSubscriptions = array_map(static fn(array $row): array => [
            'id' => (int)($row['id'] ?? 0),
            'amount' => (float)($row['amount'] ?? 0),
            'currency' => strtoupper((string)($row['currency'] ?? 'MXN')),
            'method' => $row['method'] ?? null,
            'status' => $row['status'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'paypal_order_id' => $row['paypal_order_id'] ?? null,
        ], $subscriptions);

        $this->ok([
            'ok' => true,
            'summary' => [
                'this_month' => (float)($summary['this_month'] ?? 0),
                'this_year' => (float)($summary['this_year'] ?? 0),
                'total_consultations' => (int)($summary['total_consultations'] ?? 0),
            ],
            'consultations' => $mappedConsultations,
            'subscriptions' => $mappedSubscriptions,
        ]);
    }

    /** GET /api/mobile/specialties */
    public function specialties(): void
    {
        $this->apiHeaders();
        $rows = Database::getInstance()
            ->query("SELECT DISTINCT specialty FROM doctor_profiles
                     WHERE specialty != '' AND specialty IS NOT NULL
                     ORDER BY specialty ASC")
            ->fetchAll(\PDO::FETCH_COLUMN);

        $icons = [
            'Medicina general'  => 'first-aid',
            'Pediatria'         => 'baby',
            'Ginecologia'       => 'gender-female',
            'Dermatologia'      => 'first-aid',
            'Psicologia'        => 'brain',
            'Traumatologia'     => 'bone',
            'Cardiologia'       => 'heart',
            'Oftalmologia'      => 'eye',
            'Odontologia'       => 'tooth',
            'Neurologia'        => 'pulse',
        ];

        $result = array_map(fn($s) => [
            'name' => $s,
            'icon' => $icons[$s] ?? 'first-aid',
        ], $rows);

        $this->ok(['data' => $result]);
    }

    // ── DOCTORES ─────────────────────────────────────────────

    /** GET /api/mobile/doctors?specialty=&search=&page= */
    public function doctors(): void
    {
        $this->apiHeaders();

        $filters = [
            'specialty' => trim($_GET['specialty'] ?? ''),
            'search'    => trim($_GET['search']    ?? ''),
            'city'      => trim($_GET['city']      ?? ''),
            'max_fee'   => (int)($_GET['max_fee']  ?? 0) ?: null,
        ];
        $page    = max(1, (int)($_GET['page'] ?? 1));
        $perPage = 15;
        $offset  = ($page - 1) * $perPage;

        $dp      = new DoctorProfile();
        $doctors = $dp->search($filters, $perPage, $offset);
        $total   = $dp->searchCount($filters);

        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';
        $result  = array_map(fn($d) => $this->formatDoctor($d, $baseUrl), $doctors);

        $this->ok([
            'data'        => $result,
            'total'       => $total,
            'page'        => $page,
            'total_pages' => (int)ceil($total / $perPage),
        ]);
    }

    /** GET /api/mobile/doctors/:id */
    public function doctorProfile(string $id): void
    {
        $this->apiHeaders();
        $id = (int)$id;
        if ($id <= 0) $this->fail('ID de doctor invalido.', 400);

        $dp      = new DoctorProfile();
        $profile = $this->hydrateDoctorPricing($id, $dp->findByUserId($id) ?: []);
        if (!$profile) $this->fail('Doctor no encontrado.', 404);

        $ratingStmt = Database::getInstance()->prepare(
            'SELECT COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
             FROM reviews r WHERE r.doctor_id = ?'
        );
        $ratingStmt->execute([$id]);
        $ratingData = $ratingStmt->fetch(\PDO::FETCH_ASSOC);
        $profile['avg_rating'] = $ratingData['avg_rating'] ?? 0;
        $profile['review_count'] = $ratingData['review_count'] ?? 0;

        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $reviews = Database::getInstance()->prepare(
            'SELECT r.rating, r.comment, r.created_at, u.name AS patient_name
             FROM reviews r
             JOIN users u ON u.id = r.patient_id
             WHERE r.doctor_id = ?
             ORDER BY r.created_at DESC LIMIT 5'
        );
        $reviews->execute([$id]);

        $this->ok([
            'data'    => $this->formatDoctor($profile, $baseUrl, true),
            'reviews' => $reviews->fetchAll(\PDO::FETCH_ASSOC),
        ]);
    }

    /** GET /api/mobile/doctors/:id/availability?date=YYYY-MM-DD */
    public function doctorAvailability(string $id): void
    {
        $this->apiHeaders();
        $id = (int)$id;
        if ($id <= 0) $this->fail('ID de doctor invalido.', 400);

        $date = $_GET['date'] ?? date('Y-m-d');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $this->fail('Formato de fecha invalido. Usa YYYY-MM-DD.');
        }

        $dp           = new DoctorProfile();
        $availability = $dp->getAvailability($id);
        $dayName      = strtolower(date('l', strtotime($date)));

        $profileRow = $dp->findByUserId($id);
        $profileDuration = (int)($profileRow['duration_minutes'] ?? 30);

        $dayMap = [
            'monday'    => 1, 'tuesday'   => 2, 'wednesday' => 3,
            'thursday'  => 4, 'friday'    => 5, 'saturday'  => 6, 'sunday'  => 0,
        ];
        $dayKey = $dayMap[$dayName] ?? -1;

        $daySchedule = null;
        foreach ($availability as $s) {
            if ((int)($s['day_of_week'] ?? -1) === $dayKey) {
                $daySchedule = $s;
                break;
            }
        }

        $yearMonth = substr($date, 0, 7);
        $overrides = $dp->getAvailabilityOverrides($id, $yearMonth);
        $override = $overrides[$date] ?? null;

        if ($override && !empty($override['is_off'])) {
            $this->ok(['date' => $date, 'slots' => []]);
            return;
        }

        if (!$daySchedule) {
            $this->ok(['date' => $date, 'slots' => []]);
            return;
        }

        $duration = $profileDuration;
        $start    = $override['start_time'] ?? ($daySchedule['start_time'] ?? '09:00');
        $end      = $override['end_time']   ?? ($daySchedule['end_time']   ?? '17:00');
        $breakS   = $daySchedule['break_start'] ?? null;
        $breakE   = $daySchedule['break_end']   ?? null;

        $allSlots = [];
        $t = strtotime($start);
        $endTs = strtotime($end);

        while ($t < $endTs) {
            $slotStart = date('H:i', $t);
            $slotEndTs = $t + $duration * 60;

            $skip = false;
            if ($breakS && $breakE) {
                $breakStartTs = strtotime($breakS);
                $breakEndTs   = strtotime($breakE);
                if ($t < $breakEndTs && $slotEndTs > $breakStartTs) {
                    $skip = true;
                }
            }

            if (!$skip) {
                $allSlots[] = $slotStart;
            }

            $t = $slotEndTs;
        }

        $booked = Database::getInstance()->prepare(
            "SELECT TIME_FORMAT(scheduled_at, '%H:%i') AS t
             FROM appointments
             WHERE doctor_id = ? AND DATE(scheduled_at) = ?
               AND status NOT IN ('cancelled','rejected','missed','no_show')"
        );
        $booked->execute([$id, $date]);
        $bookedTimes = $booked->fetchAll(\PDO::FETCH_COLUMN);

        $today = date('Y-m-d');
        $nowMinutes = 0;
        if ($date === $today) {
            $nowMinutes = (int)date('H') * 60 + (int)date('i');
        }

        $available = array_values(array_filter($allSlots, function($t) use ($bookedTimes, $date, $today, $nowMinutes, $duration) {
            if (in_array($t, $bookedTimes)) return false;
            if ($date === $today) {
                [$h, $m] = explode(':', $t);
                $slotMinutes = (int)$h * 60 + (int)$m;
                if ($slotMinutes <= $nowMinutes - $duration) return false;
            }
            return true;
        }));

        $this->ok(['date' => $date, 'slots' => $available]);
    }

    // ── CITAS ─────────────────────────────────────────────────

    /** POST /api/mobile/appointments */
    public function createAppointment(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $jwt  = $this->requireJwt();
        $body = $this->body();

        $doctorId = (int)($body['doctor_id'] ?? 0);
        $date     = (string)($body['date']   ?? '');
        $time     = (string)($body['time']   ?? '');
        $rawType  = strtolower(trim((string)($body['type'] ?? 'presential')));
        $typeMap  = [
            'presencial'    => 'presential',
            'presential'    => 'presential',
            'videoconsulta' => 'virtual',
            'virtual'       => 'virtual',
            'domicilio'     => 'home_visit',
            'home_visit'    => 'home_visit',
        ];
        $type     = $typeMap[$rawType] ?? '';
        $reason   = trim((string)($body['reason'] ?? ''));
        $notes    = (string)($body['notes']  ?? '');

        if (!$doctorId || !$date || !$time) {
            $this->fail('doctor_id, date y time son requeridos.');
        }

        if (!in_array($type, ['presential', 'virtual', 'home_visit'], true)) {
            $this->fail('Tipo invalido. Usa: presencial/videoconsulta/domicilio.');
        }

        $scheduledAt = $date . ' ' . $time . ':00';
        $patientId   = (int)$jwt['sub'];

        $conflict = Database::getInstance()->prepare(
            "SELECT id FROM appointments
             WHERE doctor_id = ? AND scheduled_at = ? AND status NOT IN ('cancelled','rejected','missed','no_show')
             LIMIT 1"
        );
        $conflict->execute([$doctorId, $scheduledAt]);
        if ($conflict->fetch()) $this->fail('Ese horario ya no esta disponible.', 409);

        $dp      = new DoctorProfile();
        $profile = $this->hydrateDoctorPricing($doctorId, $dp->findByUserId($doctorId) ?: []);
        if (!$profile) $this->fail('Doctor no encontrado.', 404);

        $fee = match ($type) {
            'virtual'    => (float)($profile['telemedicine_fee'] ?? 0),
            'home_visit' => (float)($profile['home_visit_fee']   ?? 0),
            default         => (float)($profile['consultation_fee'] ?? 0),
        };

        $durationMinutes = (int)($profile['duration_minutes'] ?? 30);
        $scheduledEnd = date('Y-m-d H:i:s', strtotime($scheduledAt) + $durationMinutes * 60);

        $payDeadline = null;
        if ($fee > 0) {
            $status      = 'pending_payment';
            $payStatus   = 'pending';
            $payDeadline = date('Y-m-d H:i:s', time() + 2 * 3600);
        } else {
            $status    = 'confirmed';
            $payStatus = 'waived';
        }

        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO appointments
               (patient_id, doctor_id, scheduled_at, end_at, type, status,
                consultation_fee, payment_status, pay_deadline,
                reason, notes, created_by_role, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        )->execute([
            $patientId, $doctorId, $scheduledAt, $scheduledEnd, $type, $status,
            $fee, $payStatus, $payDeadline,
            $reason !== '' ? $reason : null,
            $notes !== '' ? $notes : null,
            'patient',
        ]);

        $appointmentId = (int)$pdo->lastInsertId();

        $this->ok([
            'id'           => $appointmentId,
            'status'       => $status,
            'fee'          => $fee,
            'pay_deadline' => $payDeadline,
        ], 201);
    }

    /** GET /api/mobile/appointments */
    public function appointments(): void
    {
        $this->apiHeaders();
        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $status    = $_GET['status'] ?? 'upcoming';

        $condition = $status === 'past'
            ? "AND (a.scheduled_at < NOW() OR a.status IN ('completed','cancelled','rejected','missed','no_show'))"
            : "AND a.scheduled_at >= NOW() AND a.status NOT IN ('completed','cancelled','rejected','missed','no_show')";

        $stmt = Database::getInstance()->prepare(
            "SELECT a.id, a.doctor_id, a.scheduled_at, a.end_at, a.type, a.status,
                a.payment_status, a.reason, a.notes, a.consultation_fee,
                    u.name AS doctor_name, dp.specialty,
                    COALESCE(dp.photo, u.avatar_url) AS doctor_photo,
                    dp.address, dp.city
             FROM appointments a
             JOIN users u ON u.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.patient_id = ? $condition
             ORDER BY a.scheduled_at ASC
             LIMIT 50"
        );
        $stmt->execute([$patientId]);
        $rows    = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $result = array_map(fn($r) => [
            'id'           => (int)$r['id'],
            'doctor_id'    => (int)($r['doctor_id'] ?? 0),
            'scheduled_at' => $r['scheduled_at'],
            'end_at'       => $r['end_at'] ?? null,
            'type'         => $r['type'],
            'status'       => $r['status'],
            'payment_status' => $r['payment_status'] ?? null,
            'reason'       => $r['reason'] ?? null,
            'notes'        => $r['notes'] ?? null,
            'fee'          => (float)($r['consultation_fee'] ?? 0),
            'doctor_name'  => $r['doctor_name'],
            'specialty'    => $r['specialty'],
            'doctor_photo' => $this->absoluteUrl($r['doctor_photo'] ?? null, $baseUrl),
            'location'     => trim(($r['address'] ?? '') . ', ' . ($r['city'] ?? ''), ', '),
        ], $rows);

        $this->ok(['data' => $result]);
    }

    /** GET /api/mobile/appointments/:id */
    public function appointmentDetail(string $id): void
    {
        $this->apiHeaders();
        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $id = (int)$id;

        $stmt = Database::getInstance()->prepare(
                'SELECT a.*, u.name AS doctor_name, dp.specialty,
                    COALESCE(dp.photo, u.avatar_url) AS doctor_photo,
                    dp.address, dp.city, dp.state,
                    dp.consultation_fee AS doctor_consultation_fee,
                    dp.telemedicine_fee AS doctor_telemedicine_fee
             FROM appointments a
             JOIN users u ON u.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
             LIMIT 1'
        );
        $stmt->execute([$id, $patientId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) $this->fail('Cita no encontrada.', 404);

        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';
        $payload = $row;
        $payload['id'] = (int)($row['id'] ?? 0);
        $payload['doctor_id'] = (int)($row['doctor_id'] ?? 0);
        $payload['doctor_name'] = $row['doctor_name'] ?? '';
        $payload['specialty'] = $row['specialty'] ?? '';
        $payload['doctor_photo'] = $this->absoluteUrl($row['doctor_photo'] ?? null, $baseUrl);
        $payload['fee'] = (float)($row['consultation_fee'] ?? 0);
        $payload['consultation_fee'] = (float)($row['consultation_fee'] ?? 0);
        $payload['location'] = trim(($row['address'] ?? '') . ', ' . ($row['city'] ?? '') . ', ' . ($row['state'] ?? ''), ', ');
        $payload['date'] = !empty($row['scheduled_at']) ? date('Y-m-d', strtotime((string)$row['scheduled_at'])) : null;
        $payload['time'] = !empty($row['scheduled_at']) ? date('H:i', strtotime((string)$row['scheduled_at'])) : null;
        $payload['pay_deadline'] = $row['pay_deadline'] ?? null;

        $this->ok(['data' => $payload]);
    }

    /** GET /api/mobile/appointments/:id/payment-info */
    public function appointmentPaymentInfo(string $id): void
    {
        $this->apiHeaders();
        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $apptId    = (int)$id;
        $pdo       = Database::getInstance();

        $stmt = $pdo->prepare(
            "SELECT a.id, a.payment_status, a.status, a.type,
                    a.scheduled_at, a.reason, a.consultation_fee, a.pay_deadline,
                    u.name AS doctor_name,
                    dp.specialty
             FROM appointments a
             JOIN users u ON u.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
               AND a.status NOT IN ('cancelled','completed')
             LIMIT 1"
        );
        $stmt->execute([$apptId, $patientId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->fail('Cita no encontrada o no tiene pago pendiente.', 404);
        }

        if (in_array($appt['payment_status'] ?? '', ['paid', 'not_required'], true)) {
            $this->fail('Esta cita ya esta pagada.', 409);
        }

        try {
            $mRows = $pdo->query(
                "SELECT method, enabled FROM payment_method_settings WHERE context = 'consultation'"
            )->fetchAll(\PDO::FETCH_KEY_PAIR);
        } catch (\Throwable) {
            $mRows = [];
        }

        $methodEnabled = fn(string $key) => isset($mRows[$key]) ? (bool)$mRows[$key] : true;

        $stripePublishableKey = '';
        $stripeConfigured = false;
        try {
            $stripe = Stripe::getInstance();
            if ($stripe->isConfigured()) {
                $stripeConfigured = true;
                $stripePublishableKey = (string)$stripe->getPublishableKey();
            }
        } catch (\Throwable) {}

        $paypalConfigured = false;
        try {
            $paypalConfigured = PayPal::getInstance()->isConfigured();
        } catch (\Throwable) {}

        $this->ok([
            'ok' => true,
            'stripe_publishable_key' => $stripePublishableKey,
            'appointment' => [
                'id' => (int)$appt['id'],
                'doctor_name' => $appt['doctor_name'] ?? '',
                'specialty' => $appt['specialty'] ?? '',
                'type' => $appt['type'] ?? '',
                'scheduled_at' => $appt['scheduled_at'] ?? null,
                'pay_deadline' => $appt['pay_deadline'] ?? null,
                'amount' => (float)($appt['consultation_fee'] ?? 0),
                'reason' => $appt['reason'] ?? '',
            ],
            'methods' => [
                'stripe_card' => $methodEnabled('stripe_card') && $stripeConfigured,
                'paypal' => $methodEnabled('paypal') && $paypalConfigured,
            ],
        ]);
    }

    /** POST /api/mobile/appointments/:id/stripe/create-intent */
    public function appointmentStripeCreateIntent(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $apptId    = (int)$id;
        $body      = $this->body();
        $method    = (string)($body['payment_method'] ?? 'card');

        if (!in_array($method, ['card'], true)) {
            $this->fail('Metodo de pago no valido.', 400);
        }

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare(
            "SELECT a.consultation_fee, a.scheduled_at, a.payment_status, a.status,
                    a.doctor_id, a.pay_deadline, u.name AS doctor_name
             FROM appointments a
             JOIN users u ON u.id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
               AND a.status NOT IN ('cancelled','completed')
             LIMIT 1"
        );
        $stmt->execute([$apptId, $patientId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->fail('Cita no encontrada.', 404);
        }

        if (in_array($appt['payment_status'] ?? '', ['paid', 'not_required'], true)) {
            $this->fail('Esta cita ya esta pagada.', 409);
        }

        if (!empty($appt['pay_deadline']) && strtotime((string)$appt['pay_deadline']) < time()) {
            $this->fail('El plazo de pago ha expirado. La cita fue liberada. Puedes agendar una nueva cita.', 409);
        }

        $fee = (float)($appt['consultation_fee'] ?? 0);
        if ($fee <= 0) {
            $this->fail('Esta consulta no requiere pago.', 400);
        }

        try {
            $mStmt = $pdo->prepare(
                "SELECT enabled FROM payment_method_settings WHERE method = ? AND context = 'consultation' LIMIT 1"
            );
            $mStmt->execute(['stripe_card']);
            $mEnabled = $mStmt->fetchColumn();
            if ($mEnabled !== false && !(bool)$mEnabled) {
                $this->fail('Metodo de pago no disponible actualmente.', 422);
            }
        } catch (\Throwable) {}

        $stripe = Stripe::getInstance();
        if (!$stripe->isConfigured()) {
            $this->fail('Pasarela Stripe no configurada todavia.', 503);
        }

        $dt = date('d/m/Y H:i', strtotime((string)($appt['scheduled_at'] ?? 'now')));
        $desc = 'Consulta con ' . ($appt['doctor_name'] ?? 'Doctor') . ' - ' . $dt;

        try {
            $intent = $stripe->createPaymentIntent($fee, 'MXN', $desc, ['card']);

            try {
                $pdo->prepare(
                    "INSERT INTO payments
                       (user_id, doctor_id, appointment_id, amount, currency, method, status, type, payout_status,
                        stripe_payment_intent_id, stripe_intent_method)
                     VALUES (?, ?, ?, ?, ?, 'stripe', 'pending', 'consultation', 'pending', ?, ?)"
                )->execute([
                    $patientId,
                    (int)$appt['doctor_id'],
                    $apptId,
                    $fee,
                    'MXN',
                    $intent['id'],
                    'card',
                ]);
            } catch (\Throwable) {
                $pdo->prepare(
                    "INSERT INTO payments
                       (user_id, doctor_id, appointment_id, amount, currency, method, status, type, payout_status,
                        stripe_payment_intent_id)
                     VALUES (?, ?, ?, ?, ?, 'stripe', 'pending', 'consultation', 'pending', ?)"
                )->execute([
                    $patientId,
                    (int)$appt['doctor_id'],
                    $apptId,
                    $fee,
                    'MXN',
                    $intent['id'],
                ]);
            }

            $this->ok([
                'ok' => true,
                'publishable_key' => (string)$stripe->getPublishableKey(),
                'client_secret' => $intent['client_secret'] ?? '',
                'payment_method' => 'card',
                'amount' => $fee,
                'appt_id' => $apptId,
            ]);
        } catch (\Throwable $e) {
            error_log('[MobileApiController::appointmentStripeCreateIntent] ' . $e->getMessage());
            $this->fail('Error al crear el pago con Stripe.', 500);
        }
    }

    /** POST /api/mobile/appointments/:id/cancel */
    public function cancelAppointment(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $id = (int)$id;

        $stmt = Database::getInstance()->prepare(
            "SELECT id, status, scheduled_at FROM appointments
             WHERE id = ? AND patient_id = ? LIMIT 1"
        );
        $stmt->execute([$id, $patientId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) $this->fail('Cita no encontrada.', 404);
        if (in_array($appt['status'], ['cancelled', 'completed'])) {
            $this->fail('Esta cita ya no se puede cancelar.');
        }
        if (strtotime($appt['scheduled_at']) - time() < 3600) {
            $this->fail('No puedes cancelar con menos de 1 hora de anticipacion.');
        }

        Database::getInstance()->prepare(
            "UPDATE appointments SET status = 'cancelled', cancelled_by = 'patient', updated_at = NOW() WHERE id = ?"
        )->execute([$id]);

        $this->ok(['message' => 'Cita cancelada correctamente.']);
    }

    // ── DASHBOARD STATS ──────────────────────────────────────
    
    /** GET /api/mobile/dashboard/stats */
    public function dashboardStats(): void
    {
        $this->apiHeaders();
        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];

        try {
            $pdo = Database::getInstance();

            // Upcoming appointments
            $upStmt = $pdo->prepare(
                "SELECT COUNT(*) FROM appointments
                 WHERE patient_id = ? AND scheduled_at >= NOW()
                   AND status NOT IN ('completed','cancelled','rejected','missed','no_show')"
            );
            $upStmt->execute([$patientId]);
            $upcoming = (int)$upStmt->fetchColumn();

            // Pending payment
            $ppStmt = $pdo->prepare(
                "SELECT COUNT(*) FROM appointments
                 WHERE patient_id = ?
                   AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'pending')
                   AND status IN ('pending','pending_payment','pending_doctor','pending_patient','confirmed')
                   AND scheduled_at >= NOW()"
            );
            $ppStmt->execute([$patientId]);
            $pendingPayment = (int)$ppStmt->fetchColumn();

            // Completed appointments
            $compStmt = $pdo->prepare(
                "SELECT COUNT(*) FROM appointments
                 WHERE patient_id = ? AND status IN ('completed','finished')"
            );
            $compStmt->execute([$patientId]);
            $completed = (int)$compStmt->fetchColumn();

            // Unread messages (safe)
            $unreadMessages = 0;
            try {
                $msgStmt = $pdo->prepare(
                    "SELECT COALESCE(SUM(m.unread), 0) FROM (
                        SELECT (SELECT COUNT(*) FROM chat_messages
                         WHERE thread_id = c.id AND sender_id != ? AND is_read = 0) AS unread
                        FROM chat_threads c
                        WHERE c.patient_id = ?
                    ) m"
                );
                $msgStmt->execute([$patientId, $patientId]);
                $unreadMessages = (int)$msgStmt->fetchColumn();
            } catch (\Throwable $e) {
                $unreadMessages = 0;
            }

            // Total doctors
            $totalDoctors = 0;
            try {
                $docStmt = $pdo->query(
                    "SELECT COUNT(*) FROM users WHERE role = 'doctor' AND status = 'active'"
                );
                $totalDoctors = (int)$docStmt->fetchColumn();
            } catch (\Throwable $e) {
                try {
                    $docStmt = $pdo->query(
                        "SELECT COUNT(*) FROM users WHERE role_name = 'doctor' AND status = 'active'"
                    );
                    $totalDoctors = (int)$docStmt->fetchColumn();
                } catch (\Throwable $e2) {
                    $totalDoctors = 0;
                }
            }

            $this->ok([
                'data' => [
                    'upcoming'       => $upcoming,
                    'pendingPayment' => $pendingPayment,
                    'completed'      => $completed,
                    'unreadMessages' => $unreadMessages,
                    'totalDoctors'   => $totalDoctors,
                ]
            ]);
        } catch (\Throwable $e) {
            // Return safe defaults on any error
            $this->ok([
                'data' => [
                    'upcoming'       => 0,
                    'pendingPayment' => 0,
                    'completed'      => 0,
                    'unreadMessages' => 0,
                    'totalDoctors'   => 0,
                ]
            ]);
        }
    }

    // ── MENSAJES (uses chat_threads / chat_messages) ──────────

    /** GET /api/mobile/messages */
    public function messages(): void
    {
        $this->apiHeaders();
        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];

        try {
            $stmt = Database::getInstance()->prepare(
                    "SELECT c.id, c.doctor_id, c.last_message_at,
                        u.name AS doctor_name,
                        COALESCE(dp.photo, u.avatar_url) AS doctor_photo,
                        (SELECT message FROM chat_messages
                         WHERE thread_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                        (SELECT COUNT(*) FROM chat_messages
                         WHERE thread_id = c.id AND sender_id != ? AND is_read = 0) AS unread
                 FROM chat_threads c
                 JOIN users u ON u.id = c.doctor_id
                 LEFT JOIN doctor_profiles dp ON dp.user_id = c.doctor_id
                 WHERE c.patient_id = ?
                 ORDER BY c.last_message_at DESC"
            );
            $stmt->execute([$patientId, $patientId]);
            $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';
            $rows    = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $result = array_map(fn($r) => [
                'id'           => (int)$r['id'],
                'doctor_id'    => (int)$r['doctor_id'],
                'doctor_name'  => $r['doctor_name'],
                'doctor_photo' => $this->absoluteUrl($r['doctor_photo'] ?? null, $baseUrl),
                'last_message' => $r['last_message'],
                'unread'       => (int)$r['unread'],
                'updated_at'   => $r['last_message_at'],
            ], $rows);

            $this->ok(['data' => $result]);
        } catch (\Throwable $e) {
            $this->ok(['data' => []]);
        }
    }

    /** GET /api/mobile/messages/:id */
    public function conversation(string $id): void
    {
        $this->apiHeaders();
        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $id = (int)$id;

        try {
            $conv = Database::getInstance()->prepare(
                'SELECT id FROM chat_threads WHERE id = ? AND patient_id = ? LIMIT 1'
            );
            $conv->execute([$id, $patientId]);
            if (!$conv->fetch()) $this->fail('Conversacion no encontrada.', 404);

            // Get the LAST 100 messages (using subquery to get the latest messages)
            $stmt = Database::getInstance()->prepare(
                "SELECT m.id, m.sender_id, m.message, m.message_type, 
                       m.is_read, m.created_at,
                       COALESCE(u.name, 'Sistema') AS sender_name
                 FROM (
                    SELECT * FROM chat_messages
                    WHERE thread_id = ?
                    ORDER BY id DESC
                    LIMIT 100
                 ) m
                 LEFT JOIN users u ON u.id = m.sender_id
                 ORDER BY m.id ASC"
            );
            $stmt->execute([$id]);

            Database::getInstance()->prepare(
                "UPDATE chat_messages SET is_read = 1
                 WHERE thread_id = ? AND sender_id != ?"
            )->execute([$id, $patientId]);

            $this->ok(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) {
            $this->fail('Error al cargar la conversacion. Es posible que las tablas de chat no esten creadas.', 500);
        }
    }

    /** POST /api/mobile/messages/:id */
    public function sendMessage(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $body      = $this->body();
        $text      = trim((string)($body['message'] ?? ''));
        $id = (int)$id;

        if ($text === '') $this->fail('El mensaje no puede estar vacio.');
        if (mb_strlen($text) > 2000) $this->fail('Mensaje demasiado largo (max. 2000 caracteres).');

        try {
            $conv = Database::getInstance()->prepare(
                'SELECT id FROM chat_threads WHERE id = ? AND patient_id = ? LIMIT 1'
            );
            $conv->execute([$id, $patientId]);
            if (!$conv->fetch()) $this->fail('Conversacion no encontrada.', 404);

            $pdo = Database::getInstance();
            $pdo->prepare(
                'INSERT INTO chat_messages (thread_id, sender_id, message, is_read, created_at)
                 VALUES (?, ?, ?, 0, NOW())'
            )->execute([$id, $patientId, $text]);

            $pdo->prepare(
                'UPDATE chat_threads SET last_message_at = NOW() WHERE id = ?'
            )->execute([$id]);

            $this->ok(['id' => (int)$pdo->lastInsertId(), 'message' => 'Mensaje enviado.'], 201);
        } catch (\Throwable $e) {
            $this->fail('Error al enviar el mensaje. Es posible que las tablas de chat no esten creadas.', 500);
        }
    }

    // ── PERFIL ────────────────────────────────────────────────

    /** GET /api/mobile/profile */
    public function profile(): void
    {
        $this->apiHeaders();
        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        $userModel = new User();
        $user      = $userModel->findWithRole($userId);
        if (!$user) $this->fail('Usuario no encontrado.', 404);

        $pp      = new PatientProfile();
        $profile = $pp->findByUserId($userId);
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';
        $accessCode = $this->ensurePatientAccessCode($userId);

        $this->ok([
            'id'          => (int)$user['id'],
            'name'        => $user['name'],
            'email'       => $user['email'],
            'phone'       => $user['phone'] ?? null,
            'avatar_url'  => $this->absoluteUrl($user['avatar_url'] ?? null, $baseUrl),
            'birth_date'  => $profile['birth_date']  ?? null,
            'gender'      => $profile['gender']      ?? null,
            'blood_type'  => $profile['blood_type']  ?? null,
            'address'     => $profile['address']     ?? null,
            'city'        => $profile['city']        ?? null,
            'height_cm'               => $profile['height_cm']               ?? null,
            'weight_kg'               => $profile['weight_kg']               ?? null,
            'occupation'              => $profile['occupation']              ?? null,
            'state'                   => $profile['state']                   ?? null,
            'lat'                     => $this->hasColumn('patient_profiles', 'lat') ? ($profile['lat'] ?? null) : null,
            'lng'                     => $this->hasColumn('patient_profiles', 'lng') ? ($profile['lng'] ?? null) : null,
            'doctor_access_code'      => $accessCode,
            'emergency_contact_name'  => $profile['emergency_contact_name']  ?? null,
            'emergency_contact_phone' => $profile['emergency_contact_phone'] ?? null,
        ]);
    }

    /** PUT /api/mobile/profile */
    public function updateProfile(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') $this->fail('Method not allowed.', 405);

        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];
        $body   = $this->body();

        $name   = trim((string)($body['name']  ?? ''));
        $phone  = preg_replace('/\D/', '', (string)($body['phone'] ?? ''));

        if ($name !== '') {
            Database::getInstance()->prepare(
                'UPDATE users SET name = ?, phone = ? WHERE id = ?'
            )->execute([$name, $phone ?: null, $userId]);
        }

        $profileData = array_filter([
            'birth_date'              => $body['birth_date']              ?? null,
            'gender'                  => $body['gender']                  ?? null,
            'blood_type'              => $body['blood_type']              ?? null,
            'phone'                   => $body['phone']                   ?? null,
            'height_cm'               => $body['height_cm']               ?? null,
            'weight_kg'               => $body['weight_kg']               ?? null,
            'occupation'              => $body['occupation']              ?? null,
            'address'                 => $body['address']                 ?? null,
            'city'                    => $body['city']                    ?? null,
            'state'                   => $body['state']                   ?? null,
            'emergency_contact_name'  => $body['emergency_contact_name']  ?? null,
            'emergency_contact_phone' => $body['emergency_contact_phone'] ?? null,
        ], fn($v) => $v !== null);

        if ($this->hasColumn('patient_profiles', 'lat') && array_key_exists('lat', $body)) {
            $profileData['lat'] = $body['lat'] !== null && $body['lat'] !== ''
                ? (float)$body['lat']
                : null;
        }

        if ($this->hasColumn('patient_profiles', 'lng') && array_key_exists('lng', $body)) {
            $profileData['lng'] = $body['lng'] !== null && $body['lng'] !== ''
                ? (float)$body['lng']
                : null;
        }

        if ($profileData) {
            $pp = new PatientProfile();
            $pp->update($userId, $profileData);
        }

        $this->ok(['message' => 'Perfil actualizado correctamente.']);
    }

    /** POST /api/mobile/avatar */
    public function avatar(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        if (empty($_FILES['avatar'])) {
            $this->fail('No se recibió ningún archivo.', 400);
        }

        $path = $this->storeUpload($_FILES['avatar'], 'photos');
        if (!$path) {
            $this->fail('Archivo inválido. Usa JPG, PNG o WebP (máx. 2 MB).', 422);
        }

        $userModel = new User();
        $existing = $userModel->findWithRole($userId);

        if (!empty($existing['avatar_url'])) {
            $old = APP_ROOT . '/' . ltrim((string)$existing['avatar_url'], '/');
            if (is_file($old)) {
                @unlink($old);
            }
        }

        $userModel->updateAvatar($userId, $path);
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $this->ok([
            'success' => true,
            'url' => rtrim($baseUrl, '/') . '/' . ltrim($path, '/'),
        ]);
    }

    /** POST /api/mobile/avatar/remove */
    public function removeAvatar(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        $userModel = new User();
        $existing = $userModel->findWithRole($userId);
        if (!empty($existing['avatar_url'])) {
            $old = APP_ROOT . '/' . ltrim((string)$existing['avatar_url'], '/');
            if (is_file($old)) {
                @unlink($old);
            }
        }

        $userModel->updateAvatar($userId, '');
        $this->ok(['success' => true]);
    }

    // ── QR / CHECK-IN / CHECKOUT ─────────────────────────────

    /** GET /api/mobile/appointments/:id/qr */
    public function appointmentQr(string $id): void
    {
        $this->apiHeaders();
        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $id        = (int)$id;

        $pdo = Database::getInstance();

        $st = $pdo->prepare(
            "SELECT id, type, status, checkin_code, checkin_code_expires_at,
                    checkout_code, checkout_code_expires_at, checked_in_at, checked_out_at,
                    scheduled_at, end_at
             FROM appointments WHERE id = ? AND patient_id = ? LIMIT 1"
        );
        $st->execute([$id, $patientId]);
        $appt = $st->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) $this->fail('Cita no encontrada.', 404);

        if (!$appt['checkin_code'] && strtotime($appt['scheduled_at']) - time() < 7200) {
            $code      = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
            $expiresAt = date('Y-m-d H:i:s', strtotime($appt['end_at']) + 60);
            $pdo->prepare(
                "UPDATE appointments SET checkin_code = ?, checkin_code_expires_at = ?
                 WHERE id = ? AND patient_id = ? AND checkin_code IS NULL"
            )->execute([$code, $expiresAt, $id, $patientId]);
            $appt['checkin_code'] = $code;
            $appt['checkin_code_expires_at'] = $expiresAt;
        }

        $this->ok(['data' => [
            'id'               => $id,
            'checkin_code'     => $appt['checkin_code'],
            'checkin_expires'  => $appt['checkin_code_expires_at'],
            'checked_in'       => $appt['checked_in_at'] !== null,
            'checkout_code'    => $appt['checkout_code'],
            'checkout_expires' => $appt['checkout_code_expires_at'],
        ]]);
    }

    /** POST /api/mobile/appointments/:id/checkin */
    public function checkinAppointment(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $id        = (int)$id;
        $body      = $this->body();
        $code      = strtoupper(trim((string)($body['code'] ?? '')));

        if (!$code) $this->fail('Código de check-in requerido.');

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            "SELECT id, checkin_code, checkin_code_expires_at, checked_in_at, status
             FROM appointments WHERE id = ? AND patient_id = ? LIMIT 1"
        );
        $stmt->execute([$id, $patientId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$appt) $this->fail('Cita no encontrada.', 404);

        if ($appt['checked_in_at']) {
            $this->fail('Ya realizaste check-in en esta cita.');
        }
        if (!$appt['checkin_code']) {
            $this->fail('El código de check-in aún no está disponible.');
        }
        if (!hash_equals($appt['checkin_code'], $code)) {
            $this->fail('Código incorrecto.');
        }
        if ($appt['checkin_code_expires_at'] && strtotime($appt['checkin_code_expires_at']) < time()) {
            $this->fail('El código ha expirado.');
        }

        $pdo->prepare(
            "UPDATE appointments SET status = 'in_consultation', checked_in_at = NOW(), updated_at = NOW()
             WHERE id = ? AND patient_id = ?"
        )->execute([$id, $patientId]);

        $this->ok(['message' => 'Check-in exitoso. Consulta iniciada.', 'in_consultation' => true]);
    }

    /** POST /api/mobile/appointments/:id/checkout */
    public function checkoutAppointment(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $id        = (int)$id;

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            "SELECT id, type, status, checkout_code, checkout_code_expires_at, scheduled_at
             FROM appointments WHERE id = ? AND patient_id = ? LIMIT 1"
        );
        $stmt->execute([$id, $patientId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$appt) $this->fail('Cita no encontrada.', 404);
        if ($appt['status'] !== 'in_consultation') {
            $this->fail('La cita no está en consulta.');
        }

        if ($appt['checkout_code'] && strtotime($appt['checkout_code_expires_at']) > time()) {
            $this->ok(['data' => ['checkout_code' => $appt['checkout_code'], 'expires_at' => $appt['checkout_code_expires_at']]]);
        }

        $code      = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $expiresAt = date('Y-m-d H:i:s', time() + 30 * 60);
        $pdo->prepare(
            "UPDATE appointments SET checkout_code = ?, checkout_code_expires_at = ?
             WHERE id = ? AND patient_id = ?"
        )->execute([$code, $expiresAt, $id, $patientId]);

        $this->ok(['data' => ['checkout_code' => $code, 'expires_at' => $expiresAt]]);
    }

    // ── EXPEDIENTE ────────────────────────────────────────────

    /** PUT /api/mobile/expediente */
    public function updateExpediente(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') $this->fail('Method not allowed.', 405);

        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];
        $body   = $this->body();

        $pmr = new PatientMedicalRecord();

        $data = [
            'fam_diabetes'        => isset($body['fam_diabetes']) ? 1 : 0,
            'fam_hypertension'    => isset($body['fam_hypertension']) ? 1 : 0,
            'fam_cancer'          => isset($body['fam_cancer']) ? 1 : 0,
            'fam_heart_disease'   => isset($body['fam_heart_disease']) ? 1 : 0,
            'fam_stroke'          => isset($body['fam_stroke']) ? 1 : 0,
            'fam_mental_health'   => isset($body['fam_mental_health']) ? 1 : 0,
            'fam_kidney_disease'  => isset($body['fam_kidney_disease']) ? 1 : 0,
            'fam_other'           => $body['fam_other'] ?? null,
            'personal_diabetes'       => isset($body['personal_diabetes']) ? 1 : 0,
            'personal_hypertension'   => isset($body['personal_hypertension']) ? 1 : 0,
            'personal_heart_disease'  => isset($body['personal_heart_disease']) ? 1 : 0,
            'personal_cancer'         => isset($body['personal_cancer']) ? 1 : 0,
            'personal_asthma'         => isset($body['personal_asthma']) ? 1 : 0,
            'personal_epilepsy'       => isset($body['personal_epilepsy']) ? 1 : 0,
            'personal_thyroid'        => isset($body['personal_thyroid']) ? 1 : 0,
            'personal_arthritis'      => isset($body['personal_arthritis']) ? 1 : 0,
            'personal_depression'     => isset($body['personal_depression']) ? 1 : 0,
            'personal_anxiety'        => isset($body['personal_anxiety']) ? 1 : 0,
            'personal_kidney_disease' => isset($body['personal_kidney_disease']) ? 1 : 0,
            'personal_other'          => $body['personal_other'] ?? null,
            'allergies'           => $body['allergies'] ?? null,
            'allergy_reactions'   => $body['allergy_reactions'] ?? null,
            'current_medications' => $body['current_medications'] ?? null,
            'previous_surgeries'  => $body['previous_surgeries'] ?? null,
            'hospitalizations'    => $body['hospitalizations'] ?? null,
            'blood_transfusions'  => $body['blood_transfusions'] ?? null,
            'vax_covid'           => isset($body['vax_covid']) ? 1 : 0,
            'vax_influenza'       => isset($body['vax_influenza']) ? 1 : 0,
            'vax_hepatitis_b'     => isset($body['vax_hepatitis_b']) ? 1 : 0,
            'vax_tetanus'         => isset($body['vax_tetanus']) ? 1 : 0,
            'vax_measles'         => isset($body['vax_measles']) ? 1 : 0,
            'vax_varicella'       => isset($body['vax_varicella']) ? 1 : 0,
            'vax_pneumococcal'    => isset($body['vax_pneumococcal']) ? 1 : 0,
            'vax_hpv'             => isset($body['vax_hpv']) ? 1 : 0,
            'vax_notes'           => $body['vax_notes'] ?? null,
            'smoking'             => $body['smoking'] ?? 'never',
            'smoking_qty'         => $body['smoking_qty'] ?? null,
            'smoking_years'       => $body['smoking_years'] ?? null,
            'alcohol'             => $body['alcohol'] ?? 'never',
            'alcohol_qty'         => $body['alcohol_qty'] ?? null,
            'drugs'               => isset($body['drugs']) ? 1 : 0,
            'drugs_detail'        => $body['drugs_detail'] ?? null,
            'exercise'            => $body['exercise'] ?? 'none',
            'exercise_hours_week' => $body['exercise_hours_week'] ?? null,
            'diet_type'           => $body['diet_type'] ?? null,
            'diet_detail'         => $body['diet_detail'] ?? null,
            'sleep_hours'         => $body['sleep_hours'] ?? null,
            'stress_level'        => $body['stress_level'] ?? null,
            'mental_health_diagnosis'  => isset($body['mental_health_diagnosis']) ? 1 : 0,
            'mental_health_detail'     => $body['mental_health_detail'] ?? null,
            'mental_health_treatment'  => isset($body['mental_health_treatment']) ? 1 : 0,
            'mental_health_medication' => $body['mental_health_medication'] ?? null,
            'uses_glasses'        => isset($body['uses_glasses']) ? 1 : 0,
            'uses_hearing_aid'    => isset($body['uses_hearing_aid']) ? 1 : 0,
            'physical_disability' => $body['physical_disability'] ?? null,
            'uses_wheelchair'     => isset($body['uses_wheelchair']) ? 1 : 0,
            'uses_prosthesis'     => $body['uses_prosthesis'] ?? null,
        ];

        $pmr->upsert($userId, $data);

        $this->ok(['message' => 'Expediente actualizado correctamente.']);
    }

    /** GET /api/mobile/expediente */
    public function expediente(): void
    {
        $this->apiHeaders();
        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        $pp  = new PatientProfile();
        $pmr = new PatientMedicalRecord();

        $profile = $pp->findByUserId($userId);
        $record  = $pmr->findByPatientId($userId);

        $pdo = Database::getInstance();

        // Clinical notes
        $cStmt = $pdo->prepare(
            'SELECT mn.*, u.name AS doctor_name, dp.specialty,
                    a.scheduled_at, a.type AS appt_type, a.reason AS appt_reason
             FROM medical_notes mn
             JOIN appointments a ON a.id = mn.appointment_id
             JOIN users u ON u.id = mn.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = mn.doctor_id
             WHERE mn.patient_id = ?
             ORDER BY mn.created_at DESC
             LIMIT 50'
        );
        $cStmt->execute([$userId]);
        $consultations = $cStmt->fetchAll(\PDO::FETCH_ASSOC);

        // Medical history
        $hStmt = $pdo->prepare(
            'SELECT mh.*, u.name AS doctor_name, mh.date_recorded AS entry_date
             FROM medical_history mh
             LEFT JOIN users u ON u.id = mh.recorded_by_doctor_id
             WHERE mh.patient_id = ?
             ORDER BY mh.date_recorded DESC, mh.created_at DESC
             LIMIT 100'
        );
        $hStmt->execute([$userId]);
        $history = $hStmt->fetchAll(\PDO::FETCH_ASSOC);

        // Prescriptions (safe: return empty if table doesn't exist)
        $prescriptions = $this->safeQuery(
            'SELECT p.*, u.name AS doctor_name, a.scheduled_at AS appt_date
             FROM prescriptions p
             JOIN users u ON u.id = p.doctor_id
             LEFT JOIN appointments a ON a.id = p.appointment_id
             WHERE p.patient_id = ?
             ORDER BY p.issued_date DESC
             LIMIT 100',
            [$userId]
        );

        // Documents
        $dStmt = $pdo->prepare(
            'SELECT id, title AS document_name, document_type, file_path, created_at AS uploaded_at
             FROM patient_documents WHERE patient_id = ?
             ORDER BY uploaded_at DESC LIMIT 50'
        );
        $dStmt->execute([$userId]);
        $documents = $dStmt->fetchAll(\PDO::FETCH_ASSOC);

        $this->ok([
            'profile'       => $profile,
            'record'        => $record,
            'consultations' => $consultations,
            'history'       => $history,
            'prescriptions' => $prescriptions,
            'documents'     => $documents,
        ]);
    }

    // ── DOCUMENTOS ──────────────────────────────────────────

    /** GET /api/mobile/documents */
    public function documents(): void
    {
        $this->apiHeaders();
        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        $stmt = Database::getInstance()->prepare(
            'SELECT pd.id, pd.document_type, pd.title, pd.file_path, pd.file_mime,
                    pd.file_size_kb, pd.notes, pd.created_at, u.name AS uploader_name
             FROM patient_documents pd
             LEFT JOIN users u ON u.id = pd.uploaded_by
             WHERE pd.patient_id = ?
             ORDER BY pd.created_at DESC
             LIMIT 100'
        );
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';
        $data = array_map(function (array $r) use ($baseUrl) {
            $r['id'] = (int)($r['id'] ?? 0);
            $r['file_size_kb'] = (int)($r['file_size_kb'] ?? 0);
            $path = (string)($r['file_path'] ?? '');
            $r['file_url'] = $path !== ''
                ? rtrim($baseUrl, '/') . '/' . ltrim($path, '/')
                : null;
            return $r;
        }, $rows);

        $this->ok(['data' => $data]);
    }

    /** POST /api/mobile/documents/upload */
    public function documentsUpload(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        if (empty($_FILES['document_file'])) {
            $this->fail('No se recibió ningún archivo.', 400);
        }

        $file    = $_FILES['document_file'];
        $allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        $finfo   = new \finfo(FILEINFO_MIME_TYPE);
        $mime    = (string)$finfo->file($file['tmp_name']);
        if (!in_array($mime, $allowed, true)) {
            $this->fail('Tipo de archivo no permitido. Solo PDF, JPG o PNG.', 422);
        }

        $maxBytes = 10 * 1024 * 1024;
        if ((int)$file['size'] > $maxBytes) {
            $this->fail('El archivo excede el tamaño máximo de 10 MB.', 422);
        }

        $dir = APP_ROOT . '/storage/uploads/documents/' . $userId . '/';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            $this->fail('No se pudo crear el directorio de carga.', 500);
        }

        $ext      = strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION));
        $filename = bin2hex(random_bytes(8)) . '_' . time() . ($ext !== '' ? '.' . $ext : '');
        $destPath = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            $this->fail('No se pudo guardar el archivo.', 500);
        }

        $relativePath = 'storage/uploads/documents/' . $userId . '/' . $filename;
        $sizeKb       = (int)round(((int)$file['size']) / 1024);
        $docType      = trim((string)($_POST['document_type'] ?? 'other')) ?: 'other';
        $title        = trim((string)($_POST['title'] ?? '')) ?: 'Documento';
        $notes        = trim((string)($_POST['notes'] ?? ''));

        $pdo = Database::getInstance();
        $pdo->prepare(
            'INSERT INTO patient_documents
               (patient_id, uploaded_by, document_type, title, file_path, file_mime, file_size_kb, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$userId, $userId, $docType, $title, $relativePath, $mime, $sizeKb, $notes !== '' ? $notes : null]);

        $id = (int)$pdo->lastInsertId();
        $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : '';

        $this->ok([
            'id' => $id,
            'document' => [
                'id' => $id,
                'document_type' => $docType,
                'title' => $title,
                'file_path' => $relativePath,
                'file_url' => rtrim($baseUrl, '/') . '/' . ltrim($relativePath, '/'),
                'file_mime' => $mime,
                'file_size_kb' => $sizeKb,
                'notes' => $notes !== '' ? $notes : null,
            ],
        ], 201);
    }

    /** POST /api/mobile/documents/:id/delete */
    public function documentDelete(string $id): void
    {
        $this->apiHeaders();
        if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'], true)) {
            $this->fail('Method not allowed.', 405);
        }

        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];
        $docId  = (int)$id;
        if ($docId <= 0) {
            $this->fail('ID de documento inválido.', 400);
        }

        $db   = Database::getInstance();
        $stmt = $db->prepare('SELECT file_path FROM patient_documents WHERE id = ? AND patient_id = ? LIMIT 1');
        $stmt->execute([$docId, $userId]);
        $doc = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$doc) {
            $this->fail('Documento no encontrado.', 404);
        }

        $path = APP_ROOT . '/' . ltrim((string)$doc['file_path'], '/');
        if (is_file($path)) {
            @unlink($path);
        }

        $db->prepare('DELETE FROM patient_documents WHERE id = ? AND patient_id = ?')->execute([$docId, $userId]);
        $this->ok(['message' => 'Documento eliminado.']);
    }

    // ── RECETAS ──────────────────────────────────────────────

    /** GET /api/mobile/prescriptions — patient prescriptions list */
    public function prescriptions(): void
    {
        $this->apiHeaders();
        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        $rows = $this->safeQuery(
            "SELECT p.id, p.medication_name, p.dosage, p.frequency, p.duration, 
                   p.instructions, p.issued_date,
                   u.name AS doctor_name, dp.specialty,
                   a.scheduled_at AS appt_date
             FROM prescriptions p
             JOIN users u ON u.id = p.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = p.doctor_id
             LEFT JOIN appointments a ON a.id = p.appointment_id
             WHERE p.patient_id = ?
             ORDER BY p.issued_date DESC
             LIMIT 100",
            [$userId]
        );

        $this->ok(['data' => $rows]);
    }

    // ── NOTAS CLÍNICAS (SOAP) ────────────────────────────────

    /** GET /api/mobile/soap-notes — clinical notes for patient */
    public function soapNotes(): void
    {
        $this->apiHeaders();
        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        // Try appointment_clinical_notes first
        $rows = $this->safeQuery(
            "SELECT cn.id, cn.appointment_id, cn.subjective, cn.objective, 
                   cn.assessment, cn.plan, cn.diagnosis_text, cn.diagnosis_cie10,
                   cn.prognosis, cn.created_at,
                   u.name AS doctor_name, dp.specialty,
                   a.scheduled_at, a.reason AS appt_reason
             FROM appointment_clinical_notes cn
             JOIN appointments a ON a.id = cn.appointment_id
             JOIN users u ON u.id = cn.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = cn.doctor_id
             WHERE cn.patient_id = ?
             ORDER BY cn.created_at DESC
             LIMIT 100",
            [$userId]
        );

        // If empty, try medical_notes
        if (empty($rows)) {
            $rows = $this->safeQuery(
                "SELECT mn.*, u.name AS doctor_name, dp.specialty,
                        a.scheduled_at, a.reason AS appt_reason
                 FROM medical_notes mn
                 JOIN appointments a ON a.id = mn.appointment_id
                 JOIN users u ON u.id = mn.doctor_id
                 LEFT JOIN doctor_profiles dp ON dp.user_id = mn.doctor_id
                 WHERE mn.patient_id = ?
                 ORDER BY mn.created_at DESC
                 LIMIT 100",
                [$userId]
            );
        }

        $this->ok(['data' => $rows]);
    }

    // ── NOTIFICACIONES ────────────────────────────────────────

    /** GET /api/mobile/support */
    public function supportTickets(): void
    {
        $this->apiHeaders();
        $jwt = $this->requireJwt(['patient', 'doctor']);
        $userId = (int)($jwt['sub'] ?? 0);
        $this->requireSupportTables();

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare(
            "SELECT t.*,
                    COUNT(m.id) AS message_count,
                    MAX(m.created_at) AS last_message_at,
                    SUBSTRING_INDEX(GROUP_CONCAT(m.body ORDER BY m.created_at DESC SEPARATOR '\n'), '\n', 1) AS last_message
             FROM support_tickets t
             LEFT JOIN support_ticket_messages m ON m.ticket_id = t.id
             WHERE t.user_id = ?
             GROUP BY t.id
             ORDER BY t.updated_at DESC
             LIMIT 100"
        );
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $this->ok([
            'data' => array_map(fn(array $row): array => $this->mapSupportTicketRow($row), $rows),
        ]);
    }

    /** POST /api/mobile/support */
    public function createSupportTicket(): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireJwt(['patient', 'doctor']);
        $userId = (int)($jwt['sub'] ?? 0);
        $role = $this->supportRoleForJwt($jwt);
        $licenseId = $this->supportLicenseIdForJwt($jwt);
        $this->requireSupportTables();

        $input = $this->supportInput();
        $subject = trim((string)($input['subject'] ?? ''));
        $body = trim((string)($input['body'] ?? ''));
        $priority = strtolower(trim((string)($input['priority'] ?? 'normal')));

        if ($subject === '' || mb_strlen($subject) > 200) {
            $this->fail('El asunto es requerido y debe tener maximo 200 caracteres.');
        }
        if ($body === '' && !isset($_FILES['attachment'])) {
            $this->fail('Escribe el detalle del problema o adjunta un archivo.');
        }
        if (!in_array($priority, ['low', 'normal', 'high', 'urgent'], true)) {
            $priority = 'normal';
        }

        $attachmentPath = $this->mobileSupportAttachment();
        $pdo = Database::getInstance();

        try {
            $pdo->beginTransaction();
            $pdo->prepare(
                "INSERT INTO support_tickets (license_id, user_id, role, subject, priority, status)
                 VALUES (?, ?, ?, ?, ?, 'open')"
            )->execute([$licenseId, $userId, $role, $subject, $priority]);

            $ticketId = (int)$pdo->lastInsertId();
            $pdo->prepare(
                "INSERT INTO support_ticket_messages (ticket_id, sender_id, body, attachment)
                 VALUES (?, ?, ?, ?)"
            )->execute([$ticketId, $userId, $body, $attachmentPath]);
            $pdo->commit();
        } catch (\Throwable) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->fail('No se pudo crear el ticket de soporte.', 500);
        }

        $this->notifySupportAdmins(
            $ticketId,
            $licenseId,
            'Nuevo ticket #' . $ticketId,
            'Se abrio un ticket desde la app: ' . mb_substr($subject, 0, 80)
        );

        $this->ok([
            'message' => 'Ticket creado correctamente.',
            'ticket_id' => $ticketId,
        ], 201);
    }

    /** GET /api/mobile/support/:id */
    public function supportTicketDetail(string $id): void
    {
        $this->apiHeaders();
        $jwt = $this->requireJwt(['patient', 'doctor']);
        $userId = (int)($jwt['sub'] ?? 0);
        $ticketId = (int)$id;
        $this->requireSupportTables();

        if ($ticketId < 1) {
            $this->fail('Ticket invalido.', 400);
        }

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM support_tickets WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$ticketId, $userId]);
        $ticket = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$ticket) {
            $this->fail('Ticket no encontrado.', 404);
        }

        if ($this->hasColumn('support_tickets', 'user_last_read_at')) {
            try {
                $pdo->prepare('UPDATE support_tickets SET user_last_read_at = NOW() WHERE id = ?')
                    ->execute([$ticketId]);
            } catch (\Throwable) {
            }
        }

        $mStmt = $pdo->prepare(
            "SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
             FROM support_ticket_messages m
             JOIN users u ON u.id = m.sender_id
             WHERE m.ticket_id = ?
             ORDER BY m.created_at ASC"
        );
        $mStmt->execute([$ticketId]);
        $messages = $mStmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $baseUrl = $this->supportBaseUrl();

        $mappedMessages = array_map(function (array $row) use ($userId, $baseUrl): array {
            $attachmentPath = trim((string)($row['attachment'] ?? ''));
            return [
                'id' => (int)($row['id'] ?? 0),
                'sender_id' => (int)($row['sender_id'] ?? 0),
                'sender_name' => (string)($row['sender_name'] ?? 'Soporte'),
                'sender_avatar' => $this->absoluteUrl($row['sender_avatar'] ?? null, $baseUrl),
                'body' => (string)($row['body'] ?? ''),
                'attachment_url' => $attachmentPath !== '' ? $this->absoluteUrl($attachmentPath, $baseUrl) : null,
                'attachment_name' => $attachmentPath !== '' ? basename($attachmentPath) : null,
                'created_at' => $row['created_at'] ?? null,
                'is_me' => (int)($row['sender_id'] ?? 0) === $userId,
            ];
        }, $messages);

        $ticket['message_count'] = count($mappedMessages);
        $ticket['last_message_at'] = !empty($mappedMessages)
            ? $mappedMessages[count($mappedMessages) - 1]['created_at']
            : ($ticket['updated_at'] ?? null);
        $ticket['last_message'] = !empty($mappedMessages)
            ? (string)($mappedMessages[count($mappedMessages) - 1]['body'] ?? '')
            : '';

        $this->ok([
            'ticket' => $this->mapSupportTicketRow($ticket),
            'messages' => $mappedMessages,
        ]);
    }

    /** POST /api/mobile/support/:id/reply */
    public function replySupportTicket(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireJwt(['patient', 'doctor']);
        $userId = (int)($jwt['sub'] ?? 0);
        $ticketId = (int)$id;
        $this->requireSupportTables();

        if ($ticketId < 1) {
            $this->fail('Ticket invalido.', 400);
        }

        $input = $this->supportInput();
        $body = trim((string)($input['body'] ?? ''));
        if ($body === '' && !isset($_FILES['attachment'])) {
            $this->fail('Escribe una respuesta o adjunta un archivo.');
        }

        $pdo = Database::getInstance();
        $tStmt = $pdo->prepare('SELECT id, subject, status, license_id FROM support_tickets WHERE id = ? AND user_id = ? LIMIT 1');
        $tStmt->execute([$ticketId, $userId]);
        $ticket = $tStmt->fetch(\PDO::FETCH_ASSOC);

        if (!$ticket) {
            $this->fail('Ticket no encontrado.', 404);
        }
        if (($ticket['status'] ?? '') === 'closed') {
            $this->fail('Este ticket ya esta cerrado.', 409);
        }

        $attachmentPath = $this->mobileSupportAttachment();

        try {
            $pdo->beginTransaction();
            $pdo->prepare(
                "INSERT INTO support_ticket_messages (ticket_id, sender_id, body, attachment)
                 VALUES (?, ?, ?, ?)"
            )->execute([$ticketId, $userId, $body, $attachmentPath]);

            if (($ticket['status'] ?? '') === 'resolved') {
                $pdo->prepare("UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = ?")
                    ->execute([$ticketId]);
            } else {
                $pdo->prepare('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?')
                    ->execute([$ticketId]);
            }
            $pdo->commit();
        } catch (\Throwable) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->fail('No se pudo guardar la respuesta.', 500);
        }

        $this->notifySupportAdmins(
            $ticketId,
            isset($ticket['license_id']) ? (int)$ticket['license_id'] : null,
            'Respuesta en ticket #' . $ticketId,
            'Hay una nueva respuesta desde la app en: ' . mb_substr((string)($ticket['subject'] ?? ''), 0, 80)
        );

        $this->ok(['message' => 'Respuesta enviada correctamente.']);
    }

    /** POST /api/mobile/support/:id/close */
    public function closeSupportTicket(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->fail('Method not allowed.', 405);
        }

        $jwt = $this->requireJwt(['patient', 'doctor']);
        $userId = (int)($jwt['sub'] ?? 0);
        $ticketId = (int)$id;
        $this->requireSupportTables();

        if ($ticketId < 1) {
            $this->fail('Ticket invalido.', 400);
        }

        $stmt = Database::getInstance()->prepare(
            "UPDATE support_tickets
             SET status = 'closed', updated_at = NOW()
             WHERE id = ? AND user_id = ?"
        );
        $stmt->execute([$ticketId, $userId]);

        if ($stmt->rowCount() < 1) {
            $this->fail('No se pudo cerrar el ticket.', 404);
        }

        $this->ok(['message' => 'Ticket cerrado.']);
    }

    /** GET /api/mobile/notifications — recent notifications for patient */
    public function notifications(): void
    {
        $this->apiHeaders();
        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        $all = [];

        // Unread messages
        $msgRows = $this->safeQuery(
            "SELECT 'message' AS type, cm.id, cm.message, cm.created_at, 
                    u.name AS related_name, ct.id AS thread_id
             FROM chat_messages cm
             JOIN chat_threads ct ON ct.id = cm.thread_id
             JOIN users u ON u.id = cm.sender_id
             WHERE ct.patient_id = ? AND cm.sender_id != ?
               AND cm.message_type = 'text'
               AND cm.is_read = 0
             ORDER BY cm.created_at DESC
             LIMIT 20",
            [$userId, $userId]
        );

        // System notifications
        $sysRows = $this->safeQuery(
            "SELECT 'system' AS type, cm.id, cm.message, cm.created_at, 
                    NULL AS related_name, ct.id AS thread_id
             FROM chat_messages cm
             JOIN chat_threads ct ON ct.id = cm.thread_id
             WHERE ct.patient_id = ? AND cm.sender_id IS NULL
             ORDER BY cm.created_at DESC
             LIMIT 20",
            [$userId]
        );

        // Upcoming appointments
        $apptRows = $this->safeQuery(
            "SELECT 'appointment' AS type, a.id, 
                    CONCAT('Cita con ', u.name, ' el ', DATE_FORMAT(a.scheduled_at, '%d/%m/%Y a las %H:%i')) AS message,
                    a.scheduled_at AS created_at, u.name AS related_name, NULL AS thread_id
             FROM appointments a
             JOIN users u ON u.id = a.doctor_id
             WHERE a.patient_id = ? AND a.scheduled_at >= NOW()
               AND a.status IN ('confirmed','pending')
             ORDER BY a.scheduled_at ASC
             LIMIT 10",
            [$userId]
        );

        $all = array_merge($msgRows, $sysRows, $apptRows);
        usort($all, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        $this->ok(['data' => array_slice($all, 0, 30)]);
    }

    // ── HISTORIAL FINANCIERO ──────────────────────────────────

    /** GET /api/mobile/financial-history */
    public function financialHistory(): void
    {
        $this->apiHeaders();
        $jwt    = $this->requireJwt();
        $userId = (int)$jwt['sub'];

        $db = Database::getInstance();
        $paymentsStmt = $db->prepare(
            "SELECT p.id, p.appointment_id, p.amount, p.currency, p.method, p.status,
                    p.created_at, p.paypal_order_id, d.name AS doctor_name
             FROM payments p
             LEFT JOIN appointments a ON a.id = p.appointment_id
             LEFT JOIN users d ON d.id = a.doctor_id
             WHERE p.user_id = ? AND p.type = 'consultation'
             ORDER BY p.created_at DESC
             LIMIT 200"
        );
        $paymentsStmt->execute([$userId]);
        $payments = $paymentsStmt->fetchAll(\PDO::FETCH_ASSOC);

        $summaryStmt = $db->prepare(
            "SELECT
               SUM(CASE WHEN YEAR(created_at)=YEAR(NOW()) AND MONTH(created_at)=MONTH(NOW()) AND status='completed' THEN amount ELSE 0 END) AS this_month,
               SUM(CASE WHEN YEAR(created_at)=YEAR(NOW()) AND status='completed' THEN amount ELSE 0 END) AS this_year
             FROM payments WHERE user_id = ? AND type = 'consultation'"
        );
        $summaryStmt->execute([$userId]);
        $summary = $summaryStmt->fetch(\PDO::FETCH_ASSOC) ?: ['this_month' => 0, 'this_year' => 0];

        $mapped = array_map(fn($p) => [
            'id' => (int)($p['id'] ?? 0),
            'appointment_id' => isset($p['appointment_id']) ? (int)$p['appointment_id'] : null,
            'doctor_name' => $p['doctor_name'] ?? null,
            'amount' => (float)($p['amount'] ?? 0),
            'currency' => strtoupper((string)($p['currency'] ?? 'MXN')),
            'method' => $p['method'] ?? null,
            'status' => $p['status'] ?? null,
            'paypal_order_id' => $p['paypal_order_id'] ?? null,
            'created_at' => $p['created_at'] ?? null,
        ], $payments);

        $this->ok([
            'summary' => [
                'this_month' => (float)($summary['this_month'] ?? 0),
                'this_year' => (float)($summary['this_year'] ?? 0),
            ],
            'payments' => $mapped,
        ]);
    }

    // ── PAGO PAYPAL ──────────────────────────────────────────

    /** POST /api/mobile/appointments/:id/pay */
    public function appointmentPay(string $id): void
    {
        $this->apiHeaders();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') $this->fail('Method not allowed.', 405);

        $jwt       = $this->requireJwt();
        $patientId = (int)$jwt['sub'];
        $apptId    = (int)$id;

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            "SELECT a.id, a.consultation_fee, a.scheduled_at, a.status, a.payment_status,
                    a.doctor_id, a.pay_deadline, u.name AS doctor_name
             FROM appointments a
             JOIN users u ON u.id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
               AND a.payment_status = 'pending'
               AND a.status NOT IN ('cancelled','completed')
             LIMIT 1"
        );
        $stmt->execute([$apptId, $patientId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) $this->fail('Cita no encontrada o ya pagada.');

        if ($appt['pay_deadline'] && strtotime($appt['pay_deadline']) < time()) {
            $this->fail('El plazo de pago ha expirado. La cita fue liberada. Puedes agendar una nueva cita.');
        }

        $fee = (float)($appt['consultation_fee'] ?? 0);
        if ($fee <= 0) {
            $pdo->prepare(
                "UPDATE appointments SET payment_status = 'waived', status = 'confirmed' WHERE id = ?"
            )->execute([$apptId]);
            $this->ok(['message' => 'Cita confirmada (sin costo).', 'confirmed' => true]);
            return;
        }

        try {
            $pp = PayPal::getInstance();
            if (!$pp->isConfigured()) {
                $this->fail('El sistema de pagos no esta configurado.');
            }

            $baseUrl = defined('BASE_URL') ? constant('BASE_URL') : 'https://doctorcloud.digital/app/';
            $dt   = date('d/m/Y H:i', strtotime($appt['scheduled_at']));
            $desc = 'Consulta con ' . ($appt['doctor_name'] ?? 'Doctor') . ' — ' . $dt;

            $order = $pp->createOrder(
                $fee,
                'MXN',
                $desc,
                "{$baseUrl}api/mobile/appointments/{$apptId}/capture?token=__TOKEN__&patient_id={$patientId}",
                "{$baseUrl}api/mobile/appointments/{$apptId}/payment-cancelled?patient_id={$patientId}"
            );

            $pdo->prepare(
                "INSERT INTO payments
                   (user_id, doctor_id, appointment_id, amount, currency, method, status, type, payout_status, paypal_order_id)
                 VALUES (?, ?, ?, ?, ?, 'paypal', 'pending', 'consultation', 'pending', ?)"
            )->execute([$patientId, (int)$appt['doctor_id'], $apptId, $fee, 'MXN', $order['id']]);

            $this->ok([
                'approve_url' => $order['approve_url'],
                'order_id'    => $order['id'],
            ]);

        } catch (\Throwable $e) {
            error_log('[MobileApiController::appointmentPay] ' . $e->getMessage());
            $this->fail('Error al crear el pago en PayPal. Intenta de nuevo.');
        }
    }

    /** GET /api/mobile/appointments/:id/capture */
    public function appointmentCapture(string $id): void
    {
        $this->apiHeaders();
        $apptId    = (int)$id;
        $token     = $_GET['token'] ?? '';
        $patientId = (int)($_GET['patient_id'] ?? 0);

        if (!$apptId || $token === '' || !$patientId) {
            $this->fail('Parametros de pago invalidos.');
        }

        $pdo  = Database::getInstance();
        $stmt = $pdo->prepare(
            "SELECT p.*, a.doctor_id, a.scheduled_at
             FROM payments p
             JOIN appointments a ON a.id = p.appointment_id
             WHERE p.appointment_id = ? AND p.user_id = ?
               AND p.paypal_order_id = ? AND p.status = 'pending'
             LIMIT 1"
        );
        $stmt->execute([$apptId, $patientId, $token]);
        $payment = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$payment) {
            $this->fail('Pago no encontrado.');
        }

        try {
            $pp      = PayPal::getInstance();
            $capture = $pp->captureOrder($token);
            $status  = strtoupper($capture['status'] ?? '');

            if ($status === 'COMPLETED') {
                $captureId = $capture['purchase_units'][0]['payments']['captures'][0]['id'] ?? '';

                try {
                    $pdo->prepare(
                        "UPDATE payments SET status = 'completed', paypal_capture_id = ?,
                                             doctor_id = COALESCE(doctor_id, ?),
                                             type = 'consultation', payout_status = 'pending'
                         WHERE id = ?"
                    )->execute([$captureId, (int)($payment['doctor_id'] ?? 0), $payment['id']]);
                } catch (\Throwable) {
                    $pdo->prepare(
                        "UPDATE payments
                         SET status = 'completed',
                             doctor_id = COALESCE(doctor_id, ?),
                             type = 'consultation',
                             payout_status = 'pending'
                         WHERE id = ?"
                    )->execute([(int)($payment['doctor_id'] ?? 0), $payment['id']]);
                }

                $pdo->prepare(
                    "UPDATE appointments SET status = 'confirmed', payment_status = 'paid' WHERE id = ?"
                )->execute([$apptId]);

                $this->ok(['message' => 'Pago exitoso. Tu cita ha sido confirmada.', 'confirmed' => true]);
            } else {
                $this->fail('El pago no se completo. Estado: ' . $status);
            }
        } catch (\Throwable $e) {
            error_log('[MobileApiController::appointmentCapture] ' . $e->getMessage());
            $this->fail('Error al capturar el pago. Contacta soporte.');
        }
    }

    /** POST /api/mobile/appointments/:id/payment-cancelled */
    public function appointmentPaymentCancelled(string $id): void
    {
        $this->apiHeaders();
        $apptId    = (int)$id;
        $patientId = (int)($_GET['patient_id'] ?? $_POST['patient_id'] ?? 0);
        $pdo       = Database::getInstance();

        if ($patientId) {
            $pdo->prepare(
                "UPDATE payments SET status = 'failed'
                 WHERE appointment_id = ? AND user_id = ? AND status = 'pending'"
            )->execute([$apptId, $patientId]);
        }

        $this->ok(['message' => 'Pago cancelado. La cita no fue confirmada.']);
    }

    // ── HELPERS ───────────────────────────────────────────────

    private function formatDoctor(array $d, string $baseUrl, bool $full = false): array
    {
        $base = [
            'id'               => (int)($d['user_id'] ?? $d['id']),
            'name'             => $d['name']       ?? '',
            'specialty'        => $d['specialty']  ?? '',
            'photo'            => $this->absoluteUrl($d['photo'] ?? $d['avatar_url'] ?? null, $baseUrl),
            'rating'           => (float)($d['avg_rating'] ?? 0),
            'reviews_count'    => (int)($d['review_count'] ?? $d['reviews_count'] ?? $d['total_reviews'] ?? 0),
            'consultation_fee' => (float)($d['consultation_fee'] ?? 0),
            'telemedicine_fee' => (float)($d['telemedicine_fee'] ?? 0),
            'home_visit_fee'   => (float)($d['home_visit_fee']   ?? 0),
            'city'             => $d['city'] ?? '',
            'state'            => $d['state'] ?? '',
            'address'          => $d['address'] ?? '',
            'lat'              => isset($d['lat']) && $d['lat'] !== null ? (float)$d['lat'] : null,
            'lng'              => isset($d['lng']) && $d['lng'] !== null ? (float)$d['lng'] : null,
            'distance_meters'  => isset($d['distance_meters']) && $d['distance_meters'] !== null ? (float)$d['distance_meters'] : null,
            'profile_score'    => isset($d['profile_score']) ? (int)$d['profile_score'] : null,
            'is_verified'      => (bool)($d['cedula'] ?? false),
        ];

        if ($full) {
            $base['bio']              = $d['bio']              ?? '';
            $base['subspecialty']     = $d['subspecialty']     ?? '';
            $base['duration_minutes'] = (int)($d['duration_minutes'] ?? 30);
        }

        return $base;
    }

    private function absoluteUrl(?string $path, string $baseUrl): ?string
    {
        $path = trim((string)$path);
        if ($path === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
    }
}
