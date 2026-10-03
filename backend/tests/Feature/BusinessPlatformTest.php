<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BusinessPlatformTest extends TestCase
{
    use RefreshDatabase;

    private function login(int $organizationId, string $email): void
    {
        AdminUser::create(['organization_id' => $organizationId, 'name' => 'Admin', 'email' => $email, 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => $email, 'password' => 'Admin@12345'])->assertOk()->json('token');
        $this->withToken($token);
    }

    public function test_contacts_and_agents_are_scoped_to_the_signed_in_organization(): void
    {
        $other = DB::table('organizations')->insertGetId(['name' => 'Other', 'timezone' => 'Asia/Kolkata', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
        $this->login(1, 'one@example.com');
        $contact = $this->postJson('/api/contacts', ['type' => 'candidate', 'name' => 'Asha', 'phone' => '+911234567890', 'consent_status' => 'unknown', 'dnc' => false])->assertCreated()->json('id');
        $this->postJson('/api/contacts', ['type' => 'patient', 'name' => 'Excluded', 'consent_status' => 'unknown', 'dnc' => false])->assertUnprocessable();
        $agent = $this->postJson('/api/ai-agents', ['name' => 'Recruiter', 'purpose' => 'Screen candidates', 'status' => 'draft'])->assertCreated()->json('id');
        $this->login($other, 'two@example.com');
        $this->getJson("/api/contacts/{$contact}")->assertNotFound();
        $this->getJson('/api/contacts')->assertOk()->assertJsonMissing(['name' => 'Asha']);
        $this->putJson("/api/ai-agents/{$agent}", ['name' => 'Changed', 'status' => 'active'])->assertNotFound();
        $this->getJson('/api/ai-agents')->assertOk()->assertJsonMissing(['name' => 'Recruiter']);
    }

    public function test_event_participants_history_and_idempotency(): void
    {
        $this->login(1, 'calendar@example.com');
        $payload = [
            'event_type' => 'interview', 'title' => 'Candidate interview',
            'starts_at' => now()->addDays(2)->toIso8601String(),
            'ends_at' => now()->addDays(2)->addHour()->toIso8601String(),
            'timezone' => 'Asia/Kolkata', 'idempotency_key' => 'interview-123',
            'participants' => [['participant_type' => 'external', 'name' => 'Interviewer', 'email' => 'person@example.com']],
        ];
        $id = $this->postJson('/api/schedule-events', $payload)->assertCreated()->json('id');
        $this->postJson('/api/schedule-events', $payload)->assertOk()->assertJsonPath('id', $id);
        $this->assertDatabaseCount('schedule_events', 1);
        $this->assertDatabaseCount('schedule_event_participants', 1);
        $this->assertDatabaseCount('schedule_event_history', 1);
        $this->postJson("/api/schedule-events/{$id}/reschedule", [
            'starts_at' => now()->addDays(3)->toIso8601String(), 'timezone' => 'Asia/Kolkata',
        ])->assertOk()->assertJsonPath('status', 'rescheduled');
        $this->postJson("/api/schedule-events/{$id}/cancel")->assertOk()->assertJsonPath('status', 'cancelled');
        $this->assertDatabaseCount('schedule_event_history', 3);
        $this->postJson('/api/schedule-events', [...$payload, 'idempotency_key' => 'bad-end', 'ends_at' => now()->addDay()->toIso8601String()])->assertUnprocessable();
    }

    public function test_other_organization_cannot_open_a_call_or_event(): void
    {
        $other = DB::table('organizations')->insertGetId(['name' => 'Other', 'timezone' => 'Asia/Kolkata', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
        $this->login(1, 'owner@example.com');
        $call = $this->postJson('/api/call-records', ['lead_name' => 'Private caller', 'assistant_name' => 'Deblina'])->assertCreated()->json('id');
        $event = $this->postJson("/api/call-records/{$call}/schedule-events", [
            'event_type' => 'meeting', 'title' => 'Private meeting',
            'starts_at' => now()->addDays(2)->toIso8601String(), 'timezone' => 'Asia/Kolkata',
        ])->assertCreated()->json('id');
        $this->login($other, 'outsider@example.com');
        $this->getJson("/api/call-records/{$call}")->assertNotFound();
        $this->postJson("/api/call-records/{$call}/messages", ['speaker' => 'customer', 'message' => 'Hello'])->assertNotFound();
        $this->getJson("/api/schedule-events/{$event}")->assertNotFound();
        $this->postJson("/api/schedule-events/{$event}/cancel")->assertNotFound();
        $this->getJson('/api/schedule-events')->assertOk()->assertJsonMissing(['title' => 'Private meeting']);
    }
}
