<?php

// Upload backend beside (outside) the domain's public web root.
// Example: /home/account/backend and /home/account/public_html/api.php.
$configuredPath = getenv('LARAVEL_BACKEND_PATH');
$candidates = $configuredPath ? [$configuredPath] : [
    dirname(__DIR__).'/backend',
    __DIR__.'/admin/backend',
    __DIR__.'/backend',
];
$backendPath = null;
foreach ($candidates as $candidate) {
    if (is_file($candidate.'/public/index.php')) {
        $backendPath = $candidate;
        break;
    }
}

if ($backendPath === null || ! is_file($backendPath.'/vendor/autoload.php')) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['message' => $backendPath === null
        ? 'Laravel backend folder was not found. Upload backend outside the web root or to admin/backend, or set LARAVEL_BACKEND_PATH in the hosting server environment.'
        : 'Laravel backend was found, but backend/vendor/autoload.php is missing. Run composer install --no-dev --optimize-autoloader in the backend folder or upload its vendor directory.']);
    exit;
}

require $backendPath.'/public/index.php';
