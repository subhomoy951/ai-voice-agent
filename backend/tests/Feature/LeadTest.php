<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_store_and_list_a_business_with_call_topics(): void
    {
        AdminUser::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');

        $this->postJson('/api/leads', ['name' => 'Unauthorized'])->assertUnauthorized();
        $this->withToken($token);
        $this->postJson('/api/leads', ['name' => 'Missing details'])->assertUnprocessable();
        $this->postJson('/api/leads', [
            'name' => 'Jane Smith',
            'phone' => '+14155550123',
            'alternative_phone' => '+14155550124',
            'email' => 'jane@example.com',
            'business_name' => 'Acme Studio',
            'call_topics' => 'Discuss a product demo and next steps.',
        ])->assertCreated()->assertJsonPath('business_name', 'Acme Studio');

        $this->assertDatabaseHas('leads', ['business_name' => 'Acme Studio', 'phone' => '+14155550123']);
        $this->getJson('/api/leads')->assertOk()->assertJsonPath('0.call_topics', 'Discuss a product demo and next steps.');
    }
}
