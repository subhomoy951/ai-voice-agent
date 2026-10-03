<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_events', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->dateTime('ends_at')->nullable();
            $table->string('status', 30)->default('confirmed');
            $table->string('location_type', 30)->nullable();
            $table->string('location', 500)->nullable();
            $table->foreignId('owner_user_id')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->string('external_provider', 40)->nullable();
            $table->string('external_event_id', 160)->nullable();
            $table->string('source', 30)->default('ai_call');
            $table->string('created_by_type', 30)->nullable();
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->index(['organization_id', 'starts_at']);
            $table->index(['contact_id', 'starts_at']);
            $table->index(['status', 'starts_at']);
            $table->unique(['organization_id', 'external_provider', 'external_event_id'], 'schedule_events_external_unique');
        });

        DB::table('schedule_events')->orderBy('id')->chunkById(500, function ($events) {
            foreach ($events as $event) {
                $call = DB::table('calls')->where('id', $event->call_id)->first(['organization_id', 'contact_id']);
                if ($call) {
                    DB::table('schedule_events')->where('id', $event->id)->update([
                        'organization_id' => $call->organization_id,
                        'contact_id' => $call->contact_id,
                    ]);
                }
            }
        });

        Schema::table('schedule_events', function (Blueprint $table) {
            $table->dropForeign(['call_id']);
        });
        Schema::table('schedule_events', function (Blueprint $table) {
            $table->unsignedBigInteger('call_id')->nullable()->change();
            $table->foreign('call_id')->references('id')->on('calls')->nullOnDelete();
        });

        Schema::create('schedule_event_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_event_id')->constrained()->cascadeOnDelete();
            $table->string('participant_type', 30);
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 160);
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('role', 60)->nullable();
            $table->string('response_status', 30)->default('pending');
            $table->timestamps();
        });

        Schema::create('schedule_event_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_event_id')->constrained()->cascadeOnDelete();
            $table->string('action', 30);
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('actor_type', 30);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->foreignId('call_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('call_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('call_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action_type', 80);
            $table->json('request_json')->nullable();
            $table->json('result_json')->nullable();
            $table->string('status', 30);
            $table->string('idempotency_key', 160);
            $table->dateTime('executed_at')->nullable();
            $table->timestamps();
            $table->unique(['organization_id', 'idempotency_key']);
        });

        Schema::create('call_extractions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->string('schema_version', 80);
            $table->json('data_json');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['call_id', 'created_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->string('actor_type', 30);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('action', 80);
            $table->string('entity_type', 80);
            $table->unsignedBigInteger('entity_id');
            $table->json('before_json')->nullable();
            $table->json('after_json')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['organization_id', 'entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        // Keep events and audit records intact if an older application version is deployed.
    }
};
