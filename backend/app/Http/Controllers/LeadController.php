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

        $id = DB::table('leads')->insertGetId([
            ...$data,
            'alternative_phone' => $data['alternative_phone'] ?? null,
            'email' => $data['email'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('leads')->where('id', $id)->first(), 201);
    }
}
