<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('organizations')->pluck('id') as $organizationId) {
            if (DB::table('ai_agents')->where('organization_id', $organizationId)->where('name', 'Follow-up')->exists()) {
                continue;
            }
            DB::table('ai_agents')->insert([
                'organization_id' => $organizationId,
                'name' => 'Follow-up',
                'purpose' => 'Follow up on a previous conversation and confirm the next step.',
                'voice' => 'marin',
                'language' => 'English',
                'opening_message' => 'I am following up on an earlier conversation with our team. Is now a good time to talk?',
                'system_prompt' => 'Use the supplied previous call context only for this contact. Briefly explain why you are following up and ask if this is a good time. Verify the earlier need or agreement with the person; do not claim an unconfirmed promise or repeat questions already answered. Ask one question at a time. Find out whether they are still interested and what next step they prefer. If they want a meeting or callback, confirm its date, year, time, and timezone. If they decline, ask to stop, or do not want more calls, end politely and do not try to persuade them. Do not invent facts, pricing, commitments, or a booking. Before ending, recap the agreed next step or that no follow-up is wanted.',
                'status' => 'active',
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('ai_agents')->where('name', 'Follow-up')->delete();
    }
};
