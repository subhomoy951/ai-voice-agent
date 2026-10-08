<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('organizations')->pluck('id') as $organizationId) {
            if (DB::table('ai_agents')->where('organization_id', $organizationId)->where('name', 'Lead Qualification')->exists()) {
                continue;
            }
            DB::table('ai_agents')->insert([
                'organization_id' => $organizationId,
                'name' => 'Lead Qualification',
                'purpose' => 'Understand the prospect’s needs and agree on a useful next step.',
                'voice' => 'marin',
                'language' => 'English',
                'opening_message' => 'I am calling to understand what you are looking for and see whether our team can help. Is now a good time?',
                'system_prompt' => 'Qualify the lead conversationally. Ask one question at a time about their need or problem, current solution, desired timing, decision process, and budget only when relevant. Listen to the answer before choosing the next question. Do not pressure the person or invent pricing, capabilities, or commitments. Use company knowledge for factual business answers. If there is interest, ask permission for a meeting or callback and confirm the agreed next step. If they are not interested or ask to stop, end politely. Before ending, briefly recap the need, timing, and agreed next step; distinguish unknown details from confirmed facts.',
                'status' => 'active',
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('ai_agents')->where('name', 'Lead Qualification')->delete();
    }
};
