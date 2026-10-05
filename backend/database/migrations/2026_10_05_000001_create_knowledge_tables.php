<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->string('title', 255);
            $table->string('original_filename', 255);
            $table->string('mime_type', 120);
            $table->string('storage_path', 500);
            $table->unsignedBigInteger('file_size');
            $table->string('checksum', 64);
            $table->string('status', 30)->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'checksum']);
        });

        Schema::create('knowledge_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('document_id')->constrained('knowledge_documents')->cascadeOnDelete();
            $table->unsignedInteger('chunk_number');
            $table->longText('content');
            $table->unsignedInteger('page_number')->nullable();
            $table->string('section', 255)->nullable();
            $table->string('search_reference', 255)->nullable();
            $table->timestamps();
            $table->unique(['document_id', 'chunk_number']);
            $table->index(['organization_id', 'document_id']);
        });

        Schema::create('agent_knowledge_documents', function (Blueprint $table) {
            $table->foreignId('ai_agent_id')->constrained('ai_agents')->cascadeOnDelete();
            $table->foreignId('document_id')->constrained('knowledge_documents')->cascadeOnDelete();
            $table->primary(['ai_agent_id', 'document_id']);
            $table->index('document_id');
        });

        Schema::create('call_knowledge_uses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('call_id')->constrained('calls')->cascadeOnDelete();
            $table->foreignId('document_id')->nullable()->constrained('knowledge_documents')->nullOnDelete();
            $table->foreignId('chunk_id')->nullable()->constrained('knowledge_chunks')->nullOnDelete();
            $table->text('question');
            $table->string('document_title', 255);
            $table->unsignedInteger('page_number')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['organization_id', 'call_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_knowledge_uses');
        Schema::dropIfExists('agent_knowledge_documents');
        Schema::dropIfExists('knowledge_chunks');
        Schema::dropIfExists('knowledge_documents');
    }
};
