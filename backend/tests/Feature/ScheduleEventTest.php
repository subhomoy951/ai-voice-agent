<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ScheduleEventTest extends TestCase
{
    use RefreshDatabase;

    public function test_call_schedule_is_saved_once_and_listed_in_time_order(): void
    {
        AdminUser::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);
        $call = $this->postJson('/api/call-records', ['lead_name' => 'Alex', 'assistant_name' => 'Deblina'])
            ->assertCreated()->json('id');
        $event = [
            'event_type' => 'interview', 'title' => 'Interview with Alex',
            'details' => 'Technical interview', 'starts_at' => now()->addDays(2)->toIso8601String(),
            'timezone' => 'Asia/Calcutta',
        ];

        $this->postJson("/api/call-records/{$call}/schedule-events", $event)->assertCreated();
        $this->postJson("/api/call-records/{$call}/schedule-events", $event)->assertOk();
        $this->assertDatabaseCount('schedule_events', 1);
        $this->assertDatabaseHas('schedule_events', ['timezone' => 'Asia/Kolkata']);
        $this->getJson('/api/schedule-events')->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.lead_name', 'Alex')
            ->assertJsonPath('0.call_assistant_name', 'Deblina')
            ->assertJsonPath('0.event_type', 'interview');

        $later = [...$event, 'title' => 'Later meeting', 'event_type' => 'meeting', 'starts_at' => now()->addDays(3)->toIso8601String()];
        $this->postJson("/api/call-records/{$call}/schedule-events", $later)->assertCreated();
        $this->getJson('/api/schedule-events?offset=1')->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.title', 'Later meeting');
    }

    public function test_explicit_call_request_is_captured_after_ist_is_clarified(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-10-01 00:00:00', 'UTC'));
        AdminUser::create(['name' => 'Admin', 'email' => 'admin2@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin2@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);
        $call = $this->postJson('/api/call-records', ['lead_name' => 'Alolika', 'assistant_name' => 'Deblina'])
            ->assertCreated()->json('id');

        $this->postJson("/api/call-records/{$call}/messages", [
            'speaker' => 'customer',
            'message' => 'Can we schedule a meeting on 3rd October 2026 around 5 p.m.?',
        ])->assertCreated();
        $this->assertDatabaseCount('schedule_events', 0);
        $this->postJson("/api/call-records/{$call}/messages", [
            'speaker' => 'customer', 'message' => 'Indian Times Indian Times',
        ])->assertCreated();
        $this->postJson("/api/call-records/{$call}/messages", [
            'speaker' => 'customer', 'message' => 'About the AI application I was trying to build.',
        ])->assertCreated();

        $this->assertDatabaseCount('schedule_events', 1);
        $this->assertDatabaseHas('schedule_events', [
            'call_id' => $call, 'event_type' => 'meeting', 'timezone' => 'Asia/Kolkata',
            'starts_at' => '2026-10-03 11:30:00',
        ]);
    }

    public function test_completed_call_extracts_multiple_event_types_from_saved_history(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-10-01 00:00:00', 'UTC'));
        Http::fake(['*/api/schedule/extract' => Http::response(['events' => [
            ['event_type' => 'interview', 'title' => 'Candidate interview', 'details' => 'Technical round', 'starts_at' => '2026-10-05T10:00:00+05:30'],
            ['event_type' => 'call_reminder', 'title' => 'Follow-up call', 'details' => 'Discuss offer', 'starts_at' => '2026-10-06T15:00:00+05:30'],
        ]])]);
        AdminUser::create(['name' => 'Admin', 'email' => 'admin3@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin3@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);
        $call = $this->postJson('/api/call-records', [
            'lead_name' => 'Candidate', 'assistant_name' => 'Deblina', 'timezone' => 'Asia/Kolkata',
        ])->assertCreated()->json('id');
        $this->postJson("/api/call-records/{$call}/messages", [
            'speaker' => 'customer', 'message' => 'Please arrange an interview and remind me to call next week.',
        ])->assertCreated();

        $this->patchJson("/api/call-records/{$call}", ['status' => 'completed'])->assertOk();
        $this->assertDatabaseCount('schedule_events', 2);
        $this->assertDatabaseHas('schedule_events', [
            'call_id' => $call, 'event_type' => 'interview', 'starts_at' => '2026-10-05 04:30:00',
        ]);
        $this->assertDatabaseHas('schedule_events', [
            'call_id' => $call, 'event_type' => 'call_reminder', 'starts_at' => '2026-10-06 09:30:00',
        ]);
        Http::assertSent(fn ($request) => $request['timezone'] === 'Asia/Kolkata'
            && str_contains($request['transcript'][0], 'interview'));
    }

    public function test_completed_call_does_not_silently_change_a_spoken_past_year(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-10-01 07:00:00', 'UTC'));
        Http::fake(['*/api/schedule/extract' => Http::response(['events' => []])]);
        AdminUser::create(['name' => 'Admin', 'email' => 'admin4@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin4@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);
        $call = $this->postJson('/api/call-records', [
            'lead_name' => 'Laptop test lead', 'assistant_name' => 'Deblina', 'timezone' => 'Asia/Kolkata',
        ])->assertCreated()->json('id');
        foreach ([
            'Hello, I am Alojika Das Gupta.',
            'So, can you schedule a meeting on 3rd October 2016?',
            'On 5 p.m.',
            'Regarding my new project,',
            'which is an AI voice assistant development.',
            'Yes, it is IST, Indian Time Zone.',
        ] as $message) {
            $this->postJson("/api/call-records/{$call}/messages", [
                'speaker' => 'customer', 'message' => $message,
            ])->assertCreated();
        }
        $this->patchJson("/api/call-records/{$call}", ['status' => 'completed'])->assertOk();

        $this->assertDatabaseCount('schedule_events', 0);
    }
}
