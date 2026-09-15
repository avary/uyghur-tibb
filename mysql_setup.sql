-- =========================================================================
-- «ئۇيغۇر تېبابىتى مائارىپ سۇپىسى» — MySQL ساندان لايىھەسى
-- بۇنى مۇساپىر MySQL ساندانىڭىزدا ئىجرا قىلىڭ (ئىشلەتكۈچىدە CREATE / ALTER ھوقۇقى بولسۇن).
-- Supabase / PostgreSQL ئورنىغا MySQL گە كۆچۈرۈلدى.
-- =========================================================================

-- ساندان (ئورنىتىلغان بولسا، ئەسلىگە قايتۇرۇش ئۈچۈن: DROP DATABASE IF EXISTS uyghur_tibb;)
CREATE DATABASE IF NOT EXISTS uyghur_tibb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE uyghur_tibb;

-- 1. ئوقۇغۇچىلار (Students & Approvals)
CREATE TABLE IF NOT EXISTS students (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' / 'approved' / 'blocked'
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT NULL,
    UNIQUE KEY uq_students_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. سوئال-جاۋاب ۋە ئوقۇغۇچى پىكىرلىرى (Q&A & Feedback)
CREATE TABLE IF NOT EXISTS feedback (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(200) NOT NULL,
    student_phone VARCHAR(40) NULL,
    question TEXT NOT NULL,
    reply TEXT NULL,
    reply_at TIMESTAMP NULL,
    replied_by VARCHAR(200) NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_feedback_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. باشقۇرغۇچى ھېساباتلىرى (Admin Accounts)
-- ئەسكەرتىش: پارول ئەمدى مۇلازىمەت تەرەپ (api/students.js) تەرىپىدىن ADMIN_PASSWORD
-- مۇھىت ئۆزگەرگۈچىسى ئارقىلىق تەكشۈرۈلىدۇ؛ ئوچۇق پارول بۇ يەرگە يېزىلمايدۇ.
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NULL, -- بار بولغان ھېساباتلار ئۈچۈن؛ يېڭى تەكشۈرۈش مۇھىت ئۆزگەرگۈچىسى ئارقىلىق
    role VARCHAR(20) NOT NULL DEFAULT 'teacher', -- 'super' / 'teacher'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. دەرسلىك ۋە PDF كىتابلار (Lessons & PDFs)
CREATE TABLE IF NOT EXISTS lessons (
    id INT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300) NULL,
    short_title VARCHAR(120) NULL,
    description TEXT NULL,
    pdf_url TEXT NULL,
    pdf_title VARCHAR(200) NULL,
    data JSON NULL, -- پۈتۈن دەرس بۆلەكلىرى ۋە سوئاللىرى
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4b. Structured recipe library (source-linked, review-gated)
CREATE TABLE IF NOT EXISTS recipe_books (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    subtitle VARCHAR(500) NULL,
    source_year SMALLINT NULL,
    language VARCHAR(12) NOT NULL DEFAULT 'ug',
    pdf_url TEXT NULL,
    total_pages INT NULL,
    copyright_status VARCHAR(40) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS recipes (
    id VARCHAR(100) PRIMARY KEY,
    book_id VARCHAR(80) NOT NULL,
    category VARCHAR(300) NULL,
    disease_name VARCHAR(300) NOT NULL,
    recipe_number VARCHAR(30) NULL,
    original_text LONGTEXT NOT NULL,
    cleaned_text LONGTEXT NULL,
    source_page_start INT NULL,
    source_page_end INT NULL,
    ocr_confidence DECIMAL(4,3) NULL,
    review_status VARCHAR(30) NOT NULL DEFAULT 'needs_review',
    safety_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed',
    reviewer VARCHAR(200) NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_recipe_book (book_id), KEY idx_recipe_category (category),
    KEY idx_recipe_status (review_status),
    CONSTRAINT fk_recipe_book FOREIGN KEY (book_id) REFERENCES recipe_books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recipe_id VARCHAR(100) NOT NULL, name VARCHAR(300) NOT NULL, quantity VARCHAR(120) NULL,
    unit VARCHAR(80) NULL, preparation_note VARCHAR(500) NULL,
    KEY idx_ingredient_recipe (recipe_id),
    CONSTRAINT fk_ingredient_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS recipe_review_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, recipe_id VARCHAR(100) NOT NULL,
    review_status VARCHAR(30) NOT NULL, safety_status VARCHAR(30) NOT NULL,
    reviewer VARCHAR(200) NULL, note TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_review_recipe (recipe_id), CONSTRAINT fk_review_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4c. خام دورىلار قامۇسى (source-separated herb identification books)
CREATE TABLE IF NOT EXISTS herb_books (
    id VARCHAR(80) PRIMARY KEY, title VARCHAR(300) NOT NULL, subtitle VARCHAR(500) NULL,
    language VARCHAR(12) NOT NULL DEFAULT 'ug', total_pages INT NULL,
    copyright_status VARCHAR(40) NOT NULL DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS herbs (
    id VARCHAR(120) PRIMARY KEY, book_id VARCHAR(80) NOT NULL, name VARCHAR(300) NOT NULL,
    aliases JSON NULL, latin_name VARCHAR(300) NULL, used_part VARCHAR(300) NULL,
    properties TEXT NULL, preparation TEXT NULL, warnings TEXT NULL, image_url TEXT NULL,
    original_text LONGTEXT NOT NULL, source_page_start INT NULL, source_page_end INT NULL,
    review_status VARCHAR(30) NOT NULL DEFAULT 'needs_review', safety_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed', reviewer VARCHAR(200) NULL,
    reviewed_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_herb_book (book_id), KEY idx_herb_name (name), KEY idx_herb_status (review_status),
    CONSTRAINT fk_herb_book FOREIGN KEY (book_id) REFERENCES herb_books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS recipe_herbs (
    recipe_id VARCHAR(100) NOT NULL, herb_id VARCHAR(120) NOT NULL, match_type VARCHAR(30) NOT NULL DEFAULT 'expert',
    reviewer VARCHAR(200) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recipe_id, herb_id), CONSTRAINT fk_recipe_herb_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_herb_herb FOREIGN KEY (herb_id) REFERENCES herbs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS herb_review_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, herb_id VARCHAR(120) NOT NULL,
    review_status VARCHAR(30) NOT NULL, safety_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed', reviewer VARCHAR(200) NULL, note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY idx_herb_review (herb_id),
    CONSTRAINT fk_herb_review_herb FOREIGN KEY (herb_id) REFERENCES herbs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ئىمتىھان ۋە سىناق خاتىرىلىرى (Exams)
CREATE TABLE IF NOT EXISTS exam_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_phone VARCHAR(40) NULL,
    scope VARCHAR(200) NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    duration_seconds INT NULL,
    passed TINYINT(1) NOT NULL DEFAULT 0,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_exam_phone (student_phone),
    CONSTRAINT fk_exam_student FOREIGN KEY (student_phone)
        REFERENCES students(phone) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ئىجازەت ئەسكەرتىشى:
-- * MySQL دا PostgreSQL نىڭ RLS چۈشەنچىسى يوق — مۇھىم قوغداش مۇلازىمەت تەرەپتا ئېلىپ بېرىلىدۇ.
-- * ساندانغا بولىدىغان ھەممە يول api/* .js (Node serverless) غا مەركەزلىك بولۇپ،
--   تۆۋەندىكى ئەڭ تۆۋەن ئىجازەتلىك Advocate ھېسابات ساندان ئىشلىتىشى كېرەك:
--     SELECT / INSERT / UPDATE / DELETE پەقەت ئېھتىياجلىق جەدۋەللەر ئۈچۈن
--   (تولۇق GRANT تەڭشىكى تۆۋەندە كۆرسىتىلدى):
GRANT SELECT, INSERT, UPDATE, DELETE ON uyghur_tibb.* TO 'uyghur_tibb_app'@'%';
-- ئەسكەرتىش: 'uyghur_tibb_app' ئىشلەتكۈچىسىنى ئالدىن قۇرۇڭ (كۈچلۈك پارول بىلەن) --
--   CREATE USER 'uyghur_tibb_app'@'%' IDENTIFIED BY '<kuchluk-parol>';
-- بۇ GRANT ئىجرا قىلىش ئۈچۈن SUPER/GRANT OPTION ھوقۇقى تەلەپ بولىدۇ؛ بولمىسا ئۆتكۈزۈۋېتىڭ.
