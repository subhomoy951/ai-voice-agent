<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AiAgentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(DB::table('ai_agents')->where('organization_id', $request->attributes->get('admin')->organization_id)->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['organization_id'] = $request->attributes->get('admin')->organization_id;
        $data['version'] = 1;
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $id = DB::table('ai_agents')->insertGetId($data);
        return response()->json(DB::table('ai_agents')->where('id', $id)->first(), 201);
    }

    public function update(Request $request, int $agent): JsonResponse
    {
        $organizationId = $request->attributes->get('admin')->organization_id;
        $record = DB::table('ai_agents')->where('id', $agent)->where('organization_id', $organizationId)->first();
        abort_if(! $record, 404);
        $data = $this->validated($request);
        $data['version'] = $record->version + 1;
        $data['updated_at'] = now();
        $updated = DB::transaction(function () use ($agent, $record, $data, $organizationId, $request) {
            DB::table('ai_agents')->where('id', $agent)->update($data);
            $updated = DB::table('ai_agents')->where('id', $agent)->first();
            DB::table('audit_logs')->insert([
                'organization_id' => $organizationId, 'actor_type' => 'user',
                'actor_id' => $request->attributes->get('admin')->id, 'action' => 'updated',
                'entity_type' => 'ai_agent', 'entity_id' => $agent,
                'before_json' => json_encode($record), 'after_json' => json_encode($updated), 'created_at' => now(),
            ]);
            return $updated;
        });
        return response()->json($updated);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'purpose' => ['nullable', 'string', 'max:160'],
            'voice' => ['nullable', Rule::in(['marin', 'cedar'])],
            'language' => ['nullable', 'string', 'max:30'],
            'opening_message' => ['nullable', 'string', 'max:2000'],
            'system_prompt' => ['nullable', 'string', 'max:10000'],
            'status' => ['required', Rule::in(['draft', 'active', 'paused', 'archived'])],
        ]);
    }
}
