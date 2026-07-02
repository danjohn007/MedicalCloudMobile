ALTER TABLE `patient_profiles`
  ADD COLUMN `doctor_access_code` varchar(32) DEFAULT NULL AFTER `associated_doctor_id`,
  ADD COLUMN `lat` decimal(10,7) DEFAULT NULL AFTER `state`,
  ADD COLUMN `lng` decimal(10,7) DEFAULT NULL AFTER `lat`;

CREATE TABLE IF NOT EXISTS `doctor_patient_links` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `doctor_id` int(10) unsigned NOT NULL,
  `patient_id` int(10) unsigned NOT NULL,
  `link_source` enum('patient_code','doctor_registered','completed_appointment','hospital') NOT NULL DEFAULT 'patient_code',
  `linked_by_user_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_doctor_patient_link` (`doctor_id`,`patient_id`),
  KEY `idx_dpl_patient` (`patient_id`),
  KEY `idx_dpl_source` (`link_source`),
  CONSTRAINT `fk_dpl_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dpl_patient` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dpl_linked_by` FOREIGN KEY (`linked_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE `patient_profiles`
SET `doctor_access_code` = UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 10))
WHERE (`doctor_access_code` IS NULL OR `doctor_access_code` = '');

INSERT INTO `doctor_patient_links`
  (`doctor_id`, `patient_id`, `link_source`, `linked_by_user_id`, `is_active`, `verified_at`, `created_at`, `updated_at`)
SELECT
  `associated_doctor_id`,
  `user_id`,
  'doctor_registered',
  `associated_doctor_id`,
  1,
  NOW(),
  NOW(),
  NOW()
FROM `patient_profiles`
WHERE `associated_doctor_id` IS NOT NULL
ON DUPLICATE KEY UPDATE
  `is_active` = 1,
  `verified_at` = NOW(),
  `updated_at` = NOW();

INSERT INTO `doctor_patient_links`
  (`doctor_id`, `patient_id`, `link_source`, `linked_by_user_id`, `is_active`, `verified_at`, `created_at`, `updated_at`)
SELECT
  `doctor_id`,
  `patient_id`,
  'completed_appointment',
  `doctor_id`,
  1,
  NOW(),
  NOW(),
  NOW()
FROM `appointments`
WHERE `status` IN ('completed', 'finished')
GROUP BY `doctor_id`, `patient_id`
ON DUPLICATE KEY UPDATE
  `is_active` = 1,
  `verified_at` = NOW(),
  `updated_at` = NOW();
