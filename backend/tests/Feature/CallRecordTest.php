<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CallRecordTest extends TestCase
{
    use RefreshDatabase;

    public function test_general_browser_call_audio_is_stored_privately_and_playable_by_admin(): void
    {
        Storage::fake('local');
        AdminUser::create(['name' => 'Test Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);
        $id = $this->postJson('/api/call-records', [
            'lead_name' => 'Browser test', 'assistant_name' => 'Deblina',
        ])->assertCreated()->json('id');

        $this->call('POST', "/api/call-records/{$id}/audio", [], [], [],
            ['CONTENT_TYPE' => 'audio/webm', 'HTTP_AUTHORIZATION' => "Bearer {$token}"], 'webm-audio-data')
            ->assertOk();

        Storage::disk('local')->assertExists("call-recordings/{$id}.webm");
        $this->assertSame('webm-audio-data', Storage::disk('local')->get("call-recordings/{$id}.webm"));
        $this->getJson("/api/call-records/{$id}")->assertOk()->assertJsonPath('has_audio', true);
        $this->get("/api/call-records/{$id}/audio")->assertOk()->assertHeader('Content-Type', 'audio/webm');
    }

    public function test_outgoing_local_call_uses_selected_contact_and_topic(): void
    {
        AdminUser::create(['name' => 'Test Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);
        $contact = $this->postJson('/api/contacts', [
            'type' => 'customer', 'name' => 'Pat Example', 'phone' => '5551234',
            'company' => 'Example Co', 'consent_status' => 'granted', 'dnc' => false,
        ])->assertCreated()->json();

        $id = $this->postJson('/api/call-records', [
            'lead_name' => 'Pat Example', 'contact_id' => $contact['id'],
            'topic' => 'Discuss a product demo', 'assistant_name' => 'Deblina',
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('calls', [
            'id' => $id, 'contact_id' => $contact['id'], 'direction' => 'outbound',
            'provider' => 'local_browser', 'destination_phone' => '5551234',
            'summary' => 'Call objective: Discuss a product demo',
        ]);
        $this->getJson("/api/call-records/{$id}")->assertOk()->assertJsonPath('lead_name', 'Pat Example');
    }

    public function test_browser_calcutta_timezone_alias_is_accepted_for_new_calls(): void
    {
        AdminUser::create(['name' => 'Test Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);

        $this->post('/api/call-records', [
            'lead_name' => 'Browser lead', 'assistant_name' => 'Deblina',
            'timezone' => 'Asia/Calcutta',
        ])->assertCreated();
        $this->assertDatabaseHas('calls', ['timezone' => 'Asia/Kolkata']);
    }

    public function test_a_browser_call_is_saved_across_the_three_tables_and_can_be_viewed(): void
    {
        AdminUser::create(['name' => 'Test Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);

        $created = $this->postJson('/api/call-records', ['lead_name' => 'Laptop tester', 'assistant_name' => 'Subrata'])
            ->assertCreated()
            ->json();

        $id = $created['id'];

        $this->patchJson("/api/call-records/{$id}", ['status' => 'in_progress'])
            ->assertOk();

        $this->postJson("/api/call-records/{$id}/messages", [
            'speaker' => 'customer',
            'message' => 'Hello Ava',
        ])->assertCreated();

        $this->patchJson("/api/call-records/{$id}", [
            'status' => 'completed',
            'outcome' => 'browser_test',
            'summary' => 'One test message.',
        ])->assertOk();

        $this->assertDatabaseHas('leads', ['name' => 'Laptop tester', 'phone' => 'browser']);
        $this->assertDatabaseHas('calls', ['id' => $id, 'status' => 'completed', 'assistant_name' => 'Subrata']);
        $this->assertDatabaseHas('call_messages', ['call_id' => $id, 'message' => 'Hello Ava']);

        $this->getJson("/api/call-records/{$id}")
            ->assertOk()
            ->assertJsonPath('lead_name', 'Laptop tester')
            ->assertJsonPath('assistant_name', 'Subrata')
            ->assertJsonPath('messages.0.message', 'Hello Ava');
    }
}
