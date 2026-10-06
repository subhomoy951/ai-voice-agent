<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalCallScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduled_local_calls_run_in_order_one_at_a_time(): void
    {
        AdminUser::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])->json('token');
        $this->withToken($token);
        $one = $this->postJson('/api/contacts', ['type' => 'customer', 'name' => 'First', 'company' => 'First Business', 'consent_status' => 'granted', 'dnc' => false])->assertCreated()->json('id');
        $two = $this->postJson('/api/contacts', ['type' => 'customer', 'name' => 'Second', 'consent_status' => 'granted', 'dnc' => false])->assertCreated()->json('id');
        $schedule = $this->postJson('/api/local-call-schedules', [
            'title' => 'Product introductions', 'assistant_name' => 'Deblina', 'topic' => 'Discuss the product',
            'starts_at' => now()->addMinute()->toIso8601String(), 'timezone' => 'Asia/Kolkata',
            'items' => [['contact_id' => $one], ['contact_id' => $two, 'topic' => 'Discuss a demo']],
        ])->assertCreated()->json();
        $first = $schedule['items'][0]['id'];
        $second = $schedule['items'][1]['id'];
        $payload = fn ($contact, $topic, $item) => [
            'lead_name' => 'Test', 'assistant_name' => 'Deblina', 'contact_id' => $contact,
            'topic' => $topic, 'schedule_item_id' => $item,
        ];
        $this->postJson('/api/call-records', $payload($one, 'Discuss the product', $first))->assertUnprocessable();
        $this->travel(2)->minutes();
        $call = $this->postJson('/api/call-records', $payload($one, 'Discuss the product', $first))->assertCreated()->json('id');
        $this->postJson('/api/call-records', $payload($two, 'Discuss a demo', $second))->assertUnprocessable();
        $this->patchJson("/api/call-records/{$call}", ['status' => 'completed'])->assertOk();
        $next = $this->getJson('/api/local-call-schedules/'.$schedule['id'])->assertOk()->json();
        $this->assertTrue($next['items'][1]['ready']);
        $secondCall = $this->postJson('/api/call-records', $payload($two, 'Discuss a demo', $second))->assertCreated()->json('id');
        $this->patchJson("/api/call-records/{$secondCall}", ['status' => 'completed'])->assertOk();
        $this->getJson('/api/local-call-schedules/'.$schedule['id'])->assertJsonPath('status', 'completed');
    }
}
