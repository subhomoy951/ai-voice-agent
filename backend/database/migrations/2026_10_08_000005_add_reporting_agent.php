<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('organizations')->pluck('id') as $organizationId) {
            if (DB::table('ai_agents')->where('organization_id', $organizationId)->where('name', 'Reporting')->exists()) {
                continue;
            }
            DB::table('ai_agents')->insert([
                'organization_id' => $organizationId,
                'name' => 'Reporting',
                'purpose' => 'Explain call activity, outcomes, appointment requests, and records that need review.',
                'status' => 'active',
                'system_prompt' => 'Read only. Use saved call records and linked calendar events. State the selected period and counts precisely. Link supporting calls. Do not infer interest or a promised follow-up from a generic call status; flag missing outcomes for human review.',
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('ai_agents')->where('name', 'Reporting')->delete();
    }
};
