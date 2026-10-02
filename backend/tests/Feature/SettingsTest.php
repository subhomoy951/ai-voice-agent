<?php

namespace Tests\Feature;

use App\Http\Controllers\SettingsController;
use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_branding_exposes_only_company_name_and_logo(): void
    {
        $this->getJson('/api/admin/branding')->assertOk()->assertExactJson(['business_name' => '', 'logo_url' => '']);
        \Illuminate\Support\Facades\DB::table('workspace_settings')->insert([
            'id' => 1, 'preferences' => json_encode(array_replace(SettingsController::defaults(), [
                'business_name' => 'Effortrak', 'logo_url' => 'https://example.com/logo.png',
                'contact_email' => 'private@example.com', 'instructions' => 'Private instructions',
            ])), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->getJson('/api/admin/branding')->assertOk()->assertExactJson([
            'business_name' => 'Effortrak', 'logo_url' => 'https://example.com/logo.png',
        ]);
        $this->getJson('/api/admin/settings')->assertUnauthorized();
    }

    private function login(): string
    {
        AdminUser::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'OriginalPassword123']);
        return $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'OriginalPassword123'])->assertOk()->json('token');
    }

    public function test_settings_require_authentication_and_persist_across_sessions(): void
    {
        $this->getJson('/api/admin/settings')->assertUnauthorized();
        $token = $this->login();
        $this->withToken($token)->getJson('/api/admin/settings')->assertOk()->assertJsonPath('timezone', 'Asia/Kolkata');
        $settings = array_replace(SettingsController::defaults(), ['business_name' => 'Keylines', 'default_assistant' => 'subrata', 'max_call_minutes' => 7]);
        $this->putJson('/api/admin/settings', $settings)->assertOk()->assertJsonPath('default_assistant', 'subrata');
        $this->getJson('/api/admin/settings')->assertOk()->assertJsonPath('business_name', 'Keylines')->assertJsonPath('max_call_minutes', 7);
        $settings['timezone'] = 'Invalid/Zone';
        $settings['business_end'] = '08:00';
        $this->putJson('/api/admin/settings', $settings)->assertUnprocessable()->assertJsonValidationErrors(['timezone', 'business_end']);
    }

    public function test_account_changes_require_password_and_revoke_other_sessions(): void
    {
        $token = $this->login();
        $otherToken = $this->postJson('/api/admin/login', ['email' => 'admin@example.com', 'password' => 'OriginalPassword123'])->json('token');
        $payload = ['name' => 'Updated Admin', 'email' => 'UPDATED@EXAMPLE.COM', 'current_password' => 'wrong', 'password' => 'NewPassword12345', 'password_confirmation' => 'NewPassword12345'];
        $this->withToken($token)->putJson('/api/admin/account', $payload)->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $payload['current_password'] = 'OriginalPassword123';
        $this->putJson('/api/admin/account', $payload)->assertOk()->assertJsonPath('email', 'updated@example.com')->assertJsonMissingPath('password');
        $this->assertTrue(Hash::check('NewPassword12345', AdminUser::first()->password));
        $this->assertDatabaseMissing('admin_tokens', ['token_hash' => hash('sha256', $otherToken)]);
        $this->withToken($token)->getJson('/api/admin/me')->assertOk();
    }

    public function test_account_email_is_unique_after_normalization(): void
    {
        $token = $this->login();
        AdminUser::create(['name' => 'Other', 'email' => 'other@example.com', 'password' => 'OtherPassword123']);
        $this->withToken($token)->putJson('/api/admin/account', ['name' => 'Admin', 'email' => 'OTHER@EXAMPLE.COM', 'current_password' => 'OriginalPassword123'])->assertUnprocessable()->assertJsonValidationErrors('email');
    }
}
