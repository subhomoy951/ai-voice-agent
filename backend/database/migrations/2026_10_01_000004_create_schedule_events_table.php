<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained('calls')->cascadeOnDelete();
            $table->string('event_type', 30);
            $table->string('title', 160);
            $table->text('details')->nullable();
            $table->dateTime('starts_at');
            $table->string('timezone', 64);
            $table->timestamps();
            $table->index('starts_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_events');
    }
};
