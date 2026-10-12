<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class VobizTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.vobiz', [
            'verify_signatures' => true,
            'auth_token' => 'test-vobiz-secret',
            'webhook_base_url' => 'https://voiceai.keylines.in/api/vobiz',
        ]);
    }

    private function headers(string $endpoint, string $token = 'test-vobiz-secret'): array
    {
        $nonce = '12345678901234567890';

        return [
            'X-Vobiz-Signature-V3-Nonce' => $nonce,
            'X-Vobiz-Signature-V3' => base64_encode(hash_hmac(
                'sha256', 'https://voiceai.keylines.in/api/vobiz/'.$endpoint.'.'.$nonce, $token, true
            )),
        ];
    }

    public function test_answer_returns_valid_voice_xml_and_exact_greeting_without_admin_login(): void
    {
        $response = $this->post('/api/vobiz/answer', ['Event' => 'StartApp'], $this->headers('answer'))
            ->assertOk()->assertHeader('Content-Type', 'application/xml');
        $xml = simplexml_load_string($response->getContent());
        $this->assertNotFalse($xml);
        $this->assertSame('Response', $xml->getName());
        $this->assertCount(1, $xml->children());
        $this->assertSame('Speak', $xml->children()[0]->getName());
        $this->assertSame('WOMAN', (string) $xml->Speak['voice']);
        $this->assertSame('en-US', (string) $xml->Speak['language']);
        $this->assertSame('Hello. Welcome to Keylines AI Voice Assistant. We are testing our incoming call service.', (string) $xml->Speak);
    }

    public function test_hangup_acknowledges_retries_and_logs_only_fixed_metadata(): void
    {
        Log::shouldReceive('info')->twice()->with('Vobiz callback signature verified.', ['endpoint' => 'hangup']);
        $payload = ['Event' => 'Hangup', 'From' => '+919999999999', 'To' => '+918064261743', 'token' => 'private', 'Name' => 'Private Person'];
        for ($i = 0; $i < 2; $i++) {
            $this->post('/api/vobiz/hangup', $payload, $this->headers('hangup'))
                ->assertOk()->assertExactJson(['ok' => true]);
        }
    }

    public function test_missing_invalid_and_cross_endpoint_signatures_are_rejected(): void
    {
        foreach (['answer', 'hangup'] as $endpoint) {
            $this->post('/api/vobiz/'.$endpoint)->assertForbidden();
            $this->post('/api/vobiz/'.$endpoint, [], $this->headers($endpoint, 'wrong-secret'))->assertForbidden();
            $this->post('/api/vobiz/'.$endpoint, [], $this->headers($endpoint === 'answer' ? 'hangup' : 'answer'))->assertForbidden();
            $headers = $this->headers($endpoint);
            $headers['X-Vobiz-Signature-V3-Nonce'] = 'invalid';
            $this->post('/api/vobiz/'.$endpoint, [], $headers)->assertForbidden();
            $this->post('/api/vobiz/'.$endpoint, [], ['X-Vobiz-Signature-V2' => 'legacy'])->assertForbidden();
        }
    }

    public function test_signature_uses_configured_public_url_and_excludes_query_parameters(): void
    {
        $this->post('/api/vobiz/answer?debug=1', [], $this->headers('answer'))->assertOk();
        config()->set('services.vobiz.webhook_base_url', 'https://other.example/api/vobiz');
        $this->post('/api/vobiz/answer', [], $this->headers('answer'))->assertForbidden();
    }

    public function test_missing_signing_configuration_fails_closed(): void
    {
        config()->set('services.vobiz.auth_token', '');
        foreach (['answer', 'hangup'] as $endpoint) {
            $this->post('/api/vobiz/'.$endpoint)->assertStatus(503);
        }
        config()->set('services.vobiz.auth_token', 'test-vobiz-secret');
        config()->set('services.vobiz.webhook_base_url', 'http://insecure.example/api/vobiz');
        $this->post('/api/vobiz/answer')->assertStatus(503);
    }

    public function test_explicit_connectivity_mode_accepts_unsigned_callbacks_and_logs_unauthenticated(): void
    {
        config()->set('services.vobiz.verify_signatures', false);
        Log::shouldReceive('warning')->once()->with('Vobiz callback accepted without authentication.', ['endpoint' => 'answer']);
        Log::shouldReceive('warning')->once()->with('Vobiz callback accepted without authentication.', ['endpoint' => 'hangup']);
        $this->post('/api/vobiz/answer')->assertOk();
        $this->post('/api/vobiz/hangup')->assertOk();
    }
}
