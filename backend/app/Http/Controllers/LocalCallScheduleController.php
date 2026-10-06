<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LocalCallScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizationId = $request->attributes->get('admin')->organization_id;
        return response()->json(DB::table('local_call_schedules')->where('organization_id', $organizationId)
            ->orderByDesc('starts_at')->limit(100)->get());
    }

    public function show(Request $request, int $schedule): JsonResponse
    {
        $record = $this->owned($request, $schedule);
        $record->items = DB::table('local_call_schedule_items as items')
            ->join('contacts', 'contacts.id', '=', 'items.contact_id')
            ->where('items.schedule_id', $schedule)
            ->orderBy('items.position')
            ->select('items.*', 'contacts.name as contact_name', 'contacts.company', 'contacts.dnc', 'contacts.consent_status')
            ->get();
        $due = $record->status === 'scheduled' && Carbon::parse($record->starts_at, 'UTC')->lte(now('UTC'));
        $active = DB::table('local_call_schedule_items as items')
            ->join('local_call_schedules as schedules', 'schedules.id', '=', 'items.schedule_id')
            ->where('schedules.organization_id', $record->organization_id)->where('items.status', 'in_progress')->exists();
        $firstPending = $record->items->first(fn ($item) => $item->status === 'pending');
        foreach ($record->items as $item) {
            $item->ready = $due && ! $active && $firstPending?->id === $item->id;
        }
        return response()->json($record);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'assistant_name' => ['required', Rule::in(['Deblina', 'Subrata'])],
            'topic' => ['required', 'string', 'max:2000'],
            'starts_at' => ['required', 'date', 'after:now'],
            'timezone' => ['required', 'timezone', 'max:64'],
            'items' => ['required', 'array', 'min:1', 'max:500'],
            'items.*.contact_id' => ['required', 'integer', 'distinct'],
            'items.*.topic' => ['nullable', 'string', 'max:2000'],
        ]);
        $organizationId = $request->attributes->get('admin')->organization_id;
        $ids = collect($data['items'])->pluck('contact_id');
        $eligible = DB::table('contacts')->where('organization_id', $organizationId)->whereIn('id', $ids)
            ->where('dnc', false)->whereNotIn('consent_status', ['denied', 'withdrawn'])->count();
        if ($eligible !== $ids->count()) throw ValidationException::withMessages(['items' => 'All contacts must exist in this workspace and be callable.']);
        $id = DB::transaction(function () use ($data, $organizationId) {
            $id = DB::table('local_call_schedules')->insertGetId([
                'organization_id' => $organizationId, 'title' => $data['title'],
                'assistant_name' => $data['assistant_name'], 'topic' => $data['topic'],
                'starts_at' => Carbon::parse($data['starts_at'])->utc()->format('Y-m-d H:i:s'),
                'timezone' => $data['timezone'], 'status' => 'scheduled',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($data['items'] as $position => $item) DB::table('local_call_schedule_items')->insert([
                'schedule_id' => $id, 'contact_id' => $item['contact_id'],
                'position' => $position + 1, 'topic' => $item['topic'] ?? $data['topic'],
                'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
            return $id;
        });
        return $this->show($request, $id)->setStatusCode(201);
    }

    public function skip(Request $request, int $schedule, int $item): JsonResponse
    {
        $this->owned($request, $schedule);
        DB::transaction(function () use ($schedule, $item) {
            $row = DB::table('local_call_schedule_items')->where('schedule_id', $schedule)->where('id', $item)->lockForUpdate()->first();
            abort_if(! $row, 404);
            abort_unless($row->status === 'pending' || $row->status === 'failed', 422);
            DB::table('local_call_schedule_items')->where('id', $item)->update(['status' => 'skipped', 'updated_at' => now()]);
            $this->completeIfDone($schedule);
        });
        return $this->show($request, $schedule);
    }

    public function retry(Request $request, int $schedule, int $item): JsonResponse
    {
        $this->owned($request, $schedule);
        DB::transaction(function () use ($schedule, $item) {
            $row = DB::table('local_call_schedule_items')->where('schedule_id', $schedule)->where('id', $item)->lockForUpdate()->first();
            abort_if(! $row, 404);
            abort_unless($row->status === 'failed', 422);
            DB::table('local_call_schedule_items')->where('id', $item)->update(['status' => 'pending', 'call_id' => null, 'updated_at' => now()]);
        });
        return $this->show($request, $schedule);
    }

    public function cancel(Request $request, int $schedule): JsonResponse
    {
        $this->owned($request, $schedule);
        abort_if(DB::table('local_call_schedule_items')->where('schedule_id', $schedule)->where('status', 'in_progress')->exists(), 422, 'Finish the active call first.');
        DB::table('local_call_schedules')->where('id', $schedule)->update(['status' => 'cancelled', 'updated_at' => now()]);
        return $this->show($request, $schedule);
    }

    public function completeIfDone(int $schedule): void
    {
        if (! DB::table('local_call_schedule_items')->where('schedule_id', $schedule)->whereIn('status', ['pending', 'in_progress'])->exists()) {
            DB::table('local_call_schedules')->where('id', $schedule)->update(['status' => 'completed', 'updated_at' => now()]);
        }
    }

    private function owned(Request $request, int $schedule): object
    {
        $record = DB::table('local_call_schedules')->where('id', $schedule)
            ->where('organization_id', $request->attributes->get('admin')->organization_id)->first();
        abort_if(! $record, 404);
        return $record;
    }
}
