<?php

// Upload backend beside (outside) the domain's public web root.
// Example: /home/account/backend and /home/account/public_html/api.php.
$backendPath = getenv('LARAVEL_BACKEND_PATH') ?: dirname(__DIR__).'/backend';

if (! is_file($backendPath.'/vendor/autoload.php') || ! is_file($backendPath.'/public/index.php')) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Laravel is not deployed. Upload the backend with Composer dependencies outside the web root and configure LARAVEL_BACKEND_PATH if needed.']);
    exit;
}

require $backendPath.'/public/index.php';
