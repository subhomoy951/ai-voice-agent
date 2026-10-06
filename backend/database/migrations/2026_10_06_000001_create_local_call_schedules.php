<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('local_call_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('title', 160);
            $table->string('assistant_name', 30);
            $table->text('topic');
            $table->dateTime('starts_at');
            $table->string('timezone', 64);
            $table->string('status', 20)->default('scheduled');
            $table->timestamps();
            $table->index(['organization_id', 'starts_at']);
        });
        Schema::create('local_call_schedule_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('local_call_schedules')->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->restrictOnDelete();
            $table->foreignId('call_id')->nullable()->constrained('calls')->nullOnDelete();
            $table->unsignedInteger('position');
            $table->text('topic');
            $table->string('status', 20)->default('pending');
            $table->timestamps();
            $table->unique(['schedule_id', 'contact_id']);
            $table->unique(['schedule_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('local_call_schedule_items');
        Schema::dropIfExists('local_call_schedules');
    }
};
