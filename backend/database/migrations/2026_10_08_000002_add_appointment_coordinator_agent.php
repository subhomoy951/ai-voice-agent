<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('organizations')->pluck('id') as $organizationId) {
            if (DB::table('ai_agents')->where('organization_id', $organizationId)->where('name', 'Appointment Coordinator')->exists()) {
                continue;
            }
            DB::table('ai_agents')->insert([
                'organization_id' => $organizationId,
                'name' => 'Appointment Coordinator',
                'purpose' => 'Collect and confirm appointment requests for the team.',
                'voice' => 'marin',
                'language' => 'English',
                'opening_message' => 'I can help arrange a meeting or callback with our team. Is now a good time to discuss the details?',
                'system_prompt' => 'Help the caller request a meeting or callback. Ask one question at a time. Establish the purpose, who should attend, the preferred date including year, exact time, and timezone. Repeat the full date, year, time, timezone, and purpose back and ask for explicit confirmation. If details are missing or ambiguous, ask again; never silently change a spoken date or year. The application extracts appointment requests from the transcript after the call. You cannot inspect availability or guarantee a booking during this call, so say the request will be passed to the team and do not claim an event was saved or a slot reserved. If the caller declines or asks to stop, end politely. Do not invent business facts.',
                'status' => 'active',
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('ai_agents')->where('name', 'Appointment Coordinator')->delete();
    }
};
