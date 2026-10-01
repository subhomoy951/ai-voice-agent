<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('alternative_phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('business_name', 160)->nullable();
            $table->text('call_topics')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
        Schema::table('calls', function (Blueprint $table) {
            $table->string('destination_phone', 30)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('calls', fn (Blueprint $table) => $table->dropColumn('destination_phone'));
        Schema::table('leads', fn (Blueprint $table) => $table->dropColumn([
            'alternative_phone', 'email', 'business_name', 'call_topics', 'updated_at',
        ]));
    }
};
