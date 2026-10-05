<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class KnowledgeSearch
{
    public function find(int $organizationId, string $question, ?int $agentId = null): array
    {
        $terms = array_values(array_unique(array_filter(
            preg_split('/[^\pL\pN]+/u', mb_strtolower($question)) ?: [],
            fn ($word) => mb_strlen($word) >= 3 && ! in_array($word, ['the', 'and', 'for', 'what', 'which', 'does', 'with', 'are', 'can', 'how', 'company'], true)
        )));
        if (! $terms) return [];

        $query = DB::table('knowledge_chunks as chunks')
            ->join('knowledge_documents as documents', 'documents.id', '=', 'chunks.document_id')
            ->where('chunks.organization_id', $organizationId)
            ->where('documents.organization_id', $organizationId)
            ->where('documents.status', 'ready')
            ->select('chunks.id', 'chunks.document_id', 'chunks.content', 'chunks.page_number', 'chunks.section', 'documents.title as document_title');
        if ($agentId) {
            $assignments = DB::table('agent_knowledge_documents')->where('ai_agent_id', $agentId)->pluck('document_id');
            if ($assignments->isNotEmpty()) $query->whereIn('documents.id', $assignments);
        }
        $query->where(function ($builder) use ($terms) {
            foreach ($terms as $term) $builder->orWhere('chunks.content', 'like', '%'.addcslashes($term, '%_\\').'%');
        });

        // Bound the amount of text scored in PHP. The later search-engine stage can
        // replace this lexical baseline without changing the API or call flow.
        $candidates = $query->limit(200)->get();
        return $candidates->map(function ($passage) use ($terms) {
            $text = mb_strtolower($passage->content);
            $passage->score = array_sum(array_map(fn ($term) => substr_count($text, $term), $terms));
            return $passage;
        })->sortByDesc('score')->take(4)->values()->all();
    }
}
