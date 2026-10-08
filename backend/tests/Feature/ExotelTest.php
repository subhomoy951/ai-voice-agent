<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExotelTest extends TestCase
{
    use RefreshDatabase;

    private function login(): void
    {
        AdminUser::create(['organization_id' => 1, 'name' => 'Admin', 'email' => 'phone@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'phone@example.com', 'password' => 'Admin@12345'])->assertOk()->json('token');
        $this->withToken($token);
    }

    public function test_dummy_credentials_disable_phone_calls(): void
    {
        $this->login();
        config()->set('services.exotel.enabled', true);
        config()->set('services.exotel.api_key', 'dummy_exotel_api_key');
        $this->postJson('/api/exotel/calls', ['contact_id' => 1, 'assistant_name' => 'Deblina', 'topic' => 'Test'])
            ->assertStatus(503);
        $this->assertDatabaseCount('calls', 0);
    }

    public function test_phone_call_is_dialed_and_terminal_callback_updates_record(): void
    {
        $this->login();
        foreach ([
            'enabled' => true, 'api_key' => 'test-key', 'api_token' => 'test-token',
            'account_sid' => 'test-sid', 'caller_id' => '08012345678',
            'api_base' => 'https://api.in.exotel.com',
            'stream_url' => 'wss://example.com/api/exotel/media',
            'callback_url' => 'https://example.com/api/exotel/status',
            'bridge_token' => 'test-bridge-secret', 'callback_token' => 'test-callback-secret',
        ] as $key => $value) config()->set("services.exotel.$key", $value);
        Http::fake(['api.in.exotel.com/*' => Http::response(['Call' => ['Sid' => 'call-123']], 200)]);
        $contact = DB::table('contacts')->insertGetId([
            'organization_id' => 1, 'type' => 'lead', 'name' => 'Customer',
            'phone' => '+919876543210', 'consent_status' => 'granted', 'dnc' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $response = $this->postJson('/api/exotel/calls', [
            'contact_id' => $contact, 'assistant_name' => 'Deblina', 'topic' => 'Appointment',
        ])->assertCreated()->assertJsonPath('provider_call_id', 'call-123');
        $id = $response->json('id');
        Http::assertSent(fn ($request) => str_contains($request->url(), '/Calls/connect'));
        $this->post('/api/exotel/status?token=test-callback-secret', [
            'CallSid' => 'call-123', 'CustomField' => (string) $id,
            'EventType' => 'terminal', 'Status' => 'completed', 'ConversationDuration' => '42',
        ])->assertOk();
        $this->assertDatabaseHas('calls', ['id' => $id, 'provider' => 'exotel', 'status' => 'completed', 'duration_seconds' => 42]);
    }
}
