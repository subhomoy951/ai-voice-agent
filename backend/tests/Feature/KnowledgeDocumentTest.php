<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KnowledgeDocumentTest extends TestCase
{
    use RefreshDatabase;

    private function login(int $organizationId, string $email): void
    {
        AdminUser::create(['organization_id' => $organizationId, 'name' => 'Admin', 'email' => $email, 'password' => 'Admin@12345']);
        $token = $this->postJson('/api/admin/login', ['email' => $email, 'password' => 'Admin@12345'])->assertOk()->json('token');
        $this->withToken($token);
    }

    public function test_upload_search_replace_and_delete_document(): void
    {
        Storage::fake('local');
        config(['knowledge.service_token' => 'test-token', 'knowledge.service_url' => 'http://ai.test']);
        Http::fake(['ai.test/api/knowledge/extract' => Http::response(['sections' => [['page_number' => null, 'section' => 'Document', 'text' => 'We use React and Laravel to build web applications.']]])]);
        $this->login(1, 'knowledge@example.com');

        $id = $this->post('/api/knowledge-documents', [
            'title' => 'Technology stack', 'file' => UploadedFile::fake()->createWithContent('company.txt', 'We use React and Laravel.'),
        ])->assertCreated()->json('id');
        $this->assertDatabaseHas('knowledge_documents', ['id' => $id, 'status' => 'ready']);
        $this->assertDatabaseCount('knowledge_chunks', 1);
        $this->postJson('/api/knowledge-documents/search', ['question' => 'Which technologies build web applications?'])
            ->assertOk()->assertJsonCount(1, 'passages')->assertJsonPath('passages.0.document_title', 'Technology stack');
        $call = $this->postJson('/api/call-records', ['lead_name' => 'Caller', 'assistant_name' => 'Deblina'])->assertCreated()->json('id');
        $this->postJson('/api/knowledge-documents/search', ['question' => 'Which technologies build web applications?', 'call_id' => $call])
            ->assertOk()->assertJsonCount(1, 'passages');
        $this->assertDatabaseHas('call_knowledge_uses', ['call_id' => $call, 'document_id' => $id]);

        $this->post("/api/knowledge-documents/{$id}/replace", [
            'file' => UploadedFile::fake()->createWithContent('new.txt', 'Our stack changed.'),
        ])->assertOk();
        $this->assertDatabaseCount('knowledge_chunks', 1);
        $this->deleteJson("/api/knowledge-documents/{$id}")->assertOk();
        $this->assertDatabaseCount('knowledge_documents', 0);
        $this->assertDatabaseCount('knowledge_chunks', 0);
    }

    public function test_documents_are_private_to_their_organization(): void
    {
        Storage::fake('local');
        config(['knowledge.service_token' => 'test-token', 'knowledge.service_url' => 'http://ai.test']);
        Http::fake(['ai.test/api/knowledge/extract' => Http::response(['sections' => [['text' => 'Private company details']]])]);
        $this->login(1, 'owner-knowledge@example.com');
        $id = $this->post('/api/knowledge-documents', ['file' => UploadedFile::fake()->createWithContent('private.txt', 'Private company details')])->assertCreated()->json('id');
        $call = $this->postJson('/api/call-records', ['lead_name' => 'Private caller', 'assistant_name' => 'Deblina'])->assertCreated()->json('id');
        $other = DB::table('organizations')->insertGetId(['name' => 'Other', 'timezone' => 'Asia/Kolkata', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
        $this->login($other, 'other-knowledge@example.com');
        $this->getJson('/api/knowledge-documents')->assertOk()->assertJsonCount(0);
        $this->postJson('/api/knowledge-documents/search', ['question' => 'Private company details'])->assertOk()->assertJsonCount(0, 'passages');
        $this->postJson('/api/knowledge-documents/search', ['question' => 'Private company details', 'call_id' => $call])->assertNotFound();
        $this->deleteJson("/api/knowledge-documents/{$id}")->assertNotFound();
    }
}
