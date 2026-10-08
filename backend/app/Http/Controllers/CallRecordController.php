<?php

namespace App\Http\Controllers;

use App\Services\ScheduleCapture;
use App\Services\FollowUpContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
        $record->has_audio = Storage::disk('local')->exists("call-recordings/{$call}.webm");

        return response()->json($record);
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->input('timezone') === 'Asia/Calcutta') {
            $request->merge(['timezone' => 'Asia/Kolkata']);
        }
        $data = $request->validate([
            'lead_name' => ['required', 'string', 'max:120'],
            'assistant_name' => ['required', Rule::in(['Deblina', 'Subrata', 'Lead Qualification', 'Appointment Coordinator', 'Follow-up', 'Company Information'])],
            'timezone' => ['sometimes', 'timezone', 'max:64'],
            'contact_id' => ['sometimes', 'integer'],
            'topic' => ['required_with:contact_id', 'string', 'max:2000'],
            'schedule_item_id' => ['sometimes', 'integer'],
        ]);

        $organizationId = $request->attributes->get('admin')->organization_id;
        $contact = isset($data['contact_id']) ? DB::table('contacts')->where('id', $data['contact_id'])->where('organization_id', $organizationId)->first() : null;
        abort_if(isset($data['contact_id']) && ! $contact, 404);
        abort_if($contact && ($contact->dnc || in_array($contact->consent_status, ['denied', 'withdrawn'], true)), 422, 'This contact cannot be called.');
        $previousContext = $contact && $data['assistant_name'] === 'Follow-up'
            ? app(FollowUpContext::class)->forContact($organizationId, $contact->id) : null;
        if ($contact && $data['assistant_name'] === 'Follow-up' && ! $previousContext) {
            throw \Illuminate\Validation\ValidationException::withMessages(['contact_id' => 'A completed earlier call is required for a follow-up.']);
        }
        $callId = DB::transaction(function () use ($data, $organizationId, $contact) {
            $scheduleItem = null;
            if (isset($data['schedule_item_id'])) {
                DB::table('organizations')->where('id', $organizationId)->lockForUpdate()->first();
                $scheduleItem = DB::table('local_call_schedule_items as items')
                    ->join('local_call_schedules as schedules', 'schedules.id', '=', 'items.schedule_id')
                    ->where('items.id', $data['schedule_item_id'])
                    ->where('schedules.organization_id', $organizationId)
                    ->select('items.*', 'schedules.starts_at', 'schedules.status as schedule_status', 'schedules.assistant_name')
                    ->lockForUpdate()->first();
                abort_if(! $scheduleItem, 404);
                abort_unless($scheduleItem->schedule_status === 'scheduled' && $scheduleItem->status === 'pending'
                    && \Carbon\Carbon::parse($scheduleItem->starts_at, 'UTC')->lte(now('UTC')), 422, 'This local call is not ready.');
                abort_unless($contact && $scheduleItem->contact_id === $contact->id
                    && $scheduleItem->topic === $data['topic']
                    && $scheduleItem->assistant_name === $data['assistant_name'], 422, 'The scheduled contact, topic, or assistant does not match.');
                abort_if(DB::table('local_call_schedule_items as items')
                    ->join('local_call_schedules as schedules', 'schedules.id', '=', 'items.schedule_id')
                    ->where('schedules.organization_id', $organizationId)->where('items.status', 'in_progress')->exists(), 422, 'Another scheduled local call is in progress.');
                abort_if(DB::table('local_call_schedule_items')->where('schedule_id', $scheduleItem->schedule_id)
                    ->where('status', 'pending')->where('position', '<', $scheduleItem->position)->exists(), 422, 'An earlier contact must be called first.');
            }
            $leadId = $contact?->legacy_lead_id ?: DB::table('leads')->insertGetId([
                'organization_id' => $organizationId,
                'name' => $contact?->name ?? $data['lead_name'],
                // A laptop call has no telephone number. This marks that fact
                // without inventing a real number in the existing required field.
                'phone' => 'browser',
                'created_at' => now(),
            ]);

            $contactId = $contact?->id ?: DB::table('contacts')->insertGetId([
                'organization_id' => $organizationId, 'legacy_lead_id' => $leadId,
                'type' => 'lead', 'name' => $data['lead_name'],
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $agent = DB::table('ai_agents')->where('organization_id', $organizationId)
                ->where('name', $data['assistant_name'])->first();

            $callId = DB::table('calls')->insertGetId([
                'organization_id' => $organizationId,
                'lead_id' => $leadId,
                'contact_id' => $contactId,
                'ai_agent_id' => $agent?->id,
                'agent_version' => $agent?->version,
                'direction' => $contact ? 'outbound' : 'browser_test',
                'provider' => $contact ? 'local_browser' : null,
                'destination_phone' => $contact?->phone,
                'summary' => $contact ? 'Call objective: '.$data['topic'] : null,
                'assistant_name' => $data['assistant_name'],
                'timezone' => $data['timezone'] ?? 'Asia/Kolkata',
                'status' => 'queued',
                'created_at' => now(),
            ]);
            if ($scheduleItem) DB::table('local_call_schedule_items')->where('id', $scheduleItem->id)
                ->update(['call_id' => $callId, 'status' => 'in_progress', 'updated_at' => now()]);
            return $callId;
        });

        return response()->json(['id' => $callId, 'previous_context' => $previousContext], 201);
    }

    public function uploadAudio(Request $request, int $call): JsonResponse
    {
        abort_unless(DB::table('calls')->where('id', $call)->where('organization_id', $request->attributes->get('admin')->organization_id)->exists(), 404);
        abort_unless(in_array($request->header('Content-Type'), ['audio/webm', 'video/webm'], true), 415);
        $audio = $request->getContent();
        abort_if(strlen($audio) === 0 || strlen($audio) > 50 * 1024 * 1024, 413);
        abort_unless(Storage::disk('local')->put("call-recordings/{$call}.webm", $audio), 500);
        return response()->json(['saved' => true]);
    }

    public function audio(Request $request, int $call)
    {
        abort_unless(DB::table('calls')->where('id', $call)->where('organization_id', $request->attributes->get('admin')->organization_id)->exists(), 404);
        abort_unless(Storage::disk('local')->exists("call-recordings/{$call}.webm"), 404);
        return response()->file(Storage::disk('local')->path("call-recordings/{$call}.webm"), ['Content-Type' => 'audio/webm']);
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
        if ($data['status'] !== 'in_progress') {
            DB::transaction(function () use ($call, $data) {
                $item = DB::table('local_call_schedule_items')->where('call_id', $call)->lockForUpdate()->first();
                if ($item && $item->status === 'in_progress') {
                    DB::table('local_call_schedule_items')->where('id', $item->id)
                        ->update(['status' => $data['status'], 'updated_at' => now()]);
                    app(LocalCallScheduleController::class)->completeIfDone($item->schedule_id);
                }
            });
        }

        if ($data['status'] === 'completed') {
            app(ScheduleCapture::class)->fromCompletedCall($call);
        }

        return $this->show($request, $call);
    }
}
