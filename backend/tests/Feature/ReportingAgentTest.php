<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportingAgentTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_only_organization_calls_and_flags_generic_outcomes_for_review(): void
    {
        AdminUser::create(['organization_id' => 1, 'name' => 'Admin', 'email' => 'report@example.com', 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => 'report@example.com', 'password' => 'Admin@12345'])
            ->assertOk()->json('token');
        $this->withToken($token);
        $call = $this->postJson('/api/call-records', ['lead_name' => 'Local contact', 'assistant_name' => 'Deblina'])
            ->assertCreated()->json('id');
        DB::table('calls')->where('id', $call)->update(['status' => 'completed', 'outcome' => 'local_outgoing']);

        $otherOrg = DB::table('organizations')->insertGetId([
            'name' => 'Other', 'timezone' => 'Asia/Kolkata', 'status' => 'active',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $otherLead = DB::table('leads')->insertGetId([
            'organization_id' => $otherOrg, 'name' => 'Private contact', 'phone' => 'browser', 'created_at' => now(),
        ]);
        DB::table('calls')->insert([
            'organization_id' => $otherOrg, 'lead_id' => $otherLead, 'assistant_name' => 'Deblina',
            'status' => 'completed', 'created_at' => now(),
        ]);

        $this->getJson('/api/reporting-agent?topic=activity&days=30&assistant=all')
            ->assertOk()->assertJsonPath('facts.Total calls', 1)
            ->assertJsonPath('evidence_total', 1)->assertJsonPath('evidence.0.call_id', $call);
        $this->getJson('/api/reporting-agent?topic=review&days=30&assistant=all')
            ->assertOk()->assertJsonPath('facts.Completed calls with no specific outcome', 1);
        $this->getJson('/api/reporting-agent?topic=activity&days=365')
            ->assertUnprocessable();
    }
}
