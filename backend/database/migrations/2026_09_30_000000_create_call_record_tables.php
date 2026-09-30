<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('leads')) {
            Schema::create('leads', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120);
                $table->string('phone', 30);
                $table->timestampTz('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('calls')) {
            Schema::create('calls', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
                $table->string('status', 20)->default('queued');
                $table->string('outcome', 30)->nullable();
                $table->text('summary')->nullable();
                $table->timestampTz('started_at')->nullable();
                $table->timestampTz('ended_at')->nullable();
                $table->timestampTz('created_at')->useCurrent();
                $table->index('lead_id');
            });
        }

        if (! Schema::hasTable('call_messages')) {
            Schema::create('call_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('call_id')->constrained('calls')->cascadeOnDelete();
                $table->string('speaker', 20);
                $table->text('message');
                $table->timestampTz('spoken_at')->useCurrent();
                $table->index(['call_id', 'spoken_at']);
            });
        }
    }

    public function down(): void
    {
        // These tables may predate this migration in PostgreSQL. Never drop user data.
    }
};
