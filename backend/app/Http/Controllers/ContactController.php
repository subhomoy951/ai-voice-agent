<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ContactController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizationId = $request->attributes->get('admin')->organization_id;
        return response()->json(DB::table('contacts')->where('organization_id', $organizationId)
            ->orderByDesc('created_at')->orderByDesc('id')->limit(500)->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['organization_id'] = $request->attributes->get('admin')->organization_id;
        $data['metadata_json'] = json_encode($data['metadata_json'] ?? []);
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $id = DB::table('contacts')->insertGetId($data);
        return response()->json(DB::table('contacts')->where('id', $id)->first(), 201);
    }

    public function show(Request $request, int $contact): JsonResponse
    {
        return response()->json($this->owned($request, $contact));
    }

    public function update(Request $request, int $contact): JsonResponse
    {
        $this->owned($request, $contact);
        $data = $this->validated($request);
        $data['metadata_json'] = json_encode($data['metadata_json'] ?? []);
        $data['updated_at'] = now();
        DB::table('contacts')->where('id', $contact)->update($data);
        return $this->show($request, $contact);
    }

    private function owned(Request $request, int $contact): object
    {
        $record = DB::table('contacts')->where('organization_id', $request->attributes->get('admin')->organization_id)->where('id', $contact)->first();
        abort_if(! $record, 404);
        return $record;
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['lead', 'customer', 'candidate', 'employee', 'student', 'vendor', 'member', 'other'])],
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:30'],
            'alternative_phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'company' => ['nullable', 'string', 'max:160'],
            'language' => ['nullable', 'string', 'max:30'],
            'timezone' => ['nullable', 'timezone'],
            'consent_status' => ['required', Rule::in(['unknown', 'granted', 'denied', 'withdrawn'])],
            'dnc' => ['required', 'boolean'],
            'metadata_json' => ['nullable', 'array'],
        ]);
    }
}
