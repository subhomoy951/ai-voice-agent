<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessKnowledgeDocument;
use App\Services\KnowledgeSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;

class KnowledgeDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(DB::table('knowledge_documents')
            ->where('organization_id', $request->attributes->get('admin')->organization_id)
            ->orderByDesc('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'file' => ['required', File::types(config('knowledge.allowed_extensions'))->max(config('knowledge.max_upload_kb'))],
        ]);
        $file = $data['file'];
        $organizationId = $request->attributes->get('admin')->organization_id;
        $disk = Storage::disk(config('knowledge.disk'));
        $path = $file->store("knowledge/{$organizationId}", config('knowledge.disk'));
        abort_unless($path, 500, 'Could not store the document.');
        try {
            $id = DB::table('knowledge_documents')->insertGetId([
                'organization_id' => $organizationId,
                'uploaded_by' => $request->attributes->get('admin')->id,
                'title' => $data['title'] ?? $file->getClientOriginalName(),
                'original_filename' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'storage_path' => $path,
                'file_size' => $file->getSize(),
                'checksum' => hash_file('sha256', $disk->path($path)),
                'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            $disk->delete($path);
            throw $exception;
        }
        ProcessKnowledgeDocument::dispatch($id, $path);
        return response()->json(DB::table('knowledge_documents')->where('id', $id)->first(), 201);
    }

    public function replace(Request $request, int $document): JsonResponse
    {
        $record = $this->find($request, $document);
        $data = $request->validate(['file' => ['required', File::types(config('knowledge.allowed_extensions'))->max(config('knowledge.max_upload_kb'))]]);
        $file = $data['file'];
        $disk = Storage::disk(config('knowledge.disk'));
        $path = $file->store("knowledge/{$record->organization_id}", config('knowledge.disk'));
        abort_unless($path, 500, 'Could not store the document.');
        try {
            DB::transaction(function () use ($record, $file, $path, $disk) {
                DB::table('knowledge_chunks')->where('document_id', $record->id)->delete();
                DB::table('knowledge_documents')->where('id', $record->id)->update([
                    'original_filename' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                    'storage_path' => $path, 'file_size' => $file->getSize(),
                    'checksum' => hash_file('sha256', $disk->path($path)), 'status' => 'pending',
                    'error_message' => null, 'processed_at' => null, 'updated_at' => now(),
                ]);
            });
        } catch (\Throwable $exception) {
            $disk->delete($path);
            throw $exception;
        }
        ProcessKnowledgeDocument::dispatch($record->id, $path);
        $disk->delete($record->storage_path);
        return response()->json(DB::table('knowledge_documents')->where('id', $record->id)->first());
    }

    public function destroy(Request $request, int $document): JsonResponse
    {
        $record = $this->find($request, $document);
        DB::table('knowledge_documents')->where('id', $record->id)->delete();
        Storage::disk(config('knowledge.disk'))->delete($record->storage_path);
        return response()->json(['deleted' => true]);
    }

    public function search(Request $request, KnowledgeSearch $search): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:2000'],
            'call_id' => ['nullable', 'integer'],
        ]);
        $organizationId = $request->attributes->get('admin')->organization_id;
        $call = null;
        if (isset($data['call_id'])) {
            $call = DB::table('calls')->where('id', $data['call_id'])->where('organization_id', $organizationId)->first();
            abort_if(! $call, 404);
        }
        $passages = $search->find($organizationId, $data['question'], $call?->ai_agent_id);
        if ($call) {
            foreach ($passages as $passage) {
                DB::table('call_knowledge_uses')->insert([
                    'organization_id' => $organizationId, 'call_id' => $call->id,
                    'document_id' => $passage->document_id, 'chunk_id' => $passage->id,
                    'question' => $data['question'], 'document_title' => $passage->document_title,
                    'page_number' => $passage->page_number, 'created_at' => now(),
                ]);
            }
        }
        return response()->json(['passages' => $passages]);
    }

    private function find(Request $request, int $document): object
    {
        $record = DB::table('knowledge_documents')->where('id', $document)
            ->where('organization_id', $request->attributes->get('admin')->organization_id)->first();
        abort_if(! $record, 404);
        return $record;
    }
}
