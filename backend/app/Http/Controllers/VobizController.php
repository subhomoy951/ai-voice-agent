<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class VobizController extends Controller
{
    public function answer(Request $request): Response
    {
        $this->verifyCallback($request, 'answer');

        return response(
            '<?xml version="1.0" encoding="UTF-8"?>'.
            '<Response><Speak voice="WOMAN" language="en-US">'.
            'Hello. Welcome to Keylines AI Voice Assistant. We are testing our incoming call service.'.
            '</Speak></Response>',
            200,
            ['Content-Type' => 'application/xml']
        );
    }

    public function hangup(Request $request): JsonResponse
    {
        $this->verifyCallback($request, 'hangup');

        return response()->json(['ok' => true]);
    }

    private function verifyCallback(Request $request, string $endpoint): void
    {
        if (! config('services.vobiz.verify_signatures')) {
            Log::warning('Vobiz callback accepted without authentication.', ['endpoint' => $endpoint]);

            return;
        }

        $token = config('services.vobiz.auth_token');
        $baseUrl = rtrim((string) config('services.vobiz.webhook_base_url'), '/');
        if (! is_string($token) || $token === '' || ! filter_var($baseUrl, FILTER_VALIDATE_URL)
            || parse_url($baseUrl, PHP_URL_SCHEME) !== 'https'
            || parse_url($baseUrl, PHP_URL_QUERY) !== null
            || parse_url($baseUrl, PHP_URL_FRAGMENT) !== null
            || parse_url($baseUrl, PHP_URL_USER) !== null) {
            Log::error('Vobiz signing configuration is missing or invalid.', ['endpoint' => $endpoint]);
            abort(503, 'Vobiz signing is not configured.');
        }

        // V3 signs the public URL without query parameters, plus a nonce; not the body.
        // Configured URLs avoid relying on reverse proxy scheme/host headers.
        $nonce = $request->header('X-Vobiz-Signature-V3-Nonce', '');
        $signature = $request->header('X-Vobiz-Signature-V3', '');
        $expected = base64_encode(hash_hmac('sha256', $baseUrl.'/'.$endpoint.'.'.$nonce, $token, true));
        if (! preg_match('/\A[0-9]{20}\z/', $nonce) || ! hash_equals($expected, $signature)) {
            Log::warning('Vobiz callback signature rejected.', ['endpoint' => $endpoint]);
            abort(403, 'Invalid Vobiz signature.');
        }

        Log::info('Vobiz callback signature verified.', ['endpoint' => $endpoint]);
    }
}
