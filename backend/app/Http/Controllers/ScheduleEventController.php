<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ScheduleEventController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('schedule_events')
            ->join('calls', 'calls.id', '=', 'schedule_events.call_id')
            ->join('leads', 'leads.id', '=', 'calls.lead_id')
            ->where('starts_at', '>=', now()->utc())
            ->select('schedule_events.*', 'leads.name as lead_name')
            ->orderBy('starts_at')
            ->get());
    }

    public function store(Request $request, int $call): JsonResponse
    {
        abort_unless(DB::table('calls')->where('id', $call)->exists(), 404);
        if ($request->input('timezone') === 'Asia/Calcutta') {
            $request->merge(['timezone' => 'Asia/Kolkata']);
        }
        $data = $request->validate([
            'event_type' => ['required', Rule::in(['meeting', 'interview', 'call_reminder', 'other'])],
            'title' => ['required', 'string', 'max:160'],
            'details' => ['nullable', 'string', 'max:2000'],
            'starts_at' => ['required', 'date', 'after:now'],
            'timezone' => ['required', 'timezone', 'max:64'],
        ]);
        $data['starts_at'] = Carbon::parse($data['starts_at'])->utc()->format('Y-m-d H:i:s');

        // Reprocessing a transcript should update the same call appointment.
        $existing = DB::table('schedule_events')->where('call_id', $call)
            ->where('event_type', $data['event_type'])
            ->where('starts_at', $data['starts_at'])->first();
        if ($existing) {
            DB::table('schedule_events')->where('id', $existing->id)->update([
                'title' => $data['title'], 'details' => $data['details'] ?? null, 'updated_at' => now(),
            ]);
            return response()->json(['id' => $existing->id]);
        }

        $id = DB::table('schedule_events')->insertGetId([
            'call_id' => $call, 'event_type' => $data['event_type'],
            'title' => $data['title'], 'details' => $data['details'] ?? null,
            'starts_at' => $data['starts_at'], 'timezone' => $data['timezone'],
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return response()->json(['id' => $id], 201);
    }
}
