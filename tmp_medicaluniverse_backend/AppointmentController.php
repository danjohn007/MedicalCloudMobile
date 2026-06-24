<?php
declare(strict_types=1);

class AppointmentController extends Controller
{
    private function describeStripePaymentScopeMismatch(array $payment, Stripe $stripe): string
    {
        $storedMode = strtolower(trim((string)($payment['stripe_mode'] ?? '')));
        $storedAccountId = trim((string)($payment['stripe_account_id'] ?? ''));
        $currentMode = $stripe->getEnvironmentLabel();

        if ($storedMode !== '' && $storedMode !== $currentMode) {
            return "El pago Stripe fue creado en modo {$storedMode} y la configuracion actual usa {$currentMode}.";
        }

        if ($storedAccountId !== '') {
            try {
                $currentAccountId = $stripe->getAccountId();
                if ($currentAccountId !== '' && $currentAccountId !== $storedAccountId) {
                    return "El pago Stripe pertenece a la cuenta {$storedAccountId} y la API key actual apunta a {$currentAccountId}.";
                }
            } catch (\Throwable) {}
        }

        return '';
    }

    public function index(): void
    {
        $this->requireAuth();
        $userId = Session::userId();
        $role   = Session::role();

        if ($role === 'assistant') {
            $assignedDoctorId = $this->getAssistantDoctorId($userId);
            if (!$assignedDoctorId) {
                Session::setFlash('info', 'Aún no tienes un doctor asignado.');
                $this->redirect('assistant/find-doctor');
            }
            $filterCol   = 'a.doctor_id';
            $filterValue = $assignedDoctorId;
        } elseif ($role === 'doctor') {
            $filterCol   = 'a.doctor_id';
            $filterValue = $userId;
        } else {
            $filterCol   = 'a.patient_id';
            $filterValue = $userId;
        }

        $stmt = Database::getInstance()->prepare(
            "SELECT a.*,
                    doc.name AS doctor_name, dp.specialty,
                    pat.name AS patient_name
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             JOIN users pat ON pat.id = a.patient_id
             WHERE {$filterCol} = ?
             ORDER BY a.scheduled_at DESC LIMIT 50"
        );
        $stmt->execute([$filterValue]);
        $appointments = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // For patients: find completed appointments that haven't been rated yet
        $pendingRatings = [];
        if ($role === 'patient') {
            $pr = Database::getInstance()->prepare(
                "SELECT a.id AS appt_id, a.doctor_id, a.scheduled_at,
                        doc.name AS doctor_name, dp.specialty, dp.photo AS doctor_photo
                 FROM appointments a
                 JOIN users doc ON doc.id = a.doctor_id
                 LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
                 LEFT JOIN reviews r ON r.appointment_id = a.id AND r.patient_id = a.patient_id
                 WHERE a.patient_id = ? AND a.status = 'completed' AND r.id IS NULL
                 ORDER BY a.scheduled_at DESC"
            );
            $pr->execute([$userId]);
            $pendingRatings = $pr->fetchAll(\PDO::FETCH_ASSOC);
        }

        $this->render('appointment/list', [
            'title'          => 'Mis Citas',
            'appointments'   => $appointments,
            'pendingRatings' => $pendingRatings,
        ]);
    }

    public function create(): void
    {
        $this->requireAuth();
        $role   = Session::role();
        $userId = Session::userId();

        // ── GET: reschedule pre-fill ───────────────────────────────
        $rescheduleFrom = (int)($_GET['reschedule_from'] ?? 0);
        $lockDoctor     = (int)($_GET['lock_doctor']     ?? 0);  // force same doctor on reschedule
        $rescheduleData = null;
        if ($rescheduleFrom > 0 && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            $rs = Database::getInstance()->prepare(
                'SELECT a.*, doc.name AS doctor_name, pat.name AS patient_name
                 FROM appointments a
                 JOIN users doc ON doc.id = a.doctor_id
                 JOIN users pat ON pat.id = a.patient_id
                 WHERE a.id = ? LIMIT 1'
            );
            $rs->execute([$rescheduleFrom]);
            $rescheduleData = $rs->fetch(\PDO::FETCH_ASSOC) ?: null;
            if ($rescheduleData && !$lockDoctor) {
                $lockDoctor = (int)($rescheduleData['doctor_id'] ?? 0);
            }
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $patients   = [];
            $doctors    = [];
            $lockedDoc  = null;
            if ($role === 'doctor') {
                $dp       = new DoctorProfile();
                $patients = $dp->getPatientsOf($userId, Session::hospitalLicenseId());
            } elseif ($role === 'assistant') {
                // Assistant: act on behalf of assigned doctor
                $assignedDoctorId = $this->getAssistantDoctorId($userId);
                if (!$assignedDoctorId) {
                    Session::setFlash('error', 'No tienes un doctor asignado. Busca un doctor primero.');
                    $this->redirect('assistant/find-doctor');
                }
                $dp       = new DoctorProfile();
                $patients = $dp->getPatientsOf($assignedDoctorId, $this->getAssistantDoctorLicenseId($assignedDoctorId));
                // Build preselect for calendar
                $dStmt = Database::getInstance()->prepare(
                    'SELECT u.name, dp.specialty FROM users u JOIN doctor_profiles dp ON dp.user_id = u.id WHERE u.id = ? LIMIT 1'
                );
                $dStmt->execute([$assignedDoctorId]);
                $dRow     = $dStmt->fetch(\PDO::FETCH_ASSOC) ?: [];
                $lockedDoc = ['id' => $assignedDoctorId, 'doctor_name' => $dRow['name'] ?? '', 'specialty' => $dRow['specialty'] ?? ''];
                $lockDoctor = $assignedDoctorId;
            } elseif ($role === 'patient') {
                $dp      = new DoctorProfile();
                if ($lockDoctor > 0) {
                    $lockedDoc = $dp->findByUserId($lockDoctor);
                    // Fetch user name for locked doctor
                    $dStmt = Database::getInstance()->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
                    $dStmt->execute([$lockDoctor]);
                    if ($dRow = $dStmt->fetch(\PDO::FETCH_ASSOC)) {
                        $lockedDoc['user_id'] = $lockDoctor;
                        $lockedDoc['doctor_name'] = $dRow['name'];
                    }
                } else {
                    $doctors = $dp->search();
                }
            }
            $this->render('appointment/create', [
                'title'          => $rescheduleData ? 'Reagendar Cita' : 'Nueva Cita',
                'userRole'       => $role,
                'patients'       => $patients,
                'doctors'        => $doctors,
                'rescheduleData' => $rescheduleData,
                'lockedDoctor'   => $lockedDoc,
                'lockDoctorId'   => $lockDoctor,
            ]);
            return;
        }

        $this->verifyCsrf();

        $doctorId         = (int)($_POST['doctor_user_id']     ?? $_POST['doctor_id']  ?? 0);
        $patientId        = (int)($_POST['patient_user_id']    ?? $_POST['patient_id'] ?? 0);
        $scheduledAt      = $this->post('scheduled_at');
        $typeRaw          = $this->post('type');
        $type             = $typeRaw === 'in_person' ? 'presential' : $typeRaw;
        $validTypes       = ['presential', 'virtual', 'home_visit'];
        if (!in_array($type, $validTypes, true)) { $type = 'presential'; }
        $reason           = $this->post('reason');
        $rescheduledFromId = (int)($_POST['rescheduled_from_id'] ?? 0);
        $postLockDoctor    = (int)($_POST['lock_doctor_id']      ?? 0);

        if ($role === 'patient') { $patientId = $userId; }
        elseif ($role === 'doctor') { $doctorId = $userId; }
        elseif ($role === 'assistant') {
            $doctorId = $this->getAssistantDoctorId($userId);
            if (!$doctorId) {
                Session::setFlash('error', 'No tienes un doctor asignado.');
                $this->redirect('assistant/find-doctor');
            }
        }

        // Reschedule: enforce same doctor (security — doctor cannot be changed)
        if ($rescheduledFromId > 0 && $postLockDoctor > 0 && $role === 'patient') {
            $doctorId = $postLockDoctor;  // locked by original appointment
        }

        if (!$doctorId || !$patientId || !$scheduledAt) {
            Session::setFlash('error', 'Datos incompletos para agendar la cita.');
            $this->redirect('appointments');
        }

        $dp          = new DoctorProfile();
        $profile     = $this->hydrateDoctorPricing($doctorId, $dp->findByUserId($doctorId) ?: []);
        $duration    = (int)($profile['duration_minutes'] ?? 30);
        $endAt       = date('Y-m-d H:i:s', strtotime($scheduledAt) + $duration * 60);

        // Check for patient time overlap before inserting
        if ($this->checkPatientOverlap($patientId, $scheduledAt, $endAt)) {
            Session::setFlash('error', 'El paciente ya tiene una cita en ese horario.');
            $this->redirect('appointments/create');
        }

        // Waive payment — doctors can mark a consultation as free
        $waivePayment = ($role === 'doctor' && !empty($_POST['waive_payment'])) ? 1 : 0;

        $consultFee = 0.0;
        if (!$waivePayment) {
            $consultationFee = (float)($profile['consultation_fee'] ?? 0);
            $telemedicineFee = (float)($profile['telemedicine_fee'] ?? 0);
            $consultFee = $type === 'virtual'
                ? ($telemedicineFee > 0 ? $telemedicineFee : $consultationFee)
                : $consultationFee;
        }

        // Status: if fee > 0 and not waived → patient must pay first
        $initialStatus = ($consultFee > 0 && !$waivePayment) ? 'pending_payment' : 'confirmed';

        // Payment status
        $paymentStatus = ($consultFee > 0) ? 'pending' : 'not_required';

        // If this is a reschedule from a paid appointment → transfer payment, no re-pay needed
        $paymentTransferred = 0;
        if ($rescheduledFromId > 0) {
            $origStmt = Database::getInstance()->prepare(
                "SELECT payment_status FROM appointments WHERE id = ? LIMIT 1"
            );
            $origStmt->execute([$rescheduledFromId]);
            $origRow = $origStmt->fetch(\PDO::FETCH_ASSOC);
            if ($origRow && $origRow['payment_status'] === 'paid') {
                $paymentStatus      = 'not_required';
                $waivePayment       = 1;
                $paymentTransferred = 1;
                $consultFee         = 0.0;
            }
        }

        $videoRoom = $type === 'virtual' ? ('mu-' . bin2hex(random_bytes(6))) : null;

        // Calculate payment deadline (only for patient bookings with a fee)
        $payDeadline = null;
        if ($role === 'patient' && $consultFee > 0) {
            $apptTs      = strtotime($scheduledAt);
            $hoursUntil  = ($apptTs - time()) / 3600;
            $nowTs       = time();

            if ($hoursUntil > 48) {
                // Agendado con >48h de anticipación → pagar hasta 24h antes de la cita
                $deadlineTs = $apptTs - 24 * 3600;
            } elseif ($hoursUntil > 24) {
                // Agendado entre 48h y 24h → pagar hasta 18h antes de la cita
                $deadlineTs = $apptTs - 18 * 3600;
            } elseif ($hoursUntil > 6) {
                // Agendado con <24h de anticipación → 3 horas desde ahora para pagar
                $deadlineTs = $nowTs + 3 * 3600;
            } else {
                // Agendado con <6h de anticipación → 1 hora desde ahora para pagar
                $deadlineTs = $nowTs + 3600;
            }

            // Safety caps: never in the past, never after the appointment starts
            $deadlineTs  = max($deadlineTs, $nowTs + 600); // at least 10 min from now
            $deadlineTs  = min($deadlineTs, $apptTs - 600); // at least 10 min before appt
            $payDeadline = date('Y-m-d H:i:s', $deadlineTs);
        }

        try {
            Database::getInstance()->prepare(
                'INSERT INTO appointments
                   (doctor_id, patient_id, scheduled_at, end_at, type, status,
                    reason, video_room_id, created_by_role, consultation_fee, payment_status, pay_deadline)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$doctorId, $patientId, $scheduledAt, $endAt, $type, $initialStatus, $reason, $videoRoom, $role, $consultFee, $paymentStatus, $payDeadline]);
        } catch (\Throwable $e) {
            error_log('[AppointmentCreate] ' . $e->getMessage());
            Session::setFlash('error', 'No se pudo agendar la cita. Es posible que ese horario ya no esté disponible.');
            $this->redirect('appointments/create');
        }

        $newId = (int)Database::getInstance()->lastInsertId();
        if (!$newId) {
            Session::setFlash('error', 'Error al registrar la cita. Por favor intenta de nuevo.');
            $this->redirect('appointments/create');
        }
        $this->audit('create_appointment', 'appointments', $newId, ['doctor' => $doctorId, 'patient' => $patientId]);

        $dtLabel = date('d/m/Y \a\s H:i', strtotime($scheduledAt));
        ChatController::notifyAppointment(
            $doctorId, $patientId,
            "📅 Nueva cita agendada para el {$dtLabel}.",
            $newId
        );

        $apptLink = BASE_URL . 'appointments';
        $this->createNotification($patientId, 'appointment', 'Nueva cita agendada',
            "Tu cita para el {$dtLabel} ha sido registrada.", $apptLink, 'appointment', $newId);
        $this->createNotification($doctorId, 'appointment', 'Nueva cita solicitada',
            "Nueva cita agendada para el {$dtLabel}.", $apptLink, 'appointment', $newId);

        // Payment deadline notification for patient
        if ($payDeadline) {
            $dlLabel = date('d/m/Y \a\s H:i', strtotime($payDeadline));
            $this->createNotification(
                $patientId, 'warning', '⏰ Paga tu cita antes de que se cancele',
                "Tienes hasta el {$dlLabel} para pagar tu cita del {$dtLabel}. Si no se paga a tiempo, el horario se libera automáticamente.",
                BASE_URL . 'billing/invoices',
                'appointment', $newId
            );
        }

        if ($consultFee > 0 && !$waivePayment && $role === 'patient') {
            // Redirect to the pay page so patient sees the countdown and can choose to pay now
            $this->redirect('appointments/' . $newId . '/pay');
        } else {
            Session::setFlash('success', '¡Cita agendada correctamente!' . ($role !== 'patient' ? ' Confirmada sin cargo al paciente.' : ' El doctor la confirmará pronto.'));
            $this->redirect('appointments');
        }
    }

    public function cancel(): void
    {
        $this->requireAuth();
        $this->verifyCsrf();

        $apptId = $this->postInt('appoingitment_id');
        $reason = $this->post('reason');
        $role   = Session::role();
        $userId = Session::userId();

        $col = $role === 'doctor' ? 'doctor_id' : 'patient_id';

        Database::getInstance()->prepare(
            "UPDATE appointments SET status = 'cancelled', cancelled_by = ?, cancellation_reason = ?
             WHERE id = ? AND {$col} = ?"
        )->execute([$role, $reason, $apptId, $userId]);

        // System message in chat
        $apptRow = Database::getInstance()->prepare('SELECT doctor_id, patient_id FROM appointments WHERE id = ? LIMIT 1');
        $apptRow->execute([$apptId]);
        $ar = $apptRow->fetch(\PDO::FETCH_ASSOC);
        if ($ar) {
            ChatController::notifyAppointment(
                (int)$ar['doctor_id'], (int)$ar['patient_id'],
                '❌ Cita cancelada' . ($reason ? ': ' . mb_strimwidth($reason, 0, 80, '…') : '.'),
                $apptId
            );
            $notifyId = $role === 'patient' ? (int)$ar['doctor_id'] : (int)$ar['patient_id'];
            $this->createNotification($notifyId, 'warning', 'Cita cancelada',
                'Una cita ha sido cancelada.' . ($reason ? ' Motivo: ' . mb_strimwidth($reason, 0, 80, '…') : ''),
                BASE_URL . 'appointments', 'appointment', $apptId);
        }

        $this->audit('cancel_appointment', 'appointments', $apptId, []);
        Session::setFlash('success', 'Cita cancelada.');
        $this->redirect('appointments');
    }

    public function show(string $id): void
    {
        $this->requireAuth();
        $userId = Session::userId();
        $role   = Session::role();
        $col    = $role === 'doctor' ? 'a.doctor_id' : 'a.patient_id';

        $stmt = Database::getInstance()->prepare(
            "SELECT a.*,
                    doc.name AS doctor_name, dp.specialty,
                    pat.name AS patient_name
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             JOIN users pat ON pat.id = a.patient_id
             WHERE a.id = ? AND {$col} = ? LIMIT 1"
        );
        $stmt->execute([(int)$id, $userId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            Session::setFlash('error', 'Cita no encontrada.');
            $this->redirect('appointments');
        }

        $this->render('appointment/list', [
            'title'        => 'Detalle de Cita',
            'appointments' => [$appt],
        ]);
    }

    public function cancelById(string $id): void
    {
        $this->requireAuth();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('appointments');
        }
        $this->verifyCsrf();

        $role   = Session::role();
        $userId = Session::userId();
        $reason = $this->post('reason');
        $col    = $role === 'doctor' ? 'doctor_id' : 'patient_id';

        // Fetch first to get payment status and scheduling data
        $stmt = Database::getInstance()->prepare(
            "SELECT doctor_id, patient_id, payment_status, scheduled_at
             FROM appointments WHERE id = ? AND {$col} = ? LIMIT 1"
        );
        $stmt->execute([(int)$id, $userId]);
        $arRow = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$arRow) {
            $this->json(['ok' => false, 'error' => 'Cita no encontrada.']);
            return;
        }

        // Block cancellation within 24 hours unless appointment remains unpaid.
        // This keeps backend policy aligned with calendar UX rules.
        if (!in_array($role, ['superadmin', 'hospital_admin'], true)) {
            $secsUntil = strtotime($arRow['scheduled_at']) - time();
            $isUnpaid = ($arRow['payment_status'] ?? '') !== 'paid';
            if ($secsUntil >= 0 && $secsUntil < 86400 && !$isUnpaid) {
                $this->json(['ok' => false, 'error' => 'No se puede cancelar con menos de 24 horas de anticipación.']);
                return;
            }
        }

        $wasPaid = ($arRow['payment_status'] ?? '') === 'paid';

        Database::getInstance()->prepare(
            "UPDATE appointments SET status = 'cancelled', cancelled_by = ?, cancellation_reason = ?
             WHERE id = ? AND {$col} = ?"
        )->execute([$role, $reason, (int)$id, $userId]);

        // System message in chat
        $ar2 = Database::getInstance()->prepare('SELECT doctor_id, patient_id FROM appointments WHERE id = ? LIMIT 1');
        $ar2->execute([(int)$id]);
        $arRow = $ar2->fetch(\PDO::FETCH_ASSOC);
        if ($arRow) {
            ChatController::notifyAppointment(
                (int)$arRow['doctor_id'], (int)$arRow['patient_id'],
                '❌ Cita cancelada' . ($reason ? ': ' . mb_strimwidth($reason, 0, 80, '…') : '.'),
                (int)$id
            );
            $notifyId = $role === 'patient' ? (int)$arRow['doctor_id'] : (int)$arRow['patient_id'];
            $this->createNotification($notifyId, 'warning', 'Cita cancelada',
                'Una cita ha sido cancelada.' . ($reason ? ' Motivo: ' . mb_strimwidth($reason, 0, 80, '…') : ''),
                BASE_URL . 'appointments', 'appointment', (int)$id);
        }

        $this->audit('cancel_appointment', 'appointments', (int)$id);

        $wasPaid = ($arRow['payment_status'] ?? '') === 'paid';

        // Auto-refund: reembolsar según el método de pago utilizado
        // Auto-refund according to the gateway used by the completed payment.
        $refundStatus = null;
        if ($wasPaid) {
            try {
                try {
                    $pmt = Database::getInstance()->prepare(
                        "SELECT paypal_capture_id, stripe_payment_intent_id, stripe_mode, stripe_account_id, amount
                         FROM payments
                         WHERE appointment_id = ? AND status = 'completed'
                         ORDER BY id DESC LIMIT 1"
                    );
                    $pmt->execute([(int)$id]);
                    $pmtRow = $pmt->fetch(\PDO::FETCH_ASSOC);
                } catch (\Throwable) {
                    $pmt = Database::getInstance()->prepare(
                        "SELECT paypal_capture_id, stripe_payment_intent_id, amount FROM payments
                         WHERE appointment_id = ? AND status = 'completed'
                         ORDER BY id DESC LIMIT 1"
                    );
                    $pmt->execute([(int)$id]);
                    $pmtRow = $pmt->fetch(\PDO::FETCH_ASSOC);
                }

                if ($pmtRow && !empty($pmtRow['paypal_capture_id'])) {
                    // ── PayPal ──
                    $refund = PayPal::getInstance()->refundCapture($pmtRow['paypal_capture_id']);
                    $refundStatus = strtolower($refund['status'] ?? 'unknown');
                    Database::getInstance()->prepare(
                        "UPDATE appointments SET payment_status = 'refunded' WHERE id = ?"
                    )->execute([(int)$id]);
                    Database::getInstance()->prepare(
                        "UPDATE payments SET status = 'refunded', paypal_refund_id = ? WHERE appointment_id = ? AND status = 'completed'"
                    )->execute([$refund['id'] ?? null, (int)$id]);

                } elseif ($pmtRow && !empty($pmtRow['stripe_payment_intent_id'])) {
                    // ── Stripe ──
                    $stripe = Stripe::getInstance();
                    $scopeMismatch = $this->describeStripePaymentScopeMismatch($pmtRow, $stripe);
                    if ($scopeMismatch !== '') {
                        Logger::info('Stripe refund requires legacy account handling', null, [
                            'appointment_id' => (int)$id,
                            'payment_intent_id' => (string)$pmtRow['stripe_payment_intent_id'],
                            'reason' => $scopeMismatch,
                        ]);
                        $refundStatus = 'manual_required';
                    } else {
                        $refund = $stripe->refundPaymentIntent(
                            $pmtRow['stripe_payment_intent_id'],
                            (float)$pmtRow['amount']
                        );
                        $refundStatus = strtolower($refund['status'] ?? 'unknown');
                        Database::getInstance()->prepare(
                            "UPDATE appointments SET payment_status = 'refunded' WHERE id = ?"
                        )->execute([(int)$id]);
                        Database::getInstance()->prepare(
                            "UPDATE payments SET status = 'refunded', stripe_refund_id = ?
                             WHERE appointment_id = ? AND status = 'completed'"
                        )->execute([$refund['id'] ?? null, (int)$id]);
                    }
                }
            } catch (\Throwable $e) {
                Logger::error('Refund failed on cancel', null, ['error' => $e->getMessage(), 'appointment_id' => (int)$id]);
                $refundStatus = str_contains($e->getMessage(), 'No such payment_intent')
                    ? 'manual_required'
                    : 'failed';
            }
        }

        $this->json(['ok' => true, 'was_paid' => $wasPaid, 'refund_status' => $refundStatus, 'appointment_id' => (int)$id]);
    }

    public function pay(string $id): void
    {
        $this->requireAuth('patient');
        $apptId = (int)$id;
        $userId = Session::userId();

        $stmt = Database::getInstance()->prepare(
            "SELECT a.*, doc.name AS doctor_name, dp.specialty
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
               AND (a.payment_status = 'pending' OR a.status = 'pending_payment')
             LIMIT 1"
        );
        $stmt->execute([$apptId, $userId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->redirect('appointments');
        }

        $this->redirect('billing/appointment/' . $apptId . '/pay');
    }

    public function payLater(string $id): void
    {
        $this->requireAuth('patient');
        $this->verifyCsrf();
        $apptId = (int)$id;
        $userId = Session::userId();

        $stmt = Database::getInstance()->prepare(
            "SELECT id, doctor_id, scheduled_at FROM appointments
             WHERE id = ? AND patient_id = ?
               AND status IN ('pending_payment','pending') LIMIT 1"
        );
        $stmt->execute([$apptId, $userId]);
        $apptRow = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$apptRow) {
            $this->redirect('appointments');
        }

        // Notify chat
        $dtLabel = date('d/m/Y \a\s H:i', strtotime($apptRow['scheduled_at'] ?? ''));
        ChatController::notifyAppointment(
            (int)$apptRow['doctor_id'], $userId,
            "⏳ Cita del {$dtLabel} agendada (pago pendiente).",
            $apptId
        );

        Session::setFlash('success', 'Cita agendada. Recuerda completar el pago antes de tu consulta.');
        $this->redirect('appointments');
    }

    public function video(string $id): void
    {
        $this->requireAuth();
        $apptId = (int)$id;

        $stmt = Database::getInstance()->prepare(
            'SELECT a.*,
                    doc.name  AS doctor_name,
                    doc.email AS doctor_email,
                    pat.name  AS patient_name,
                    pat.email AS patient_email
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             JOIN users pat ON pat.id = a.patient_id
             WHERE a.id = ? LIMIT 1'
        );
        $stmt->execute([$apptId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt || $appt['type'] !== 'virtual' || empty($appt['video_room_id'])) {
            Session::setFlash('error', 'Esta cita no tiene sala de video asignada.');
            $this->redirect('appointments');
        }

        // Block video access if appointment is still pending confirmation/payment
        if (in_array($appt['status'], ['pending', 'pending_payment'], true)) {
            Session::setFlash('error', 'La consulta virtual requiere pago confirmado. Completa el pago antes de acceder.');
            $this->redirect('appointments');
        }

        // Block video access if already completed
        if ($appt['status'] === 'completed') {
            Session::setFlash('error', 'Esta consulta ya fue marcada como completada.');
            $this->redirect('appointments');
        }

        $userId   = Session::userId();
        $isDoctor = (int)$appt['doctor_id']  === $userId;
        $isPatient = (int)$appt['patient_id'] === $userId;

        if (!$isDoctor && !$isPatient) {
            http_response_code(403);
            $this->render('errors/403', ['title' => 'Acceso denegado']);
            return;
        }

        // Time gate: can only enter within 5 minutes of the scheduled start
        $startTs            = (int)strtotime($appt['scheduled_at']);
        $secondsUntilStart  = $startTs - time();
        $secondsUntilWindow = max(0, $secondsUntilStart - 300); // 300 s = 5 min before
        $canEnter           = ($secondsUntilWindow <= 0);

        $this->render('appointment/video', [
            'title'               => 'Consulta Virtual',
            'appointment'         => $appt,
            'isDoctor'            => $isDoctor,
            'canEnter'            => $canEnter,
            'secondsUntilWindow'  => $secondsUntilWindow,
        ]);
    }

    public function acceptAppointment(string $id): void
    {
        $this->requireAuth();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405); return;
        }
        $this->verifyCsrf();

        $apptId = (int)$id;
        $userId = Session::userId();
        $role   = Session::role();

        $stmt = Database::getInstance()->prepare(
            "SELECT id, doctor_id, patient_id, status,
                    COALESCE(consultation_fee, 0) AS consultation_fee,
                    COALESCE(payment_status, 'not_required') AS payment_status
             FROM appointments WHERE id = ? LIMIT 1"
        );
        $stmt->execute([$apptId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) { $this->json(['ok' => false, 'error' => 'Cita no encontrada.']); return; }

        $isDoctor  = $role === 'doctor'  && (int)$appt['doctor_id']  === $userId;
        $isPatient = $role === 'patient' && (int)$appt['patient_id'] === $userId;

        if (!$isDoctor && !$isPatient) {
            $this->json(['ok' => false, 'error' => 'Sin autorización.']); return;
        }

        // Doctor can accept pending_doctor; patient can accept pending_patient
        $allowed = ($isDoctor && $appt['status'] === 'pending_doctor')
                || ($isPatient && $appt['status'] === 'pending_patient');

        if (!$allowed) {
            $this->json(['ok' => false, 'error' => 'Esta cita no puede aceptarse en su estado actual.']); return;
        }

        $fee = (float)($appt['consultation_fee'] ?? 0);
        // If fee pending payment → keep pending_payment; otherwise confirm
        $newStatus = ($fee > 0 && ($appt['payment_status'] ?? 'not_required') === 'pending')
                   ? 'pending_payment'
                   : 'confirmed';

        Database::getInstance()->prepare(
            "UPDATE appointments SET status = ? WHERE id = ?"
        )->execute([$newStatus, $apptId]);

        // Notify the other party
        if ($isDoctor) {
            $this->createNotification((int)$appt['patient_id'], 'success', 'Cita aceptada',
                'El doctor aceptó tu cita. Revisa los detalles.',
                BASE_URL . 'appointments', 'appointment', $apptId);
        } else {
            $this->createNotification((int)$appt['doctor_id'], 'success', 'Cita aceptada por el paciente',
                'El paciente confirmó su cita.',
                BASE_URL . 'appointments', 'appointment', $apptId);
        }

        $this->json(['ok' => true, 'new_status' => $newStatus]);
    }

    public function rejectAppointment(string $id): void
    {
        $this->requireAuth();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Method not allowed'], 405); return;
        }
        $this->verifyCsrf();

        $apptId = (int)$id;
        $userId = Session::userId();
        $role   = Session::role();

        $stmt = Database::getInstance()->prepare(
            'SELECT id, doctor_id, patient_id, status FROM appointments WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$apptId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) { $this->json(['ok' => false, 'error' => 'Cita no encontrada.']); return; }

        $isDoctor  = $role === 'doctor'  && (int)$appt['doctor_id']  === $userId;
        $isPatient = $role === 'patient' && (int)$appt['patient_id'] === $userId;

        if (!$isDoctor && !$isPatient) {
            $this->json(['ok' => false, 'error' => 'Sin autorización.']); return;
        }

        $allowed = in_array($appt['status'], ['pending_doctor', 'pending_patient', 'pending', 'confirmed'], true);
        if (!$allowed) {
            $this->json(['ok' => false, 'error' => 'No se puede rechazar en este estado.']); return;
        }

        Database::getInstance()->prepare(
            "UPDATE appointments SET status = 'cancelled' WHERE id = ?"
        )->execute([$apptId]);

        $notifyId = $isDoctor ? (int)$appt['patient_id'] : (int)$appt['doctor_id'];
        $this->createNotification($notifyId, 'error', 'Cita rechazada',
            'Una cita fue rechazada/cancelada.',
            BASE_URL . 'appointments', 'appointment', $apptId);

        $this->json(['ok' => true]);
    }

    public function complete(string $id): void
    {
        $this->requireAuth('doctor');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('appointments');
        }
        $this->verifyCsrf();

        $apptId = (int)$id;
        $userId = Session::userId();

        $stmt = Database::getInstance()->prepare(
            "SELECT id, doctor_id, patient_id, scheduled_at, status, type,
                    COALESCE(payment_status, 'not_required') AS payment_status,
                    COALESCE(checked_in_at, '') AS checked_in_at
             FROM appointments WHERE id = ? AND doctor_id = ? LIMIT 1"
        );
        $stmt->execute([$apptId, $userId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            Session::setFlash('error', 'Cita no encontrada.');
            $this->redirect('appointments');
        }

        if (($appt['status'] ?? '') !== 'in_consultation') {
            Session::setFlash('error', 'Primero debes iniciar la consulta para poder completarla.');
            $this->redirect('appointments');
        }

        // Block completion if payment is still pending
        if (($appt['payment_status'] ?? 'not_required') === 'pending') {
            Session::setFlash('error', 'No puedes completar esta cita mientras el pago está pendiente.');
            $this->redirect('appointments');
        }

        // Doctor can only mark complete once the appointment time has started
        // Exception: if already in_consultation, it was started regardless of scheduled time
        if ($appt['status'] !== 'in_consultation' && strtotime($appt['scheduled_at']) > time()) {
            Session::setFlash('error', 'No puedes marcar como completada una cita que aún no ha comenzado.');
            $this->redirect('appointments');
        }

        // Presential: require check-in before completing
        if (($appt['type'] ?? '') === 'presential' && empty($appt['checked_in_at'])) {
            // Check if checkin columns exist (migration v14)
            $hasCheckin = array_key_exists('checked_in_at', $appt);
            if ($hasCheckin) {
                Session::setFlash('error', 'Debes registrar la entrada del paciente (check-in) antes de marcar la cita como completada.');
                $this->redirect('appointments');
            }
        }

        Database::getInstance()->prepare(
            "UPDATE appointments SET status = 'completed', completed_at = NOW() WHERE id = ?"
        )->execute([$apptId]);

        // Notify chat
        ChatController::notifyAppointment(
            $userId, (int)$appt['patient_id'],
            '✅ Consulta completada. Puedes revisar tu historial médico.',
            $apptId
        );

        $this->createNotification((int)$appt['patient_id'], 'success', 'Consulta completada',
            'Tu consulta médica ha sido completada. Revisa tu historial.',
            BASE_URL . 'patient/history', 'appointment', $apptId);

        $this->audit('complete_appointment', 'appointments', $apptId, []);
        Session::setFlash('success', 'Cita completada. Revisa el resumen y registra o actualiza la nota clínica si hace falta.');
        $this->redirect('doctor/notes/' . $apptId);
    }

    public function startConsultation(string $id): void
    {
        try {
            $this->requireAuth();
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                $this->json(['ok' => false, 'error' => 'Method not allowed'], 405);
                return;
            }
            $this->verifyCsrf();

            $apptId = (int)$id;
            $userId = Session::userId();
            $role   = Session::role();

            if (!in_array($role, ['doctor', 'assistant'], true)) {
                $this->json(['ok' => false, 'error' => 'Sin autorización.']);
                return;
            }

            $doctorId = $role === 'assistant' ? $this->getAssistantDoctorId($userId) : $userId;
            if ($doctorId <= 0) {
                $this->json(['ok' => false, 'error' => 'No se pudo identificar al doctor activo.']);
                return;
            }

            $stmt = Database::getInstance()->prepare(
                "SELECT id, doctor_id, patient_id, type, status, scheduled_at,
                        COALESCE(payment_status, 'not_required') AS payment_status
                 FROM appointments
                 WHERE id = ? AND doctor_id = ?
                 LIMIT 1"
            );
            $stmt->execute([$apptId, $doctorId]);
            $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$appt) {
                $this->json(['ok' => false, 'error' => 'Cita no encontrada.']);
                return;
            }

            if (($appt['status'] ?? '') === 'in_consultation') {
                $this->json(['ok' => true, 'already' => true, 'message' => 'La consulta ya está en curso.']);
                return;
            }

            if (($appt['status'] ?? '') !== 'confirmed') {
                $this->json(['ok' => false, 'error' => 'Solo se puede iniciar una cita confirmada.']);
                return;
            }

            if (($appt['payment_status'] ?? 'not_required') === 'pending') {
                $this->json(['ok' => false, 'error' => 'No se puede iniciar la consulta con pago pendiente.']);
                return;
            }

            if (($appt['type'] ?? '') === 'presential') {
                $checkedInAt = '';
                try {
                    $chk = Database::getInstance()->prepare(
                        "SELECT COALESCE(checked_in_at, '') AS checked_in_at FROM appointments WHERE id = ? LIMIT 1"
                    );
                    $chk->execute([$apptId]);
                    $checkedInAt = (string)($chk->fetchColumn() ?: '');
                } catch (\Throwable) {
                    // Backward compatibility for old schemas without checked_in_at.
                    $checkedInAt = 'schema_legacy';
                }

                if ($checkedInAt === '') {
                    $this->json(['ok' => false, 'error' => 'Registra el check-in del paciente antes de iniciar consulta presencial.']);
                    return;
                }
            }

            // Business rule: la consulta solo puede iniciarse el mismo día agendado.
            $scheduledTs = !empty($appt['scheduled_at']) ? strtotime($appt['scheduled_at']) : 0;
            if ($scheduledTs <= 0 || date('Y-m-d', $scheduledTs) !== date('Y-m-d')) {
                $this->json([
                    'ok' => false,
                    'error' => 'Solo puedes iniciar la consulta el mismo día agendado (' . ($scheduledTs ? date('d/m/Y', $scheduledTs) : 'sin fecha') . ').'
                ]);
                return;
            }

            try {
                Database::getInstance()->prepare(
                    "UPDATE appointments
                     SET status = 'in_consultation'
                     WHERE id = ?"
                )->execute([$apptId]);
            } catch (\Throwable) {
                $this->json(['ok' => false, 'error' => 'No se pudo iniciar la consulta. Verifica migración de estados.']);
                return;
            }

            ChatController::notifyAppointment(
                $doctorId,
                (int)$appt['patient_id'],
                'Tu consulta ha iniciado.',
                $apptId
            );

            $this->createNotification(
                (int)$appt['patient_id'],
                'info',
                'Consulta en curso',
                'Tu doctor ha iniciado la consulta.',
                BASE_URL . 'appointments',
                'appointment',
                $apptId
            );

            $this->audit('start_consultation', 'appointments', $apptId, ['role' => $role]);
            $this->json(['ok' => true, 'new_status' => 'in_consultation']);
        } catch (\Throwable $e) {
            error_log('[AppointmentStartConsultation] ' . $e->getMessage());
            $this->json(['ok' => false, 'error' => 'Error interno al iniciar consulta. Revisa migraciones y sesión.'], 500);
        }
    }

    private function createNotification(int $userId, string $type, string $title, string $body, string $link = '', string $relatedType = '', int $relatedId = 0): void
    {
        try {
            Database::getInstance()->prepare(
                'INSERT INTO notifications (user_id, type, title, body, link, related_type, related_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
            )->execute([$userId, $type, $title, $body, $link ?: null, $relatedType ?: null, $relatedId ?: null]);
        } catch (\Throwable) {}
    }

    /** ── Rate doctor after completed appointment (AJAX) ──────── */
    public function rateDoctor(string $id): void
    {
        $this->requireAuth('patient');
        $apptId = (int)$id;
        $userId = Session::userId();

        $rating  = (int)($_POST['rating']  ?? 0);
        $comment = trim($_POST['comment']  ?? '');

        if ($rating < 1 || $rating > 5) {
            $this->json(['ok' => false, 'error' => 'Calificación inválida.']);
            return;
        }

        // Verify appointment belongs to this patient and is completed
        $stmt = Database::getInstance()->prepare(
            "SELECT a.id, a.doctor_id, doc.name AS doctor_name
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ? AND a.status = 'completed'
             LIMIT 1"
        );
        $stmt->execute([$apptId, $userId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->json(['ok' => false, 'error' => 'Cita no encontrada o no completada.']);
            return;
        }

        try {
            Database::getInstance()->prepare(
                'INSERT INTO reviews (patient_id, doctor_id, appointment_id, rating, comment, is_verified)
                 VALUES (?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)'
            )->execute([$userId, (int)$appt['doctor_id'], $apptId, $rating, $comment ?: null]);
        } catch (\Throwable) {
            $this->json(['ok' => false, 'error' => 'No se pudo guardar la calificación.']);
            return;
        }

        // Marcar notificaciones de esta cita como leídas
        Database::getInstance()->prepare(
            "UPDATE notifications SET is_read = 1
             WHERE user_id = ? AND related_type = 'appointments' AND related_id = ? AND is_read = 0"
        )->execute([$userId, $apptId]);

        $this->json(['ok' => true, 'doctor_name' => $appt['doctor_name']]);
    }

    // ── Reschedule flow ─────────────────────────────────────────
    public function reschedule(string $id): void
    {
        $this->requireAuth();
        $apptId = (int)$id;
        // Fetch original doctor to enforce same-doctor lock
        $stmt = Database::getInstance()->prepare(
            'SELECT doctor_id FROM appointments WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$apptId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        $lockDoc = ($row && $row['doctor_id']) ? ('&lock_doctor=' . (int)$row['doctor_id']) : '';
        $this->redirect('appointments/create?reschedule_from=' . $apptId . $lockDoc);
    }

    // ── PayPal: create order for appointment ────────────────────
    public function payPaypalCreate(string $id): void
    {
        $this->requireAuth('patient');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['ok' => false, 'error' => 'Method not allowed']);
            return;
        }
        $this->verifyCsrf();

        $apptId = (int)$id;
        $userId = Session::userId();

        $stmt = Database::getInstance()->prepare(
            "SELECT a.id, a.consultation_fee, a.payment_status, a.status,
                    doc.name AS doctor_name, dp.specialty
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
               AND a.payment_status = 'pending'
             LIMIT 1"
        );
        $stmt->execute([$apptId, $userId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->json(['ok' => false, 'error' => 'Cita no encontrada o pago no requerido.']);
            return;
        }

        $amount = number_format((float)($appt['consultation_fee'] ?? 0), 2, '.', '');
        if ((float)$amount <= 0) {
            // No fee — mark as not_required and confirm
            Database::getInstance()->prepare(
                "UPDATE appointments SET payment_status = 'not_required', status = 'confirmed' WHERE id = ?"
            )->execute([$apptId]);
            $this->json(['ok' => true, 'no_fee' => true]);
            return;
        }

        try {
            $mStmt = Database::getInstance()->prepare(
                "SELECT enabled FROM payment_method_settings WHERE method = 'paypal' AND context = 'consultation' LIMIT 1"
            );
            $mStmt->execute();
            $mEnabled = $mStmt->fetchColumn();
            if ($mEnabled !== false && !(bool)$mEnabled) {
                $this->json(['ok' => false, 'error' => 'PayPal no esta disponible actualmente.']);
                return;
            }
        } catch (\Throwable) {}

        $pp = PayPal::getInstance();
        $returnUrl = rtrim(BASE_URL, '/') . '/appointments/' . $apptId . '/pay-paypal/capture';
        $cancelUrl = rtrim(BASE_URL, '/') . '/appointments/' . $apptId . '/pay';
        $desc      = 'Consulta medica #' . $apptId . ' - ' . ($appt['doctor_name'] ?? '');

        try {
            $order = $pp->createOrder((float)$amount, 'MXN', $desc, $returnUrl, $cancelUrl);

            if (empty($order['id'])) {
                throw new \RuntimeException('PayPal no retornó ID de orden.');
            }

            $approvalUrl = $order['approve_url'] ?? '';
            $this->json(['ok' => true, 'approval_url' => $approvalUrl, 'order_id' => $order['id']]);
        } catch (\Throwable $e) {
            $this->json(['ok' => false, 'error' => 'Error al crear orden PayPal: ' . $e->getMessage()]);
        }
    }

    // ── PayPal: capture payment after approval ──────────────────
    public function payPaypalCapture(string $id): void
    {
        $this->requireAuth('patient');
        $apptId = (int)$id;
        $userId = Session::userId();
        $token  = $_GET['token'] ?? '';  // PayPal passes ?token=ORDER_ID

        if (!$token) {
            Session::setFlash('error', 'Token de pago inválido.');
            $this->redirect('appointments/' . $apptId . '/pay');
            return;
        }

        // Verify appointment belongs to this patient
        $stmt = Database::getInstance()->prepare(
            "SELECT a.id, a.consultation_fee, a.doctor_id, a.patient_id,
                    a.scheduled_at, a.type, a.payment_status,
                    doc.name AS doctor_name
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
               AND a.payment_status = 'pending'
             LIMIT 1"
        );
        $stmt->execute([$apptId, $userId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            Session::setFlash('error', 'Cita no encontrada o pago ya procesado.');
            $this->redirect('appointments');
            return;
        }

        $pp  = PayPal::getInstance();
        $pdo = Database::getInstance();
        try {
            Logger::info('PayPal capture attempt', null, [
                'appointment_id' => $apptId,
                'user_id'        => $userId,
                'order_id'       => $token,
                'sandbox'        => $pp->isSandbox(),
            ]);

            // Capture BEFORE opening the DB transaction (external HTTP call)
            $capture = $pp->captureOrder($token);

            $captureStatus = strtoupper($capture['status'] ?? '');

            Logger::info('PayPal capture response', null, [
                'appointment_id' => $apptId,
                'order_id'       => $token,
                'status'         => $captureStatus,
                'raw'            => json_encode(array_intersect_key($capture, array_flip(['id','status','purchase_units']))),
            ]);

            if ($captureStatus !== 'COMPLETED') {
                Logger::warning('PayPal capture not COMPLETED', null, [
                    'appointment_id' => $apptId, 'status' => $captureStatus,
                ]);
                Session::setFlash('error', 'El pago no fue completado. Estado: ' . $captureStatus);
                $this->redirect('appointments/' . $apptId . '/pay');
                return;
            }

            $amount    = (float)($appt['consultation_fee'] ?? 0);
            $captureId = $capture['purchase_units'][0]['payments']['captures'][0]['id'] ?? '';
            $doctorId  = (int)($appt['doctor_id'] ?? 0);

            // Wrap both writes in a transaction — if the INSERT fails, appointment rolls back
            $pdo->beginTransaction();

            $pdo->prepare(
                "UPDATE appointments
                 SET payment_status = 'paid',
                     status = 'confirmed'
                 WHERE id = ?"
            )->execute([$apptId]);

            $pdo->prepare(
                "INSERT INTO payments
                    (user_id, appointment_id, doctor_id, amount, currency,
                     paypal_order_id, paypal_capture_id, method, status, type, payout_status)
                 VALUES (?, ?, ?, ?, 'MXN', ?, ?, 'paypal', 'completed', 'consultation', 'pending')"
            )->execute([$userId, $apptId, $doctorId ?: null, $amount, $token, $captureId ?: null]);

            $pdo->commit();

            // Notify chat — mensaje visible en la conversación
            $fee = number_format($amount, 2);
            ChatController::notifyAppointment(
                (int)$appt['doctor_id'], $userId,
                "💳 Pago de \${$fee} MXN completado. La cita ha sido confirmada.",
                $apptId
            );

            // In-app notifications
            $dtLabel = date('d/m/Y \a\s H:i', strtotime($appt['scheduled_at'] ?? 'now'));
            Notification::create(
                $userId,
                'payment_confirmed',
                '¡Pago confirmado!',
                'Pago de $' . $fee . ' MXN por tu cita del ' . $dtLabel . ' ha sido procesado.',
                BASE_URL . 'appointments/' . $apptId,
                'appointment',
                $apptId
            );
            if ($doctorId > 0) {
                Notification::create(
                    $doctorId,
                    'payment_received',
                    'Pago recibido por cita',
                    'El paciente realizó el pago de $' . $fee . ' MXN. Cita del ' . $dtLabel . ' confirmada.',
                    BASE_URL . 'appointments/' . $apptId,
                    'appointment',
                    $apptId
                );
            }

            // Transactional email to patient
            try {
                $patStmt = Database::getInstance()->prepare(
                    'SELECT name, email FROM users WHERE id = ? LIMIT 1'
                );
                $patStmt->execute([$userId]);
                $pat = $patStmt->fetch(\PDO::FETCH_ASSOC);
                if ($pat && $pat['email']) {
                    $emailBody = Mailer::template(
                        '✅ Pago confirmado — DoctorCloud',
                        '<p>Hola <strong>' . htmlspecialchars($pat['name'] ?? '', ENT_QUOTES, 'UTF-8') . '</strong>,</p>'
                        . '<p>Tu pago de <strong>$' . $fee . ' MXN</strong> ha sido confirmado. '
                        . 'Tu cita con el Dr. <strong>' . htmlspecialchars($appt['doctor_name'] ?? '', ENT_QUOTES, 'UTF-8') . '</strong>'
                        . ' del <strong>' . $dtLabel . '</strong> está confirmada.</p>'
                        . '<p>Puedes ver los detalles en tu panel.</p>'
                    );
                    Mailer::send($pat['email'], '✅ Pago confirmado — DoctorCloud', $emailBody);
                }
            } catch (\Throwable) {}

            $this->audit('payment_captured', 'appointments', $apptId, ['amount' => $amount]);

            Session::setFlash('success', '¡Pago realizado con éxito! Tu cita ha sido confirmada.');
            $this->redirect('appointments/' . $apptId . '/pay-success');
        } catch (\Throwable $e) {
            // Roll back only if a transaction is active
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('PayPal capture exception', $e, [
                'appointment_id' => $apptId,
                'user_id'        => $userId,
                'order_id'       => $token,
            ]);
            Session::setFlash('error', 'Error al capturar pago: ' . $e->getMessage());
            $this->redirect('appointments/' . $apptId . '/pay');
        }
    }

    // ── Payment success page ────────────────────────────────────
    public function paySuccess(string $id): void
    {
        $this->requireAuth('patient');
        $apptId = (int)$id;
        $userId = Session::userId();

        $stmt = Database::getInstance()->prepare(
            "SELECT a.*,
                    doc.name AS doctor_name, dp.specialty
             FROM appointments a
             JOIN users doc ON doc.id = a.doctor_id
             LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
             WHERE a.id = ? AND a.patient_id = ?
             LIMIT 1"
        );
        $stmt->execute([$apptId, $userId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->redirect('appointments');
            return;
        }

        $this->render('appointment/pay_success', [
            'title'       => 'Pago Exitoso',
            'appointment' => $appt,
        ]);
    }

    // ── Patient: get or generate checkin QR code on-demand ────────
    public function patientQrCode(string $id): void
    {
        header('Content-Type: application/json; charset=utf-8');

        // Auth check that returns JSON (not HTML) on failure
        if (!Session::isLoggedIn()) {
            echo json_encode(['ok' => false, 'error' => 'Sesión expirada. Recarga la página e inicia sesión.']);
            return;
        }
        if (Session::role() !== 'patient') {
            echo json_encode(['ok' => false, 'error' => 'Solo pacientes pueden generar este código.']);
            return;
        }

        $userId = (int)Session::userId();
        $apptId = (int)$id;
        $db     = Database::getInstance();

        try {
            $st = $db->prepare(
                "SELECT id, type, status, checkin_code, scheduled_at, end_at
                 FROM appointments WHERE id = ? AND patient_id = ? LIMIT 1"
            );
            $st->execute([$apptId, $userId]);
        } catch (\Throwable $e) {
            echo json_encode(['ok' => false, 'error' => 'Error de base de datos. Contacta al administrador.']);
            return;
        }
        $appt = $st->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            echo json_encode(['ok' => false, 'error' => 'Cita no encontrada']);
            return;
        }
        if ($appt['type'] !== 'presential' || $appt['status'] !== 'confirmed') {
            echo json_encode(['ok' => false, 'error' => 'QR solo disponible para citas presenciales confirmadas']);
            return;
        }

        $code = $appt['checkin_code'] ?? null;

        // Generate on-demand if missing
        if (empty($code)) {
            $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            $code  = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $chars[random_int(0, strlen($chars) - 1)];
            }
            $expiresAt = date('Y-m-d H:i:s', strtotime($appt['scheduled_at']) + 95 * 60);
            try {
                $db->prepare(
                    "UPDATE appointments SET checkin_code = ?, checkin_code_expires_at = ?
                     WHERE id = ? AND patient_id = ? AND checkin_code IS NULL"
                )->execute([$code, $expiresAt, $apptId, $userId]);
            } catch (\Throwable $e) {
                echo json_encode(['ok' => false, 'error' => 'No se pudo guardar el código. Ejecuta la migración v14.']);
                return;
            }
        }

        $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?data=' . urlencode($code) . '&size=240x240&margin=10';
        echo json_encode(['ok' => true, 'code' => $code, 'qr_url' => $qrUrl]);
    }

    // ── Patient: generate checkout code (called when patient requests end) ──
    public function patientCheckoutCode(string $id): void
    {
        header('Content-Type: application/json; charset=utf-8');

        // Auth check that returns JSON (not HTML) on failure
        if (!Session::isLoggedIn()) {
            echo json_encode(['ok' => false, 'error' => 'Sesión expirada. Recarga la página e inicia sesión.']);
            return;
        }
        if (Session::role() !== 'patient') {
            echo json_encode(['ok' => false, 'error' => 'Solo pacientes pueden generar el código de cierre.']);
            return;
        }
        header('Content-Type: application/json; charset=utf-8');

        $userId = (int)Session::userId();
        $apptId = (int)$id;
        $db     = Database::getInstance();

        // Try to read checkout_code column — migration may not have run yet.
        try {
            $st = $db->prepare(
                "SELECT id, type, status, checkout_code, checkout_code_expires_at, scheduled_at
                 FROM appointments WHERE id = ? AND patient_id = ? LIMIT 1"
            );
            $st->execute([$apptId, $userId]);
        } catch (\Throwable $e) {
                echo json_encode(['ok' => false, 'error' => 'Falta aplicar la migración del flujo de cierre de consulta.']);
            return;
        }
        $appt = $st->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            echo json_encode(['ok' => false, 'error' => 'Cita no encontrada.']);
            return;
        }
        if ($appt['status'] !== 'in_consultation') {
            echo json_encode(['ok' => false, 'error' => 'La consulta no está en progreso.']);
            return;
        }

        $code      = $appt['checkout_code'] ?? null;
        $expiresAt = $appt['checkout_code_expires_at'] ?? null;

        // Re-use existing valid code
        if ($code && $expiresAt && strtotime($expiresAt) > time()) {
            $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?data=' . urlencode($code) . '&size=240x240&margin=10';
            echo json_encode(['ok' => true, 'code' => $code, 'qr_url' => $qrUrl]);
            return;
        }

        // Generate a fresh 6-char code
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $newCode = '';
        for ($i = 0; $i < 6; $i++) {
            $newCode .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $newExpires = date('Y-m-d H:i:s', time() + 30 * 60); // 30 min

        try {
            $db->prepare(
                "UPDATE appointments
                 SET checkout_code = ?, checkout_code_expires_at = ?
                 WHERE id = ? AND patient_id = ? AND status = 'in_consultation'"
            )->execute([$newCode, $newExpires, $apptId, $userId]);
        } catch (\Throwable $e) {
            echo json_encode(['ok' => false, 'error' => 'No se pudo generar el código. Falta aplicar la migración del flujo de cierre de consulta.']);
            return;
        }

        $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?data=' . urlencode($newCode) . '&size=240x240&margin=10';
        echo json_encode(['ok' => true, 'code' => $newCode, 'qr_url' => $qrUrl]);
    }

    // ── Doctor: validate checkout code and complete appointment ─────
    public function validateCheckout(string $id): void
    {
        $this->requireAuth();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['ok' => false, 'error' => 'Method not allowed']);
            return;
        }
        $this->verifyCsrf();

        $apptId = (int)$id;
        $userId = Session::userId();
        $role   = Session::role();
        $code   = strtoupper(trim($this->post('checkout_code') ?? ''));

        if (!in_array($role, ['doctor', 'assistant'], true)) {
            $this->json(['ok' => false, 'error' => 'Sin acceso.']);
            return;
        }
        if (!$code) {
            $this->json(['ok' => false, 'error' => 'Código requerido.']);
            return;
        }

        $doctorId = $role === 'assistant' ? $this->getAssistantDoctorId($userId) : $userId;

        try {
            $stmt = Database::getInstance()->prepare(
                "SELECT id, checkout_code, checkout_code_expires_at, checked_out_at,
                        patient_id, status, payment_status
                 FROM appointments
                 WHERE id = ? AND doctor_id = ? LIMIT 1"
            );
            $stmt->execute([$apptId, $doctorId]);
        } catch (\Throwable $e) {
            $this->json(['ok' => false, 'error' => 'Falta aplicar la migración del flujo de cierre de consulta.']);
            return;
        }
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->json(['ok' => false, 'error' => 'Cita no encontrada.']);
            return;
        }
        if ($appt['status'] !== 'in_consultation') {
            $this->json(['ok' => false, 'error' => 'La consulta no está activa.']);
            return;
        }
        if (!$appt['checkout_code']) {
            $this->json(['ok' => false, 'error' => 'El paciente aún no ha generado su código de cierre.']);
            return;
        }
        if (!hash_equals((string)$appt['checkout_code'], $code)) {
            $this->json(['ok' => false, 'error' => 'Código incorrecto.']);
            return;
        }
        if ($appt['checkout_code_expires_at'] && strtotime($appt['checkout_code_expires_at']) < time()) {
            $this->json(['ok' => false, 'error' => 'El código ha expirado. Pide al paciente que genere uno nuevo.']);
            return;
        }

        // All checks passed — complete the appointment
        try {
            Database::getInstance()->prepare(
                "UPDATE appointments
                 SET status = 'completed', completed_at = NOW(), checked_out_at = NOW()
                 WHERE id = ?"
            )->execute([$apptId]);
        } catch (\Throwable $e) {
            $this->json(['ok' => false, 'error' => 'No se pudo completar la cita.']);
            return;
        }

        ChatController::notifyAppointment(
            $doctorId, (int)$appt['patient_id'],
            'Consulta completada. Puedes revisar tu historial médico.',
            $apptId
        );
        $this->createNotification(
            (int)$appt['patient_id'], 'success', 'Consulta completada',
            'Tu consulta médica ha finalizado. Revisa tu historial.',
            BASE_URL . 'patient/history', 'appointment', $apptId
        );
        $this->audit('checkout_validated', 'appointments', $apptId, ['role' => $role]);

        $this->json(['ok' => true, 'redirect' => BASE_URL . 'doctor/notes/' . $apptId]);
    }

    // ── QR / code check-in (doctor scans or enters manual code) ─
    public function checkin(string $id): void
    {
        $this->requireAuth();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['ok' => false, 'error' => 'Method not allowed']);
            return;
        }
        $this->verifyCsrf();

        $apptId = (int)$id;
        $userId = Session::userId();
        $role   = Session::role();
        $code   = strtoupper(trim($this->post('checkin_code')));

        if (!in_array($role, ['doctor', 'assistant'], true)) {
            $this->json(['ok' => false, 'error' => 'Sin acceso.']);
            return;
        }

        if (!$code) {
            $this->json(['ok' => false, 'error' => 'Código requerido.']);
            return;
        }

        // Resolve the doctor who owns the appointment
        $doctorId = $role === 'assistant' ? $this->getAssistantDoctorId($userId) : $userId;

        $stmt = Database::getInstance()->prepare(
            "SELECT id, checkin_code, checkin_code_expires_at, checked_in_at,
                    patient_id, type, status
             FROM appointments
             WHERE id = ? AND doctor_id = ?
             LIMIT 1"
        );
        $stmt->execute([$apptId, $doctorId]);
        $appt = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$appt) {
            $this->json(['ok' => false, 'error' => 'Cita no encontrada.']);
            return;
        }
        if ($appt['status'] === 'completed') {
            $this->json(['ok' => true, 'already' => true, 'message' => 'La cita ya fue completada.']);
            return;
        }
        if ($appt['checked_in_at']) {
            $this->json(['ok' => true, 'already' => true, 'message' => 'Ya se registró entrada.']);
            return;
        }
        if (!$appt['checkin_code']) {
            $this->json(['ok' => false, 'error' => 'El código de entrada aún no está disponible. Se genera 1h antes de la cita.']);
            return;
        }
        if (!hash_equals($appt['checkin_code'], $code)) {
            $this->json(['ok' => false, 'error' => 'Código incorrecto.']);
            return;
        }
        if ($appt['checkin_code_expires_at'] && strtotime($appt['checkin_code_expires_at']) < time()) {
            $this->json(['ok' => false, 'error' => 'El código ha expirado.']);
            return;
        }

        // Mark check-in and move consultation to in-progress.
        try {
            Database::getInstance()->prepare(
                "UPDATE appointments
                 SET checked_in_at = NOW(), status = 'in_consultation'
                 WHERE id = ?"
            )->execute([$apptId]);
        } catch (\Throwable $e) {
            $this->json(['ok' => false, 'error' => 'No se pudo iniciar consulta con check-in. Verifica migración de estados.']);
            return;
        }

        ChatController::notifyAppointment(
            $doctorId, (int)$appt['patient_id'],
            '🩺 Consulta presencial en curso. Check-in validado por QR.',
            $apptId
        );

        $this->audit('patient_checkin', 'appointments', $apptId, []);
        $this->json(['ok' => true, 'in_consultation' => true, 'message' => 'Check-in correcto. Consulta iniciada.']);
    }

    // ── Private helpers ──────────────────────────────────────────
    private function checkPatientOverlap(int $patientId, string $scheduledAt, string $endAt, int $excludeId = 0): bool
    {
        $stmt = Database::getInstance()->prepare(
            "SELECT id FROM appointments
             WHERE patient_id = ? AND id != ?
               AND status NOT IN ('cancelled','completed','no_show')
               AND scheduled_at < ? AND end_at > ?
             LIMIT 1"
        );
        $stmt->execute([$patientId, $excludeId, $endAt, $scheduledAt]);
        return (bool)$stmt->fetch();
    }

    /** Get the assigned doctor's user_id for an assistant. Returns 0 if not linked. */
    private function getAssistantDoctorId(int $assistantUserId): int
    {

        $db = Database::getInstance();

        // 1. Session-persisted active doctor
        $sessionDrId = isset($_SESSION['assistant_active_doctor_id'])
                       ? (int)$_SESSION['assistant_active_doctor_id'] : 0;
        if ($sessionDrId > 0) {
            $chk = $db->prepare(
                "SELECT doctor_id FROM assistant_doctor_assignments
                 WHERE assistant_user_id = ? AND doctor_id = ? AND status = 'active' LIMIT 1"
            );
            $chk->execute([$assistantUserId, $sessionDrId]);
            if ($chk->fetchColumn()) {
                return $sessionDrId;
            }
            unset($_SESSION['assistant_active_doctor_id']);
        }

        // 2. Most-recent active assignment
        $stmt = $db->prepare(
            "SELECT doctor_id FROM assistant_doctor_assignments
             WHERE assistant_user_id = ? AND status = 'active'
             ORDER BY updated_at DESC LIMIT 1"
        );
        $stmt->execute([$assistantUserId]);
        $doctorId = (int)($stmt->fetchColumn() ?: 0);
        if ($doctorId > 0) {
            $_SESSION['assistant_active_doctor_id'] = $doctorId;
            return $doctorId;
        }

        // 3. Legacy fallback: assistant_profiles.doctor_id
        $legacy = $db->prepare(
            "SELECT doctor_id FROM assistant_profiles WHERE user_id = ? AND status = 'active' LIMIT 1"
        );
        $legacy->execute([$assistantUserId]);
        return (int)($legacy->fetchColumn() ?: 0);
    }

    /** Get the hospital_license_id of a doctor (null if independent). */
    private function getAssistantDoctorLicenseId(int $doctorUserId): ?int
    {
        $stmt = Database::getInstance()->prepare(
            'SELECT hospital_license_id FROM doctor_profiles WHERE user_id = ? LIMIT 1'
        );
        $stmt->execute([$doctorUserId]);
        $val = $stmt->fetchColumn();
        return ($val > 0) ? (int)$val : null;
    }

    private function hydrateDoctorPricing(int $doctorUserId, array $profile): array
    {
        try {
            $stmt = Database::getInstance()->prepare(
                'SELECT consultation_fee, telemedicine_fee, home_visit_fee, duration_minutes
                 FROM doctor_profiles
                 WHERE user_id = ? LIMIT 1'
            );
            $stmt->execute([$doctorUserId]);
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
}
