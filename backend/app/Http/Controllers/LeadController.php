<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('leads')
            ->where('organization_id', request()->attributes->get('admin')->organization_id)
            ->whereNotNull('business_name')
            ->orderByDesc('created_at')->orderByDesc('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9][0-9 ()-]{6,28}$/'],
            'alternative_phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9][0-9 ()-]{6,28}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'business_name' => ['required', 'string', 'max:160'],
            'call_topics' => ['required', 'string', 'max:5000'],
        ]);

        $organizationId = $request->attributes->get('admin')->organization_id;
        $id = DB::transaction(function () use ($data, $organizationId) {
            $id = DB::table('leads')->insertGetId([
                ...$data, 'organization_id' => $organizationId,
                'alternative_phone' => $data['alternative_phone'] ?? null,
                'email' => $data['email'] ?? null,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('contacts')->insert([
                'organization_id' => $organizationId, 'legacy_lead_id' => $id,
                'type' => 'lead', 'name' => $data['name'], 'phone' => $data['phone'],
                'alternative_phone' => $data['alternative_phone'] ?? null,
                'email' => $data['email'] ?? null, 'company' => $data['business_name'],
                'metadata_json' => json_encode(['call_topics' => $data['call_topics']]),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            return $id;
        });

        return response()->json(DB::table('leads')->where('id', $id)->first(), 201);
    }
}
