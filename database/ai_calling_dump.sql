-- MySQL 8+ schema for the AI Calling application.
-- Import this file when the database should contain only the three application tables.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `call_messages`;
DROP TABLE IF EXISTS `calls`;
DROP TABLE IF EXISTS `leads`;

CREATE TABLE `leads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calls` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'queued',
    `outcome` VARCHAR(30) NULL,
    `summary` TEXT NULL,
    `started_at` TIMESTAMP NULL,
    `ended_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `calls_lead_id_index` (`lead_id`),
    CONSTRAINT `calls_lead_id_foreign` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `call_messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `call_id` BIGINT UNSIGNED NOT NULL,
    `speaker` VARCHAR(20) NOT NULL,
    `message` TEXT NOT NULL,
    `spoken_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `call_messages_call_id_spoken_at_index` (`call_id`, `spoken_at`),
    CONSTRAINT `call_messages_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
