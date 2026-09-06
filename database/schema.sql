-- Student registration — the one table the system needs.
--
--   mysql -u root -p < database/schema.sql
--
-- Safe to re-run: nothing here drops or overwrites existing data.

CREATE DATABASE IF NOT EXISTS `hira_registration`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `hira_registration`;

CREATE TABLE IF NOT EXISTS `applications` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- What the applicant is told to quote. Unique so it can never be reused;
    -- the index is what actually guarantees that, not the code that builds it.
    `application_no` VARCHAR(20)  NOT NULL,

    `full_name`      VARCHAR(150) NOT NULL,
    `father_name`    VARCHAR(150) NOT NULL,
    `dob`            DATE         NOT NULL,
    `gender`         ENUM('Male','Female') NOT NULL,

    `mobile`         VARCHAR(20)  NOT NULL COMMENT 'digits only, e.g. 03001234567',
    `whatsapp`       VARCHAR(20)      NULL,
    `email`          VARCHAR(150)     NULL,
    `address`        VARCHAR(300) NOT NULL,

    `qualification`  VARCHAR(120) NOT NULL,

    -- The three courses on offer. A fixed list rather than free text: the
    -- dashboard counts by it, so a typo must not create a fourth course.
    `course`         ENUM('DIT','Web Development','Pharmacy') NOT NULL,

    `knowledge`      VARCHAR(60)      NULL COMMENT 'None | Basic | Intermediate | Advanced',
    `message`        VARCHAR(800)     NULL,

    -- Just the file name. The file itself lives outside the web root and is
    -- only ever served through the API, after the passphrase has been checked.
    `photo_file`     VARCHAR(80)      NULL,

    `status`         ENUM('New','Contacted','Approved','Rejected') NOT NULL DEFAULT 'New',
    `note`           VARCHAR(500)     NULL COMMENT 'office remarks, never shown to the applicant',

    -- Kept for abuse investigation only, never displayed on a public page.
    `source_ip`      VARCHAR(45)      NULL,

    `submitted_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_applications_no` (`application_no`),
    KEY `idx_applications_course` (`course`),
    KEY `idx_applications_status` (`status`),
    KEY `idx_applications_mobile` (`mobile`),
    KEY `idx_applications_submitted` (`submitted_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
