-- ─────────────────────────────────────────────────────────────
-- Migration: Create chat_threads and chat_messages tables
-- Required for the mobile messaging feature
-- Run this on your MySQL database (doctorcl_doctorcloud)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `chat_threads` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `patient_id` int(10) UNSIGNED NOT NULL,
  `doctor_id` int(10) UNSIGNED NOT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patient_doctor` (`patient_id`, `doctor_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `last_message_at` (`last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `thread_id` int(10) UNSIGNED NOT NULL,
  `sender_id` int(10) UNSIGNED NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thread_id` (`thread_id`),
  KEY `sender_id` (`sender_id`),
  KEY `is_read_thread` (`thread_id`, `is_read`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample chat thread for Camila Reyes (patient_id=7) with Doctor Ana (doctor_id=3)
-- so the messages screen shows data immediately
INSERT IGNORE INTO `chat_threads` (`patient_id`, `doctor_id`, `last_message_at`, `created_at`)
VALUES (7, 3, NOW(), NOW());

INSERT IGNORE INTO `chat_messages` (`thread_id`, `sender_id`, `message`, `is_read`, `created_at`)
VALUES 
  (1, 3, 'Hola Camila, ¿cómo te has sentido con el tratamiento?', 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (1, 7, 'Bien doctora, ya casi no me duele la cabeza', 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (1, 3, 'Me alegra mucho. Recuerda tomar suficiente agua y descansar.', 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (1, 7, 'Sí, gracias. ¿Cuándo es mi próxima cita?', 0, DATE_SUB(NOW(), INTERVAL 1 DAY));