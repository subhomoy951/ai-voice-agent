<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_protects_calls_and_logout_revokes_token(): void
    {
        $this->getJson('/api/call-records')->assertUnauthorized();
        AdminUser::create(['name' => 'Demo Admin', 'email' => 'admin@example.com', 'password' => 'Admin@12345']);
        $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'wrong'])
            ->assertUnauthorized();

        $token = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->assertDatabaseHas('admin_tokens', ['token_hash' => hash('sha256', $token)]);
        $this->withToken($token)->getJson('/api/admin/me')->assertOk()->assertJsonPath('email', 'admin@example.com');
        $this->getJson('/api/call-records')->assertOk();
        $this->postJson('/api/admin/logout')->assertOk();
        $this->getJson('/api/call-records')->assertUnauthorized();
    }
}
