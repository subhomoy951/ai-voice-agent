<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ProcessKnowledgeDocument implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $documentId, public string $storagePath) {}

    public function handle(): void
    {
        $record = DB::table('knowledge_documents')->where('id', $this->documentId)->first();
        if (! $record || $record->storage_path !== $this->storagePath || $record->status === 'ready') return;
        $token = config('knowledge.service_token');
        if (! $token) throw new \RuntimeException('KNOWLEDGE_SERVICE_TOKEN is required.');

        DB::table('knowledge_documents')->where('id', $record->id)->where('checksum', $record->checksum)
            ->update(['status' => 'processing', 'error_message' => null, 'updated_at' => now()]);
        $disk = Storage::disk(config('knowledge.disk'));
        $stream = fopen($disk->path($record->storage_path), 'rb');
        if (! $stream) throw new \RuntimeException('Knowledge document file is missing.');
        try {
            $response = Http::withToken($token)->timeout(45)
                ->attach('file', $stream, $record->original_filename)
                ->post(rtrim(config('knowledge.service_url'), '/').'/api/knowledge/extract', [
                    'max_bytes' => config('knowledge.max_upload_kb') * 1024,
                    'max_pages' => config('knowledge.max_pdf_pages'),
                    'max_characters' => config('knowledge.max_extracted_characters'),
                ]);
            $response->throw();
            $sections = $response->json('sections');
            if (! is_array($sections) || ! count($sections)) throw new \RuntimeException('No text was extracted.');
            $chunks = [];
            $number = 0;
            foreach ($sections as $section) {
                $text = trim((string) ($section['text'] ?? ''));
                foreach (mb_str_split($text, 1500) as $part) {
                    if (! trim($part)) continue;
                    $chunks[] = [
                        'organization_id' => $record->organization_id, 'document_id' => $record->id,
                        'chunk_number' => ++$number, 'content' => trim($part),
                        'page_number' => $section['page_number'] ?? null,
                        'section' => $section['section'] ?? null,
                        'created_at' => now(), 'updated_at' => now(),
                    ];
                }
            }
            if (! $chunks) throw new \RuntimeException('No searchable text was extracted.');
            DB::transaction(function () use ($record, $chunks) {
                $current = DB::table('knowledge_documents')->where('id', $record->id)->lockForUpdate()->first();
                if (! $current || $current->checksum !== $record->checksum || $current->storage_path !== $record->storage_path) return;
                DB::table('knowledge_chunks')->where('document_id', $record->id)->delete();
                foreach (array_chunk($chunks, 100) as $batch) DB::table('knowledge_chunks')->insert($batch);
                DB::table('knowledge_documents')->where('id', $record->id)->update([
                    'status' => 'ready', 'error_message' => null, 'processed_at' => now(), 'updated_at' => now(),
                ]);
            });
        } finally {
            fclose($stream);
        }
    }

    public function failed(?\Throwable $exception): void
    {
        DB::table('knowledge_documents')->where('id', $this->documentId)
            ->where('storage_path', $this->storagePath)->whereIn('status', ['pending', 'processing'])
            ->update(['status' => 'failed', 'error_message' => mb_substr($exception?->getMessage() ?? 'Processing failed', 0, 1000), 'updated_at' => now()]);
    }
}
