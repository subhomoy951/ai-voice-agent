<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 160);
            $table->string('industry', 100)->nullable();
            $table->string('timezone', 64)->default('Asia/Kolkata');
            $table->string('country', 2)->nullable();
            $table->string('status', 30)->default('active');
            $table->json('settings_json')->nullable();
            $table->timestamps();
        });

        $organizationId = DB::table('organizations')->insertGetId([
            'name' => 'Default organization', 'timezone' => 'Asia/Kolkata',
            'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('legacy_lead_id')->nullable()->unique()->constrained('leads')->nullOnDelete();
            $table->string('type', 30)->default('lead');
            $table->string('name', 120);
            $table->string('phone', 30)->nullable();
            $table->string('alternative_phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('company', 160)->nullable();
            $table->string('language', 30)->nullable();
            $table->string('timezone', 64)->nullable();
            $table->string('consent_status', 30)->default('unknown');
            $table->boolean('dnc')->default(false);
            $table->json('metadata_json')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'phone']);
        });

        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->string('purpose', 160)->nullable();
            $table->string('voice', 80)->nullable();
            $table->string('language', 30)->nullable();
            $table->text('opening_message')->nullable();
            $table->longText('system_prompt')->nullable();
            $table->string('status', 30)->default('draft');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['organization_id', 'status']);
        });

        foreach (['Deblina', 'Subrata'] as $name) {
            DB::table('ai_agents')->insert([
                'organization_id' => $organizationId, 'name' => $name,
                'status' => 'active', 'version' => 1,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        foreach (['leads', 'calls', 'admin_users', 'workspace_settings'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('organization_id')->nullable()->constrained()->restrictOnDelete();
            });
            DB::table($name)->update(['organization_id' => $organizationId]);
        }

        DB::table('leads')->orderBy('id')->chunkById(500, function ($leads) use ($organizationId) {
            foreach ($leads as $lead) {
                DB::table('contacts')->insert([
                    'organization_id' => $organizationId, 'legacy_lead_id' => $lead->id,
                    'type' => 'lead', 'name' => $lead->name,
                    'phone' => $lead->phone === 'browser' ? null : $lead->phone,
                    'alternative_phone' => $lead->alternative_phone,
                    'email' => $lead->email, 'company' => $lead->business_name,
                    'metadata_json' => $lead->call_topics ? json_encode(['call_topics' => $lead->call_topics]) : null,
                    'created_at' => $lead->created_at, 'updated_at' => $lead->updated_at ?? $lead->created_at,
                ]);
            }
        });

        Schema::table('calls', function (Blueprint $table) {
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ai_agent_id')->nullable()->constrained()->nullOnDelete();
            $table->string('direction', 20)->default('browser_test');
            $table->string('provider', 40)->nullable();
            $table->string('provider_call_id', 160)->nullable();
            $table->string('session_id', 160)->nullable();
            $table->unsignedInteger('agent_version')->nullable();
            $table->string('workflow_version', 80)->nullable();
            $table->string('language', 30)->nullable();
            $table->dateTime('answered_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('failure_code', 80)->nullable();
            $table->decimal('cost_amount', 12, 4)->nullable();
            $table->string('cost_currency', 3)->nullable();
            $table->index(['organization_id', 'created_at']);
            $table->index(['provider', 'provider_call_id']);
        });

        DB::table('contacts')->whereNotNull('legacy_lead_id')->orderBy('id')->chunkById(500, function ($contacts) {
            foreach ($contacts as $contact) {
                DB::table('calls')->where('lead_id', $contact->legacy_lead_id)->update(['contact_id' => $contact->id]);
            }
        });
        foreach (['Deblina', 'Subrata'] as $name) {
            DB::table('calls')->where('assistant_name', $name)->update([
                'ai_agent_id' => DB::table('ai_agents')->where('name', $name)->value('id'),
                'agent_version' => 1,
            ]);
        }

        Schema::table('call_messages', function (Blueprint $table) {
            $table->unsignedInteger('sequence')->nullable();
            $table->unsignedInteger('start_ms')->nullable();
            $table->unsignedInteger('end_ms')->nullable();
            $table->string('language', 30)->nullable();
            $table->string('message_type', 30)->nullable();
            $table->index(['call_id', 'sequence']);
        });
        $lastCallId = null;
        $sequence = 0;
        DB::table('call_messages')->orderBy('call_id')->orderBy('spoken_at')->orderBy('id')->chunk(500, function ($messages) use (&$lastCallId, &$sequence) {
            foreach ($messages as $message) {
                if ($lastCallId !== $message->call_id) {
                    $lastCallId = $message->call_id;
                    $sequence = 0;
                }
                DB::table('call_messages')->where('id', $message->id)->update(['sequence' => ++$sequence]);
            }
        });
    }

    public function down(): void
    {
        // Preserve copied contacts and existing business records.
    }
};
