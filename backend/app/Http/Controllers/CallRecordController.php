<?php

namespace App\Http\Controllers;

use App\Services\ScheduleCapture;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CallRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $calls = DB::table('calls')
            ->where('calls.organization_id', $request->attributes->get('admin')->organization_id)
            ->join('leads', 'leads.id', '=', 'calls.lead_id')
            ->select('calls.*', 'leads.name as lead_name', 'leads.phone as lead_phone')
            ->orderByDesc('calls.created_at')
            ->orderByDesc('calls.id')
            ->limit(100)
            ->get();

        return response()->json($calls);
    }

    public function show(Request $request, int $call): JsonResponse
    {
        $record = DB::table('calls')
            ->join('leads', 'leads.id', '=', 'calls.lead_id')
            ->select('calls.*', 'leads.name as lead_name', 'leads.phone as lead_phone')
            ->where('calls.id', $call)
            ->where('calls.organization_id', $request->attributes->get('admin')->organization_id)
            ->first();

        abort_if($record === null, 404);

        $record->messages = DB::table('call_messages')
            ->where('call_id', $call)
            ->orderBy('spoken_at')
            ->orderBy('id')
            ->get();

        return response()->json($record);
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->input('timezone') === 'Asia/Calcutta') {
            $request->merge(['timezone' => 'Asia/Kolkata']);
        }
        $data = $request->validate([
            'lead_name' => ['required', 'string', 'max:120'],
            'assistant_name' => ['required', Rule::in(['Deblina', 'Subrata'])],
            'timezone' => ['sometimes', 'timezone', 'max:64'],
        ]);

        $organizationId = $request->attributes->get('admin')->organization_id;
        $callId = DB::transaction(function () use ($data, $organizationId) {
            $leadId = DB::table('leads')->insertGetId([
                'organization_id' => $organizationId,
                'name' => $data['lead_name'],
                // A laptop call has no telephone number. This marks that fact
                // without inventing a real number in the existing required field.
                'phone' => 'browser',
                'created_at' => now(),
            ]);

            $contactId = DB::table('contacts')->insertGetId([
                'organization_id' => $organizationId, 'legacy_lead_id' => $leadId,
                'type' => 'lead', 'name' => $data['lead_name'],
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $agent = DB::table('ai_agents')->where('organization_id', $organizationId)
                ->where('name', $data['assistant_name'])->first();

            return DB::table('calls')->insertGetId([
                'organization_id' => $organizationId,
                'lead_id' => $leadId,
                'contact_id' => $contactId,
                'ai_agent_id' => $agent?->id,
                'agent_version' => $agent?->version,
                'direction' => 'browser_test',
                'assistant_name' => $data['assistant_name'],
                'timezone' => $data['timezone'] ?? 'Asia/Kolkata',
                'status' => 'queued',
                'created_at' => now(),
            ]);
        });

        return response()->json(['id' => $callId], 201);
    }

    public function storeMessage(Request $request, int $call): JsonResponse
    {
        abort_unless(DB::table('calls')->where('id', $call)->where('organization_id', $request->attributes->get('admin')->organization_id)->exists(), 404);

        $data = $request->validate([
            'speaker' => ['required', Rule::in(['ai', 'customer', 'system'])],
            'message' => ['required', 'string', 'max:10000'],
        ]);

        $id = DB::table('call_messages')->insertGetId([
            'call_id' => $call,
            'sequence' => (DB::table('call_messages')->where('call_id', $call)->max('sequence') ?? 0) + 1,
            'speaker' => $data['speaker'],
            'message' => $data['message'],
            'spoken_at' => now(),
        ]);

        app(ScheduleCapture::class)->fromCall($call);

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, int $call): JsonResponse
    {
        abort_unless(DB::table('calls')->where('id', $call)->where('organization_id', $request->attributes->get('admin')->organization_id)->exists(), 404);

        $data = $request->validate([
            'status' => ['required', Rule::in(['in_progress', 'completed', 'failed'])],
            'outcome' => ['nullable', 'string', 'max:30'],
            'summary' => ['nullable', 'string', 'max:10000'],
        ]);

        $update = ['status' => $data['status']];
        if ($data['status'] === 'in_progress') {
            $update['started_at'] = now();
        } else {
            $update['ended_at'] = now();
        }
        if (array_key_exists('outcome', $data)) {
            $update['outcome'] = $data['outcome'];
        }
        if (array_key_exists('summary', $data)) {
            $update['summary'] = $data['summary'];
        }

        DB::table('calls')->where('id', $call)->update($update);

        if ($data['status'] === 'completed') {
            app(ScheduleCapture::class)->fromCompletedCall($call);
        }

        return $this->show($request, $call);
    }
}
