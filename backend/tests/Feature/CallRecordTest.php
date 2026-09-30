<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CallRecordTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_browser_call_is_saved_across_the_three_tables_and_can_be_viewed(): void
    {
        $created = $this->postJson('/api/call-records', ['lead_name' => 'Laptop tester'])
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
        $this->assertDatabaseHas('calls', ['id' => $id, 'status' => 'completed']);
        $this->assertDatabaseHas('call_messages', ['call_id' => $id, 'message' => 'Hello Ava']);

        $this->getJson("/api/call-records/{$id}")
            ->assertOk()
            ->assertJsonPath('lead_name', 'Laptop tester')
            ->assertJsonPath('messages.0.message', 'Hello Ava');
    }
}
