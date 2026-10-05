<?php

return [
    'disk' => env('KNOWLEDGE_DISK', 'local'),
    'max_upload_kb' => (int) env('KNOWLEDGE_MAX_UPLOAD_KB', 10240),
    'allowed_extensions' => ['pdf', 'docx', 'txt'],
    'max_pdf_pages' => (int) env('KNOWLEDGE_MAX_PDF_PAGES', 200),
    'max_extracted_characters' => (int) env('KNOWLEDGE_MAX_EXTRACTED_CHARACTERS', 500000),
    'service_url' => env('AI_SERVICE_URL', 'http://127.0.0.1:8001'),
    'service_token' => env('KNOWLEDGE_SERVICE_TOKEN'),
];
