<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ScheduleEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizationId = $request->attributes->get('admin')->organization_id;
        $query = DB::table('schedule_events')
            ->leftJoin('contacts', 'contacts.id', '=', 'schedule_events.contact_id')
            ->leftJoin('calls', 'calls.id', '=', 'schedule_events.call_id')
            ->leftJoin('leads', 'leads.id', '=', 'calls.lead_id')
            ->where('schedule_events.organization_id', $organizationId)
            ->select('schedule_events.*', 'contacts.name as contact_name', 'leads.name as lead_name');
        if ($request->filled('from')) $query->where('schedule_events.starts_at', '>=', Carbon::parse($request->query('from'))->utc());
        if ($request->filled('to')) $query->where('schedule_events.starts_at', '<=', Carbon::parse($request->query('to'))->utc());
        if ($request->filled('type')) $query->where('schedule_events.event_type', $request->query('type'));
        if ($request->filled('status')) $query->where('schedule_events.status', $request->query('status'));
        if ($request->filled('owner_user_id')) $query->where('schedule_events.owner_user_id', $request->query('owner_user_id'));
        $events = $query->orderBy('schedule_events.starts_at')->limit(1000)->get();
        $this->attachParticipants($events);
        return response()->json($events);
    }

    public function show(Request $request, int $event): JsonResponse
    {
        $record = $this->owned($request, $event);
        $record->participants = DB::table('schedule_event_participants')->where('schedule_event_id', $event)->get();
        $record->history = DB::table('schedule_event_history')->where('schedule_event_id', $event)->orderByDesc('id')->get();
        return response()->json($record);
    }

    public function store(Request $request, ?int $call = null): JsonResponse
    {
        $organizationId = $request->attributes->get('admin')->organization_id;
        $callRecord = $call ? DB::table('calls')->where('id', $call)->where('organization_id', $organizationId)->first() : null;
        if ($call) abort_if(! $callRecord, 404);
        $data = $this->validated($request);
        if ($callRecord) $data['contact_id'] = $callRecord->contact_id;
        $this->checkReferences($organizationId, $data);
        if ($callRecord && ! $request->filled('idempotency_key')) {
            $existing = DB::table('schedule_events')->where('call_id', $call)
                ->where('event_type', $data['event_type'])->where('starts_at', $data['starts_at'])->first();
            if ($existing) return response()->json(['id' => $existing->id]);
        }
        $key = $request->input('idempotency_key');
        if ($key) {
            $existingAction = DB::table('call_actions')->where('organization_id', $organizationId)->where('idempotency_key', $key)->first();
            if ($existingAction) return response()->json(json_decode($existingAction->result_json, true) ?: ['id' => null]);
        }
        try {
            $result = DB::transaction(function () use ($data, $call, $organizationId, $key) {
            $participants = $data['participants'] ?? [];
            unset($data['participants']);
            $id = DB::table('schedule_events')->insertGetId([
                ...$data, 'organization_id' => $organizationId, 'call_id' => $call,
                'source' => $call ? 'ai_call' : 'manual', 'created_by_type' => 'user',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->saveParticipants($id, $participants);
            $this->history($id, 'created', null, DB::table('schedule_events')->where('id', $id)->first(), $call);
            if ($key) DB::table('call_actions')->insert([
                'organization_id' => $organizationId, 'call_id' => $call, 'action_type' => 'schedule_event',
                'request_json' => json_encode($data), 'result_json' => json_encode(['id' => $id]),
                'status' => 'completed', 'idempotency_key' => $key,
                'executed_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            return ['id' => $id];
            });
        } catch (QueryException $error) {
            $existingAction = $key ? DB::table('call_actions')->where('organization_id', $organizationId)->where('idempotency_key', $key)->first() : null;
            if (! $existingAction) throw $error;
            return response()->json(json_decode($existingAction->result_json, true));
        }
        return response()->json($result, 201);
    }

    public function update(Request $request, int $event): JsonResponse
    {
        $record = $this->owned($request, $event);
        $data = $this->validated($request);
        $this->checkReferences($record->organization_id, $data);
        DB::transaction(function () use ($event, $record, $data) {
            $participants = $data['participants'] ?? null;
            unset($data['participants']);
            DB::table('schedule_events')->where('id', $event)->update([...$data, 'updated_at' => now()]);
            if ($participants !== null) {
                DB::table('schedule_event_participants')->where('schedule_event_id', $event)->delete();
                $this->saveParticipants($event, $participants);
            }
            $this->history($event, 'updated', $record, DB::table('schedule_events')->where('id', $event)->first(), $record->call_id);
        });
        return $this->show($request, $event);
    }

    public function reschedule(Request $request, int $event): JsonResponse
    {
        $record = $this->owned($request, $event);
        $data = $request->validate(['starts_at' => ['required', 'date'], 'ends_at' => ['nullable', 'date'], 'timezone' => ['required', 'timezone']]);
        $start = Carbon::parse($data['starts_at'])->utc();
        $end = isset($data['ends_at']) ? Carbon::parse($data['ends_at'])->utc() : null;
        if ($start->isPast() || ($end && $end->lessThanOrEqualTo($start))) throw ValidationException::withMessages(['starts_at' => 'Use a future start and an end after it.']);
        DB::transaction(function () use ($event, $record, $start, $end, $data) {
            DB::table('schedule_events')->where('id', $event)->update(['starts_at' => $start->format('Y-m-d H:i:s'), 'ends_at' => $end?->format('Y-m-d H:i:s'), 'timezone' => $data['timezone'], 'status' => 'rescheduled', 'updated_at' => now()]);
            $this->history($event, 'rescheduled', $record, DB::table('schedule_events')->where('id', $event)->first(), $record->call_id);
        });
        return $this->show($request, $event);
    }

    public function status(Request $request, int $event, string $status): JsonResponse
    {
        $record = $this->owned($request, $event);
        DB::transaction(function () use ($event, $record, $status) {
            DB::table('schedule_events')->where('id', $event)->update(['status' => $status, 'updated_at' => now()]);
            $this->history($event, $status, $record, DB::table('schedule_events')->where('id', $event)->first(), $record->call_id);
        });
        return $this->show($request, $event);
    }

    public function cancel(Request $request, int $event): JsonResponse
    {
        return $this->status($request, $event, 'cancelled');
    }

    public function complete(Request $request, int $event): JsonResponse
    {
        return $this->status($request, $event, 'completed');
    }

    private function validated(Request $request): array
    {
        if ($request->input('timezone') === 'Asia/Calcutta') $request->merge(['timezone' => 'Asia/Kolkata']);
        $data = $request->validate([
            'event_type' => ['required', Rule::in(['meeting', 'interview', 'call_reminder', 'callback', 'demo', 'appointment', 'reminder', 'follow_up', 'other'])],
            'title' => ['required', 'string', 'max:160'], 'details' => ['nullable', 'string', 'max:2000'],
            'starts_at' => ['required', 'date', 'after:now'], 'ends_at' => ['nullable', 'date'],
            'timezone' => ['required', 'timezone'], 'status' => ['sometimes', Rule::in(['tentative', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'])],
            'contact_id' => ['nullable', 'integer'], 'owner_user_id' => ['nullable', 'integer'],
            'location_type' => ['nullable', Rule::in(['phone', 'online', 'office', 'external'])],
            'location' => ['nullable', 'string', 'max:500'],
            'participants' => ['sometimes', 'array', 'max:30'],
            'participants.*.participant_type' => ['required', Rule::in(['contact', 'user', 'external'])],
            'participants.*.contact_id' => ['nullable', 'integer'],
            'participants.*.name' => ['required', 'string', 'max:160'],
            'participants.*.email' => ['nullable', 'email', 'max:255'],
            'participants.*.phone' => ['nullable', 'string', 'max:30'],
            'participants.*.role' => ['nullable', 'string', 'max:60'],
            'participants.*.response_status' => ['sometimes', Rule::in(['pending', 'accepted', 'declined', 'tentative'])],
            'idempotency_key' => ['sometimes', 'string', 'max:160'],
        ]);
        $start = Carbon::parse($data['starts_at'])->utc();
        $end = isset($data['ends_at']) ? Carbon::parse($data['ends_at'])->utc() : null;
        if ($end && $end->lessThanOrEqualTo($start)) throw ValidationException::withMessages(['ends_at' => 'End time must be after start time.']);
        $data['starts_at'] = $start->format('Y-m-d H:i:s');
        $data['ends_at'] = $end?->format('Y-m-d H:i:s');
        $data['status'] ??= 'confirmed';
        unset($data['idempotency_key']);
        return $data;
    }

    private function checkReferences(int $organizationId, array $data): void
    {
        foreach (['contact_id' => 'contacts', 'owner_user_id' => 'admin_users'] as $field => $table) {
            if (! empty($data[$field]) && ! DB::table($table)->where('id', $data[$field])->where('organization_id', $organizationId)->exists()) abort(422, 'Referenced record does not belong to this organization.');
        }
        foreach ($data['participants'] ?? [] as $person) {
            if (! empty($person['contact_id']) && ! DB::table('contacts')->where('id', $person['contact_id'])->where('organization_id', $organizationId)->exists()) abort(422, 'Participant does not belong to this organization.');
        }
    }

    private function owned(Request $request, int $event): object
    {
        $record = DB::table('schedule_events')->where('id', $event)->where('organization_id', $request->attributes->get('admin')->organization_id)->first();
        abort_if(! $record, 404);
        return $record;
    }

    private function saveParticipants(int $event, array $participants): void
    {
        foreach ($participants as $person) DB::table('schedule_event_participants')->insert([
            ...$person, 'schedule_event_id' => $event, 'response_status' => $person['response_status'] ?? 'pending',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function history(int $event, string $action, ?object $before, object $after, ?int $call): void
    {
        DB::table('schedule_event_history')->insert([
            'schedule_event_id' => $event, 'action' => $action,
            'old_values' => $before ? json_encode($before) : null, 'new_values' => json_encode($after),
            'actor_type' => 'user', 'call_id' => $call, 'created_at' => now(),
        ]);
    }

    private function attachParticipants($events): void
    {
        $ids = $events->pluck('id');
        $byEvent = $ids->isEmpty() ? collect() : DB::table('schedule_event_participants')->whereIn('schedule_event_id', $ids)->get()->groupBy('schedule_event_id');
        foreach ($events as $event) $event->participants = $byEvent->get($event->id, collect());
    }
}
