-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: ai_calling_prod
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_tokens`
--

DROP TABLE IF EXISTS `admin_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` bigint unsigned NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_tokens_token_hash_unique` (`token_hash`),
  KEY `admin_tokens_admin_user_id_foreign` (`admin_user_id`),
  CONSTRAINT `admin_tokens_admin_user_id_foreign` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_tokens`
--

LOCK TABLES `admin_tokens` WRITE;
/*!40000 ALTER TABLE `admin_tokens` DISABLE KEYS */;
INSERT INTO `admin_tokens` VALUES (1,1,'2ed56331b40630d20fdbd240f78731e731e9e4979502f10bc06b282fd2370a7f','2026-10-08 02:44:58','2026-10-01 02:44:58','2026-10-01 02:44:58'),(6,1,'4b60f1912d26ca2d3b3e97fdc57312a04f6d11c438197c8e8b5f36a7e1bb6c5a','2026-10-09 05:01:53','2026-10-02 05:01:53','2026-10-02 05:01:53');
/*!40000 ALTER TABLE `admin_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_users`
--

LOCK TABLES `admin_users` WRITE;
/*!40000 ALTER TABLE `admin_users` DISABLE KEYS */;
INSERT INTO `admin_users` VALUES (1,'Demo Admin','admin@example.com','$2y$12$KHgSncs0ewRqcUY0jdUnYO4T9tn2gYaZ3buPYIaohpgjQGsDXAO0m',1,'2026-10-01 02:42:29','2026-10-01 02:42:29',NULL);
/*!40000 ALTER TABLE `admin_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agent_knowledge_documents`
--

DROP TABLE IF EXISTS `agent_knowledge_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_knowledge_documents` (
  `ai_agent_id` bigint unsigned NOT NULL,
  `document_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`ai_agent_id`,`document_id`),
  KEY `agent_knowledge_documents_document_id_index` (`document_id`),
  CONSTRAINT `agent_knowledge_documents_ai_agent_id_foreign` FOREIGN KEY (`ai_agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agent_knowledge_documents_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `knowledge_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_knowledge_documents`
--

LOCK TABLES `agent_knowledge_documents` WRITE;
/*!40000 ALTER TABLE `agent_knowledge_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `agent_knowledge_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_agents`
--

DROP TABLE IF EXISTS `ai_agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_agents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voice` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `language` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `system_prompt` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_agents_organization_id_status_index` (`organization_id`,`status`),
  CONSTRAINT `ai_agents_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_agents`
--

LOCK TABLES `ai_agents` WRITE;
/*!40000 ALTER TABLE `ai_agents` DISABLE KEYS */;
INSERT INTO `ai_agents` VALUES (1,1,'Deblina',NULL,NULL,NULL,NULL,NULL,'active',1,'2026-10-03 01:40:58','2026-10-03 01:40:58'),(2,1,'Subrata',NULL,NULL,NULL,NULL,NULL,'active',1,'2026-10-03 01:40:58','2026-10-03 01:40:58');
/*!40000 ALTER TABLE `ai_agents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `actor_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned DEFAULT NULL,
  `action` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `before_json` json DEFAULT NULL,
  `after_json` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_organization_id_entity_type_entity_id_index` (`organization_id`,`entity_type`,`entity_id`),
  CONSTRAINT `audit_logs_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
INSERT INTO `cache` VALUES ('5c785c036466adea360111aa28563bfd556b5fba','i:1;',1790937170),('5c785c036466adea360111aa28563bfd556b5fba:timer','i:1790937169;',1790937169);
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `call_actions`
--

DROP TABLE IF EXISTS `call_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_actions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `call_id` bigint unsigned DEFAULT NULL,
  `action_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_json` json DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotency_key` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `executed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `call_actions_organization_id_idempotency_key_unique` (`organization_id`,`idempotency_key`),
  KEY `call_actions_call_id_foreign` (`call_id`),
  CONSTRAINT `call_actions_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE SET NULL,
  CONSTRAINT `call_actions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `call_actions`
--

LOCK TABLES `call_actions` WRITE;
/*!40000 ALTER TABLE `call_actions` DISABLE KEYS */;
/*!40000 ALTER TABLE `call_actions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `call_extractions`
--

DROP TABLE IF EXISTS `call_extractions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_extractions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `call_id` bigint unsigned NOT NULL,
  `schema_version` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `call_extractions_organization_id_foreign` (`organization_id`),
  KEY `call_extractions_call_id_created_at_index` (`call_id`,`created_at`),
  CONSTRAINT `call_extractions_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `call_extractions_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `call_extractions`
--

LOCK TABLES `call_extractions` WRITE;
/*!40000 ALTER TABLE `call_extractions` DISABLE KEYS */;
/*!40000 ALTER TABLE `call_extractions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `call_knowledge_uses`
--

DROP TABLE IF EXISTS `call_knowledge_uses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_knowledge_uses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `call_id` bigint unsigned NOT NULL,
  `document_id` bigint unsigned DEFAULT NULL,
  `chunk_id` bigint unsigned DEFAULT NULL,
  `question` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_number` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `call_knowledge_uses_call_id_foreign` (`call_id`),
  KEY `call_knowledge_uses_document_id_foreign` (`document_id`),
  KEY `call_knowledge_uses_chunk_id_foreign` (`chunk_id`),
  KEY `call_knowledge_uses_organization_id_call_id_created_at_index` (`organization_id`,`call_id`,`created_at`),
  CONSTRAINT `call_knowledge_uses_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `call_knowledge_uses_chunk_id_foreign` FOREIGN KEY (`chunk_id`) REFERENCES `knowledge_chunks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `call_knowledge_uses_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `knowledge_documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `call_knowledge_uses_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `call_knowledge_uses`
--

LOCK TABLES `call_knowledge_uses` WRITE;
/*!40000 ALTER TABLE `call_knowledge_uses` DISABLE KEYS */;
/*!40000 ALTER TABLE `call_knowledge_uses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `call_messages`
--

DROP TABLE IF EXISTS `call_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `call_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `call_id` bigint unsigned NOT NULL,
  `speaker` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `spoken_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sequence` int unsigned DEFAULT NULL,
  `start_ms` int unsigned DEFAULT NULL,
  `end_ms` int unsigned DEFAULT NULL,
  `language` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `call_messages_call_id_spoken_at_index` (`call_id`,`spoken_at`),
  CONSTRAINT `call_messages_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `call_messages`
--

LOCK TABLES `call_messages` WRITE;
/*!40000 ALTER TABLE `call_messages` DISABLE KEYS */;
INSERT INTO `call_messages` VALUES (1,4,'ai','Hi there! You’re talking to an AI voice-call prototype, so I can chat','2026-10-01 00:58:27',NULL,NULL,NULL,NULL,NULL),(2,4,'customer','は','2026-10-01 00:58:28',NULL,NULL,NULL,NULL,NULL),(3,4,'ai','Hi! You’re talking to an AI assistant. This is a test conversation, not a real sales call. How can I help you today?','2026-10-01 00:58:30',NULL,NULL,NULL,NULL,NULL),(4,4,'customer','Hello, my name is Anolika Dasgupta, and I am from Keyline Digitech.','2026-10-01 00:58:43',NULL,NULL,NULL,NULL,NULL),(5,4,'ai','Nice to meet you, Alolika. I’m an AI assistant, and this is just a test conversation, not a real sales call. What would you like to talk about today?','2026-10-01 00:58:44',NULL,NULL,NULL,NULL,NULL),(6,4,'customer','I am trying to build a AI voice assistant.','2026-10-01 00:58:56',NULL,NULL,NULL,NULL,NULL),(7,4,'ai','That’s exciting. I’m an AI assistant, and this is a test conversation, not a real sales call. What’s the main thing you want your voice assistant to do first, like answering questions, booking something, or controlling tools?','2026-10-01 00:58:59',NULL,NULL,NULL,NULL,NULL),(8,4,'customer','I want to generate lead.','2026-10-01 00:59:10',NULL,NULL,NULL,NULL,NULL),(9,4,'customer','For my company.','2026-10-01 00:59:12',NULL,NULL,NULL,NULL,NULL),(10,4,'ai','Got it. I’m an AI assistant, and this is a test conversation, not a real sales call. What kind of leads do you want it to generate first—new customers, partners, or something else?','2026-10-01 00:59:14',NULL,NULL,NULL,NULL,NULL),(11,4,'customer','For new customers.','2026-10-01 00:59:25',NULL,NULL,NULL,NULL,NULL),(12,4,'ai','I’m an AI assistant, and this is a test conversation, not a real sales call. For new customers, what’s the first thing you want the assistant to capture—like name and company, or a short description of their needs?','2026-10-01 00:59:27',NULL,NULL,NULL,NULL,NULL),(13,4,'ai','Okay,','2026-10-01 00:59:31',NULL,NULL,NULL,NULL,NULL),(14,4,'customer','啊。','2026-10-01 00:59:32',NULL,NULL,NULL,NULL,NULL),(15,4,'customer','Can you talk in Bengali?','2026-10-01 00:59:35',NULL,NULL,NULL,NULL,NULL),(16,4,'ai','Yes, I can speak in Bengali. I’m an AI assistant, and this is a test conversation, not a real sales call. Would you like to continue in Bengali now?','2026-10-01 00:59:37',NULL,NULL,NULL,NULL,NULL),(17,4,'customer','อ่า','2026-10-01 00:59:46',NULL,NULL,NULL,NULL,NULL),(18,4,'ai','আমি একজন এ','2026-10-01 00:59:47',NULL,NULL,NULL,NULL,NULL),(19,4,'customer','আমি একটি নতুন সফটওয়্যার তৈরি করতে চাইছি।','2026-10-01 00:59:52',NULL,NULL,NULL,NULL,NULL),(20,4,'ai','আমি একজন AI assistant, আর এটা শুধু একটা টেস্ট কথোপকথন, কোনো বাস্তব সেলস কল না। আপনি কী ধরনের সফটওয়্যার বানাতে চান? উদাহরণ হিসেবে বলতে পারেন, গ্রাহক ব্যবস্থাপনা, বিক্রয়, নাকি ভয়েস-ভিত্তিক সাহায্য।','2026-10-01 00:59:55',NULL,NULL,NULL,NULL,NULL),(21,4,'customer','ও হ্যালো, আমি এই কলটি কাটতে চাইছি, তো বাই।','2026-10-01 01:00:15',NULL,NULL,NULL,NULL,NULL),(22,4,'ai','ঠিক আছে, আমি AI assistant, আর এটা শুধু একটা টেস্ট কথোপকথন। কথা বলার জন্য ধন্যবাদ। ভালো থাকবেন, বাই!','2026-10-01 01:00:16',NULL,NULL,NULL,NULL,NULL),(23,4,'system','hello','2026-10-01 01:00:38',NULL,NULL,NULL,NULL,NULL),(24,5,'ai','Hi there! I’m an AI assistant, and this is just a test conversation, not a real sales call. How can I help you today?','2026-10-01 01:27:01',NULL,NULL,NULL,NULL,NULL),(25,5,'customer','Hello, I am Avanika Das Gupta.','2026-10-01 01:27:11',NULL,NULL,NULL,NULL,NULL),(26,5,'ai','Hi Veronica! I’m an AI assistant, and this is a test conversation, not a real sales call.\n\nNice to meet you. What would you like to talk about today?','2026-10-01 01:27:13',NULL,NULL,NULL,NULL,NULL),(27,6,'ai','Hi there! I’m an AI assistant, and this is just a test conversation, not a real sales call. How can I help today?','2026-10-01 01:31:52',NULL,NULL,NULL,NULL,NULL),(28,6,'customer','Hello, my name is Alolika Das Gupta, and I am trying to build an AI voice assistant.','2026-10-01 01:32:08',NULL,NULL,NULL,NULL,NULL),(29,6,'ai','Nice to meet you, Alolika Dasgupta. That sounds like a really fun project. What part of the voice assistant are you working on right now—like the voice interface, the language model, or the conversation flow?','2026-10-01 01:32:10',NULL,NULL,NULL,NULL,NULL),(30,7,'ai','Hi there! I’m Subrata. I’m an AI assistant, and this is just a test conversation, not a real sales call. How can I help you today?','2026-10-01 01:40:31',NULL,NULL,NULL,NULL,NULL),(31,7,'customer','Hi, my name is Aloka Dasgupta. I am from Kilines Digitek Private Limited.','2026-10-01 01:40:45',NULL,NULL,NULL,NULL,NULL),(32,7,'ai','Hi Alarika, nice to meet you. What would you like to talk about today—your company, a project, or something you need help with?','2026-10-01 01:40:47',NULL,NULL,NULL,NULL,NULL),(33,8,'ai','Hi there! I’m Deblina. I’m an AI assistant, and this is just a test conversation, not a real sales call. How can I help you today?','2026-10-01 01:45:47',NULL,NULL,NULL,NULL,NULL),(34,8,'customer','Hello?','2026-10-01 01:45:55',NULL,NULL,NULL,NULL,NULL),(35,8,'ai','Hi! What would you like to talk about today?','2026-10-01 01:45:55',NULL,NULL,NULL,NULL,NULL),(36,8,'customer','Hi, I am Anolika Das Gupta. I want to build an AI voice assistant platform.','2026-10-01 01:46:06',NULL,NULL,NULL,NULL,NULL),(37,8,'ai','That’s exciting, Anolika. I can help you think it through step by step.\n\nTo get started, what’s the main use case for your platform: customer support, personal assistant, or something else?','2026-10-01 01:46:08',NULL,NULL,NULL,NULL,NULL),(38,9,'ai','Hey there, Deblina here. I’m an AI assistant, and this is just a test conversation, not a real sales call. How can I help you today?','2026-10-01 05:58:44',NULL,NULL,NULL,NULL,NULL),(39,9,'ai','Hi Al','2026-10-01 05:58:56',NULL,NULL,NULL,NULL,NULL),(40,9,'customer','Hi, I am Alolika Dasgupta.','2026-10-01 05:58:56',NULL,NULL,NULL,NULL,NULL),(41,9,'customer','I want to build an AI voice assistant.','2026-10-01 05:59:02',NULL,NULL,NULL,NULL,NULL),(42,9,'ai','Nice, that sounds fun. What kind of voice assistant are you imagining—like a helpful personal assistant, a customer service bot, or something more specific?','2026-10-01 05:59:03',NULL,NULL,NULL,NULL,NULL),(43,9,'ai','Awesome idea. I can help you get started. What do you','2026-10-01 05:59:08',NULL,NULL,NULL,NULL,NULL),(44,9,'customer','อ่า','2026-10-01 05:59:08',NULL,NULL,NULL,NULL,NULL),(45,9,'customer','Actually, I am a little busy right now. Can we schedule a meeting on 3rd October 2026 around 5 p.m.?','2026-10-01 05:59:20',NULL,NULL,NULL,NULL,NULL),(46,9,'ai','Got it, that’s a clear request. I can’t actually schedule it on your calendar right now, but I can help you prepare. What time zone should we use for the 5 PM meeting?','2026-10-01 05:59:21',NULL,NULL,NULL,NULL,NULL),(47,9,'customer','А...','2026-10-01 05:59:32',NULL,NULL,NULL,NULL,NULL),(48,9,'ai','No worries—that’s totally normal. I need one detail to help you draft the schedule: what time zone should we use for the 5 PM on October 3, 2026—like','2026-10-01 05:59:33',NULL,NULL,NULL,NULL,NULL),(49,9,'customer','Indian Times Indian Times','2026-10-01 05:59:37',NULL,NULL,NULL,NULL,NULL),(50,9,'ai','Got it, thanks for confirming the time zone—let me think through what comes next.','2026-10-01 05:59:39',NULL,NULL,NULL,NULL,NULL),(51,9,'ai','Awesome, that helps. So now, for your October 3, 2026 meeting at 5:00 PM India time, we can draft a simple calendar title and agenda for you. Would you like me to write a short agenda or just a calendar entry text?','2026-10-01 05:59:40',NULL,NULL,NULL,NULL,NULL),(52,9,'customer','Just a calendar interest.','2026-10-01 06:00:01',NULL,NULL,NULL,NULL,NULL),(53,9,'ai','Perfect, here’s a clean calendar entry text you can copy and paste:\n\n“Meeting – October 3, 2026 at 5:00 PM IST.”\n\nIf you want, I can also suggest a subject line or a short description, like the purpose of the meeting, attendees, or notes.','2026-10-01 06:00:03',NULL,NULL,NULL,NULL,NULL),(54,9,'customer','Yes, you just put...','2026-10-01 06:00:22',NULL,NULL,NULL,NULL,NULL),(55,9,'customer','The note about the...','2026-10-01 06:00:25',NULL,NULL,NULL,NULL,NULL),(56,9,'ai','Sure, I can do that. What’s the note you want included?','2026-10-01 06:00:26',NULL,NULL,NULL,NULL,NULL),(57,9,'customer','About the AI application I was trying to build.','2026-10-01 06:00:35',NULL,NULL,NULL,NULL,NULL),(58,9,'ai','Great, here’s the updated entry text:\n\n“Meeting – October 3, 2026 at 5:00 PM IST.\nNote: Discuss the AI application I’m trying to build.”\n\nIf you want, I can also help you add a few more details, like attendees, a location, or a brief agenda, so it’s fully ready when you paste it into your calendar.','2026-10-01 06:00:37',NULL,NULL,NULL,NULL,NULL),(59,9,'customer','OK.','2026-10-01 06:00:54',NULL,NULL,NULL,NULL,NULL),(60,9,'customer','My colleague Subham and Samanto will be there also.','2026-10-01 06:00:58',NULL,NULL,NULL,NULL,NULL),(61,9,'customer','So you can note that.','2026-10-01 06:00:59',NULL,NULL,NULL,NULL,NULL),(62,9,'ai','Perfect—you can note that in the calendar entry like this:\n\n“Meeting – October 3, 2026 at 5:00 PM IST.\nNote: Discuss the AI application I’m trying to build.\nAttendee: Shubham Samonta.”\n\nThat should make it clear and ready to add to your calendar.','2026-10-01 06:01:01',NULL,NULL,NULL,NULL,NULL),(63,9,'customer','Okay, thank you. Bye.','2026-10-01 06:01:20',NULL,NULL,NULL,NULL,NULL),(64,10,'ai','Hi there! I’m Deblina, I’m an AI assistant, and this is just a test conversation, not a real sales call. How can I help you today?','2026-10-01 07:00:16',NULL,NULL,NULL,NULL,NULL),(65,10,'customer','Hello, I am Alojika Das Gupta.','2026-10-01 07:00:28',NULL,NULL,NULL,NULL,NULL),(66,10,'customer','So, can you schedule a meeting on 3rd October 2016?','2026-10-01 07:00:33',NULL,NULL,NULL,NULL,NULL),(67,10,'customer','On 5 p.m.','2026-10-01 07:00:35',NULL,NULL,NULL,NULL,NULL),(68,10,'customer','Regarding my new project,','2026-10-01 07:00:39',NULL,NULL,NULL,NULL,NULL),(69,10,'customer','which is an AI voice assistant development.','2026-10-01 07:00:43',NULL,NULL,NULL,NULL,NULL),(70,10,'ai','Got it, thanks for sharing—let me get one thing clear before scheduling. Is that 5 PM in your local time zone? If yes, I’ll put it on 3 October 2016 at 5:00 PM for the AI voice assistant development discussion. Once we confirm the time zone, it will appear in your workspace Calendar.','2026-10-01 07:00:45',NULL,NULL,NULL,NULL,NULL),(71,10,'customer','Yes, it is IST, Indian Time Zone.','2026-10-01 07:00:54',NULL,NULL,NULL,NULL,NULL),(72,10,'ai','Perfect, let’s confirm: October 3, 2016 at 5 PM, Indian Standard Time. Before I put it on the calendar, what duration would you like for the meeting?','2026-10-01 07:00:55',NULL,NULL,NULL,NULL,NULL),(73,10,'customer','Around thirty minutes.','2026-10-01 07:01:08',NULL,NULL,NULL,NULL,NULL),(74,10,'ai','Great, so we’ll schedule a 30-minute meeting on October 3, 2016 at 5:00 PM India time about your new project. The schedule will appear in your workspace Calendar once those details are confirmed. If there’s anything else you’d like to add—like participants or a title—just let me know!','2026-10-01 07:01:10',NULL,NULL,NULL,NULL,NULL),(75,13,'ai','Hey there! I’m Deblina, an AI assistant, and this is just a test conversation, not a real sales call. How can I help you today?','2026-10-01 07:15:57',NULL,NULL,NULL,NULL,NULL),(76,13,'customer','Hi, I am Alolika Dasgupta. Can you schedule a meeting on 3rd October 2026 around 5 p.m.?','2026-10-01 07:16:18',NULL,NULL,NULL,NULL,NULL),(77,13,'customer','And this is about the new project we are developing.','2026-10-01 07:16:22',NULL,NULL,NULL,NULL,NULL),(78,13,'customer','AI voice assistant.','2026-10-01 07:16:25',NULL,NULL,NULL,NULL,NULL),(79,13,'ai','Sounds good, Alolika. I can schedule that. Before it goes in the workspace Calendar, what time zone should I use for “around 5 PM” on October 3rd, 2026?','2026-10-01 07:16:26',NULL,NULL,NULL,NULL,NULL),(80,13,'customer','Indian Standard Time, IST.','2026-10-01 07:16:35',NULL,NULL,NULL,NULL,NULL),(81,13,'ai','Great, thanks. Just to confirm, is the meeting set for 3rd October 2026 at 5:00 PM Indian Standard Time?','2026-10-01 07:16:37',NULL,NULL,NULL,NULL,NULL),(82,13,'ai','Perfect, Indian Standard Time, IST. Before I lock it in, is 5:00 PM IST the exact time you want, around 5 PM, or should it be something like a window? Once you confirm, the meeting will appear in your workspace Calendar.','2026-10-01 07:16:41',NULL,NULL,NULL,NULL,NULL),(83,13,'customer','Put it 5 p.m.','2026-10-01 07:16:57',NULL,NULL,NULL,NULL,NULL),(84,13,'ai','Got it, you’d like it at 5:00 PM IST on the 3rd of October, 2026. That’s the meeting time. Once those details are clear, it will be added to your workspace Calendar.','2026-10-01 07:16:58',NULL,NULL,NULL,NULL,NULL),(85,14,'ai','Hello there! I’m Subrata, an AI assistant, and this is just a test conversation, not a real sales call. How can I help today?','2026-10-01 07:18:17',NULL,NULL,NULL,NULL,NULL),(86,14,'customer','Hi, I\'m Anolika Das Gupta. Can you schedule an interview call on 4th October around 10 a.m.?','2026-10-01 07:18:35',NULL,NULL,NULL,NULL,NULL),(87,14,'ai','Sure, let me clarify the timing and zone so we can get this scheduled.','2026-10-01 07:18:36',NULL,NULL,NULL,NULL,NULL),(88,14,'ai','I can set that up. Just to confirm, you want an interview call on October 4th at 10:00 AM. What time zone should I use for that time?','2026-10-01 07:18:37',NULL,NULL,NULL,NULL,NULL),(89,14,'customer','Indian Standard Time','2026-10-01 07:18:50',NULL,NULL,NULL,NULL,NULL),(90,14,'ai','Got it, 10:00 AM on October 4th in Indian Standard Time. Just to be crystal clear, is 10:00 AM the exact time, not a window like 10 to 10:30? Once that’s confirmed, the schedule will appear in your workspace Calendar.','2026-10-01 07:18:52',NULL,NULL,NULL,NULL,NULL),(91,14,'customer','Yes, it\'s exact same.','2026-10-01 07:19:02',NULL,NULL,NULL,NULL,NULL),(92,14,'ai','Perfect, 10:00 AM on October 4th in Indian Standard Time is confirmed. The interview call will be scheduled, and you’ll see it in the workspace Calendar once everything is clear. Anything else you’d like to add, like the meeting title or who’s attending?','2026-10-01 07:19:04',NULL,NULL,NULL,NULL,NULL),(93,14,'customer','It\'s 10 a.m.','2026-10-01 07:19:08',NULL,NULL,NULL,NULL,NULL),(94,14,'ai','Got it, 10:00 AM exactly, in Indian Standard Time. That’s confirmed. Once everything is set, the interview call will appear in the workspace Calendar. Anything else you’d like to add?','2026-10-01 07:19:10',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `call_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calls`
--

DROP TABLE IF EXISTS `calls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calls` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` bigint unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `outcome` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assistant_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Deblina',
  `destination_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Asia/Kolkata',
  `organization_id` bigint unsigned DEFAULT NULL,
  `contact_id` bigint unsigned DEFAULT NULL,
  `ai_agent_id` bigint unsigned DEFAULT NULL,
  `direction` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'browser_test',
  `provider` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_call_id` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_id` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agent_version` int unsigned DEFAULT NULL,
  `workflow_version` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `language` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answered_at` datetime DEFAULT NULL,
  `duration_seconds` int unsigned DEFAULT NULL,
  `failure_code` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cost_amount` decimal(12,4) DEFAULT NULL,
  `cost_currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `calls_lead_id_index` (`lead_id`),
  CONSTRAINT `calls_lead_id_foreign` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calls`
--

LOCK TABLES `calls` WRITE;
/*!40000 ALTER TABLE `calls` DISABLE KEYS */;
INSERT INTO `calls` VALUES (1,1,'failed','connection_error','Browser test call ended without a transcript.',NULL,'2026-10-01 00:39:54','2026-10-01 00:39:52','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(2,2,'failed','connection_error','Browser test call ended without a transcript.',NULL,'2026-10-01 00:48:45','2026-10-01 00:48:42','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,3,'failed','connection_error','Browser test call ended without a transcript.',NULL,'2026-10-01 00:56:24','2026-10-01 00:56:22','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(4,4,'completed','browser_test','Browser test call with 22 transcript messages.','2026-10-01 00:58:26','2026-10-01 01:00:46','2026-10-01 00:58:21','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,5,'completed','browser_test','Browser test call with 3 transcript messages.','2026-10-01 01:26:59','2026-10-01 01:27:22','2026-10-01 01:26:55','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(6,6,'completed','browser_test','Browser test call with 3 transcript messages.','2026-10-01 01:31:51','2026-10-01 01:32:15','2026-10-01 01:31:46','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(7,7,'completed','browser_test','Browser test call with 3 transcript messages.','2026-10-01 01:40:29','2026-10-01 01:40:50','2026-10-01 01:40:25','Subrata',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(8,8,'completed','browser_test','Browser test call with 5 transcript messages.','2026-10-01 01:45:45','2026-10-01 01:46:11','2026-10-01 01:45:41','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,11,'completed','browser_test','Browser test call with 26 transcript messages.','2026-10-01 05:58:42','2026-10-01 06:01:20','2026-10-01 05:58:37','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(10,12,'completed','browser_test','Browser test call with 11 transcript messages.','2026-10-01 07:00:15','2026-10-01 07:01:19','2026-10-01 07:00:11','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(13,15,'completed','browser_test','Browser test call with 10 transcript messages.','2026-10-01 07:15:55','2026-10-01 07:17:12','2026-10-01 07:15:51','Deblina',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(14,16,'completed','browser_test','Browser test call with 10 transcript messages.','2026-10-01 07:18:16','2026-10-01 07:19:18','2026-10-01 07:18:12','Subrata',NULL,'Asia/Kolkata',NULL,NULL,NULL,'browser_test',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `calls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `legacy_lead_id` bigint unsigned DEFAULT NULL,
  `type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lead',
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alternative_phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `language` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consent_status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `dnc` tinyint(1) NOT NULL DEFAULT '0',
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contacts_legacy_lead_id_unique` (`legacy_lead_id`),
  KEY `contacts_organization_id_phone_index` (`organization_id`,`phone`),
  CONSTRAINT `contacts_legacy_lead_id_foreign` FOREIGN KEY (`legacy_lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contacts_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
INSERT INTO `contacts` VALUES (1,1,1,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 00:39:52','2026-10-01 00:39:52'),(2,1,2,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 00:48:42','2026-10-01 00:48:42'),(3,1,3,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 00:56:22','2026-10-01 00:56:22'),(4,1,4,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 00:58:21','2026-10-01 00:58:21'),(5,1,5,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 01:26:55','2026-10-01 01:26:55'),(6,1,6,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 01:31:46','2026-10-01 01:31:46'),(7,1,7,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 01:40:25','2026-10-01 01:40:25'),(8,1,8,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 01:45:41','2026-10-01 01:45:41'),(9,1,9,'lead','Subrata Kundu','9874274616','8887778778','alolika@keylines.in','Keyline Digitech Pvt Ltd',NULL,NULL,'unknown',0,'{\"call_topics\": \"Test lead generation\"}','2026-10-01 03:53:38','2026-10-01 03:53:38'),(10,1,10,'lead','Subhomoy','6289339520','8887778787','subhomoy@keylines.in','Test Company',NULL,NULL,'unknown',0,'{\"call_topics\": \"Lead test 2\"}','2026-10-01 03:56:33','2026-10-01 03:56:33'),(11,1,11,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 05:58:37','2026-10-01 05:58:37'),(12,1,12,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 07:00:11','2026-10-01 07:00:11'),(13,1,15,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 07:15:51','2026-10-01 07:15:51'),(14,1,16,'lead','Laptop test lead',NULL,NULL,NULL,NULL,NULL,NULL,'unknown',0,NULL,'2026-10-01 07:18:12','2026-10-01 07:18:12');
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `knowledge_chunks`
--

DROP TABLE IF EXISTS `knowledge_chunks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knowledge_chunks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `document_id` bigint unsigned NOT NULL,
  `chunk_number` int unsigned NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_number` int unsigned DEFAULT NULL,
  `section` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `search_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `knowledge_chunks_document_id_chunk_number_unique` (`document_id`,`chunk_number`),
  KEY `knowledge_chunks_organization_id_document_id_index` (`organization_id`,`document_id`),
  CONSTRAINT `knowledge_chunks_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `knowledge_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `knowledge_chunks_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `knowledge_chunks`
--

LOCK TABLES `knowledge_chunks` WRITE;
/*!40000 ALTER TABLE `knowledge_chunks` DISABLE KEYS */;
/*!40000 ALTER TABLE `knowledge_chunks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `knowledge_documents`
--

DROP TABLE IF EXISTS `knowledge_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knowledge_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint unsigned NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `knowledge_documents_uploaded_by_foreign` (`uploaded_by`),
  KEY `knowledge_documents_organization_id_status_index` (`organization_id`,`status`),
  KEY `knowledge_documents_organization_id_checksum_index` (`organization_id`,`checksum`),
  CONSTRAINT `knowledge_documents_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `knowledge_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `knowledge_documents`
--

LOCK TABLES `knowledge_documents` WRITE;
/*!40000 ALTER TABLE `knowledge_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `knowledge_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `alternative_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_name` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `call_topics` text COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES (1,'Laptop test lead','browser','2026-10-01 00:39:52',NULL,NULL,NULL,NULL,NULL,NULL),(2,'Laptop test lead','browser','2026-10-01 00:48:42',NULL,NULL,NULL,NULL,NULL,NULL),(3,'Laptop test lead','browser','2026-10-01 00:56:22',NULL,NULL,NULL,NULL,NULL,NULL),(4,'Laptop test lead','browser','2026-10-01 00:58:21',NULL,NULL,NULL,NULL,NULL,NULL),(5,'Laptop test lead','browser','2026-10-01 01:26:55',NULL,NULL,NULL,NULL,NULL,NULL),(6,'Laptop test lead','browser','2026-10-01 01:31:46',NULL,NULL,NULL,NULL,NULL,NULL),(7,'Laptop test lead','browser','2026-10-01 01:40:25',NULL,NULL,NULL,NULL,NULL,NULL),(8,'Laptop test lead','browser','2026-10-01 01:45:41',NULL,NULL,NULL,NULL,NULL,NULL),(9,'Subrata Kundu','9874274616','2026-10-01 03:53:38','8887778778','alolika@keylines.in','Keyline Digitech Pvt Ltd','Test lead generation','2026-10-01 03:53:38',NULL),(10,'Subhomoy','6289339520','2026-10-01 03:56:33','8887778787','subhomoy@keylines.in','Test Company','Lead test 2','2026-10-01 03:56:33',NULL),(11,'Laptop test lead','browser','2026-10-01 05:58:37',NULL,NULL,NULL,NULL,NULL,NULL),(12,'Laptop test lead','browser','2026-10-01 07:00:11',NULL,NULL,NULL,NULL,NULL,NULL),(15,'Laptop test lead','browser','2026-10-01 07:15:51',NULL,NULL,NULL,NULL,NULL,NULL),(16,'Laptop test lead','browser','2026-10-01 07:18:12',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `local_call_schedule_items`
--

DROP TABLE IF EXISTS `local_call_schedule_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `local_call_schedule_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `schedule_id` bigint unsigned NOT NULL,
  `contact_id` bigint unsigned NOT NULL,
  `call_id` bigint unsigned DEFAULT NULL,
  `position` int unsigned NOT NULL,
  `topic` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `local_call_schedule_items_schedule_id_contact_id_unique` (`schedule_id`,`contact_id`),
  UNIQUE KEY `local_call_schedule_items_schedule_id_position_unique` (`schedule_id`,`position`),
  KEY `local_call_schedule_items_contact_id_foreign` (`contact_id`),
  KEY `local_call_schedule_items_call_id_foreign` (`call_id`),
  CONSTRAINT `local_call_schedule_items_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE SET NULL,
  CONSTRAINT `local_call_schedule_items_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `local_call_schedule_items_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `local_call_schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `local_call_schedule_items`
--

LOCK TABLES `local_call_schedule_items` WRITE;
/*!40000 ALTER TABLE `local_call_schedule_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `local_call_schedule_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `local_call_schedules`
--

DROP TABLE IF EXISTS `local_call_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `local_call_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `title` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assistant_name` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_at` datetime NOT NULL,
  `timezone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `local_call_schedules_organization_id_starts_at_index` (`organization_id`,`starts_at`),
  CONSTRAINT `local_call_schedules_organization_id_foreign` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `local_call_schedules`
--

LOCK TABLES `local_call_schedules` WRITE;
/*!40000 ALTER TABLE `local_call_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `local_call_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_09_30_000000_create_call_record_tables',1),(5,'2026_10_01_000001_add_assistant_name_to_calls_table',1),(6,'2026_10_01_000002_create_admin_auth_tables',2),(7,'2026_10_01_000003_add_business_details_to_leads',3),(8,'2026_10_01_000004_create_schedule_events_table',4),(9,'2026_10_01_000005_add_timezone_to_calls',5),(10,'2026_10_02_000006_create_workspace_settings_table',6),(11,'2026_10_05_000001_create_knowledge_tables',7);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `industry` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Asia/Kolkata',
  `country` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `settings_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizations`
--

LOCK TABLES `organizations` WRITE;
/*!40000 ALTER TABLE `organizations` DISABLE KEYS */;
INSERT INTO `organizations` VALUES (1,'Default organization',NULL,'Asia/Kolkata',NULL,'active',NULL,'2026-10-03 01:40:57','2026-10-03 01:40:57');
/*!40000 ALTER TABLE `organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_event_history`
--

DROP TABLE IF EXISTS `schedule_event_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_event_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `schedule_event_id` bigint unsigned NOT NULL,
  `action` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `actor_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned DEFAULT NULL,
  `call_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `schedule_event_history_schedule_event_id_foreign` (`schedule_event_id`),
  KEY `schedule_event_history_call_id_foreign` (`call_id`),
  CONSTRAINT `schedule_event_history_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedule_event_history_schedule_event_id_foreign` FOREIGN KEY (`schedule_event_id`) REFERENCES `schedule_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_event_history`
--

LOCK TABLES `schedule_event_history` WRITE;
/*!40000 ALTER TABLE `schedule_event_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_event_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_event_participants`
--

DROP TABLE IF EXISTS `schedule_event_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_event_participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `schedule_event_id` bigint unsigned NOT NULL,
  `participant_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_id` bigint unsigned DEFAULT NULL,
  `name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `response_status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedule_event_participants_schedule_event_id_foreign` (`schedule_event_id`),
  KEY `schedule_event_participants_contact_id_foreign` (`contact_id`),
  CONSTRAINT `schedule_event_participants_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedule_event_participants_schedule_event_id_foreign` FOREIGN KEY (`schedule_event_id`) REFERENCES `schedule_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_event_participants`
--

LOCK TABLES `schedule_event_participants` WRITE;
/*!40000 ALTER TABLE `schedule_event_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_event_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_events`
--

DROP TABLE IF EXISTS `schedule_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `call_id` bigint unsigned NOT NULL,
  `event_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `starts_at` datetime NOT NULL,
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `contact_id` bigint unsigned DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  `location_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_user_id` bigint unsigned DEFAULT NULL,
  `external_provider` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_event_id` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ai_call',
  `created_by_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedule_events_call_id_foreign` (`call_id`),
  KEY `schedule_events_starts_at_index` (`starts_at`),
  CONSTRAINT `schedule_events_call_id_foreign` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_events`
--

LOCK TABLES `schedule_events` WRITE;
/*!40000 ALTER TABLE `schedule_events` DISABLE KEYS */;
INSERT INTO `schedule_events` VALUES (1,9,'meeting','Meeting with Alolika Dasgupta','Note: Discuss the AI application I’m trying to build.\nAttendee: Shubham Samanta.','2026-10-03 11:30:00','Asia/Kolkata','2026-10-01 06:07:07','2026-10-01 06:49:39',NULL,NULL,NULL,'confirmed',NULL,NULL,NULL,NULL,NULL,'ai_call',NULL,NULL),(2,10,'meeting','Meeting with Alojika Das Gupta','Discuss AI voice assistant development. Verify year: the transcript said 2016; 2026 was inferred from the upcoming date','2026-10-03 11:30:00','Asia/Kolkata','2026-10-01 07:06:08','2026-10-01 07:06:08',NULL,NULL,NULL,'confirmed',NULL,NULL,NULL,NULL,NULL,'ai_call',NULL,NULL),(3,13,'meeting','Meeting about the new AI voice assistant project','Discussion regarding the new project development.','2026-10-03 11:30:00','Asia/Kolkata','2026-10-01 07:16:20','2026-10-01 07:17:14',NULL,NULL,NULL,'confirmed',NULL,NULL,NULL,NULL,NULL,'ai_call',NULL,NULL),(4,14,'interview','Interview Call','Scheduled interview call with Anolika Das Gupta.','2026-10-04 04:30:00','Asia/Kolkata','2026-10-01 07:18:38','2026-10-01 07:19:20',NULL,NULL,NULL,'confirmed',NULL,NULL,NULL,NULL,NULL,'ai_call',NULL,NULL);
/*!40000 ALTER TABLE `schedule_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workspace_settings`
--

DROP TABLE IF EXISTS `workspace_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workspace_settings` (
  `id` int unsigned NOT NULL,
  `preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `workspace_settings_chk_1` CHECK (json_valid(`preferences`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workspace_settings`
--

LOCK TABLES `workspace_settings` WRITE;
/*!40000 ALTER TABLE `workspace_settings` DISABLE KEYS */;
INSERT INTO `workspace_settings` VALUES (1,'{\"business_name\":\"\",\"contact_email\":\"\",\"contact_phone\":\"\",\"logo_url\":\"\",\"default_assistant\":\"deblina\",\"language\":\"English\",\"greeting\":\"Hello! How can I help you today?\",\"instructions\":\"\",\"timezone\":\"Asia\\/Kolkata\",\"business_hours_enabled\":false,\"business_start\":\"09:00\",\"business_end\":\"18:00\",\"max_call_minutes\":10,\"callback_preferences\":\"\",\"business_days\":[1,2,3,4,5]}','2026-10-02 05:27:03','2026-10-02 05:27:03',NULL);
/*!40000 ALTER TABLE `workspace_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'ai_calling_prod'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-08 17:48:28
