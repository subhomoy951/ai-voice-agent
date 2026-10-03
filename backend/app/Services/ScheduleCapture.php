<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ScheduleCapture
{
    public function fromCompletedCall(int $callId): void
    {
        $this->fromCall($callId);
        $call = DB::table('calls')->where('id', $callId)->first();
        if (! $call) {
            return;
        }
        $messages = DB::table('call_messages')->where('call_id', $callId)->orderBy('id')->get();
        $customerText = $messages->where('speaker', 'customer')->pluck('message')->implode("\n");
        if (! preg_match('/\b(meet(?:ing)?|interview|remind(?:er)?|calendar|schedule|appointment|tomorrow|next\s+week|next\s+month|call\s+(?:me|back|on))\b|\b\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+20\d{2}\b/i', $customerText)) {
            return;
        }

        $lines = $messages->map(fn ($message) => ($message->speaker === 'customer' ? 'Customer' : 'Assistant').': '.$message->message)->all();
        $url = rtrim((string) config('services.schedule_ai.url'), '/').'/api/schedule/extract';
        $timezone = $call->timezone ?: 'Asia/Kolkata';
        for ($offset = 0; $offset < count($lines); $offset += 65) {
            $chunk = array_slice($lines, $offset, 80);
            try {
                $response = Http::timeout(30)->post($url, [
                    'transcript' => array_map(fn ($line) => mb_substr($line, 0, 2000), $chunk),
                    'timezone' => $timezone,
                    'now' => now()->toIso8601String(),
                ]);
                if (! $response->successful()) {
                    Log::warning('Call schedule extraction failed', ['call_id' => $callId, 'status' => $response->status()]);
                    continue;
                }
                foreach ($response->json('events', []) as $event) {
                    $this->saveExtractedEvent($callId, $timezone, $event);
                }
            } catch (\Throwable $error) {
                Log::warning('Call schedule extraction unavailable', ['call_id' => $callId, 'error' => $error->getMessage()]);
            }
            if ($offset + 80 >= count($lines)) {
                break;
            }
        }
    }

    private function saveExtractedEvent(int $callId, string $timezone, mixed $event): void
    {
        if (! is_array($event) || ! in_array($event['event_type'] ?? null, ['meeting', 'interview', 'call_reminder', 'other'], true)
            || ! is_string($event['title'] ?? null) || trim($event['title']) === ''
            || ! is_string($event['starts_at'] ?? null)
            || ! preg_match('/(?:Z|[+-]\d{2}:\d{2})$/', $event['starts_at'])) {
            return;
        }
        try {
            $startsAt = Carbon::parse($event['starts_at'])->utc();
        } catch (\Throwable) {
            return;
        }
        if ($startsAt->isPast()) {
            return;
        }
        $type = $event['event_type'];
        $date = $startsAt->format('Y-m-d H:i:s');
        $title = mb_substr(trim($event['title']), 0, 160);
        $details = is_string($event['details'] ?? null) ? mb_substr(trim($event['details']), 0, 2000) : null;
        $existing = DB::table('schedule_events')->where('call_id', $callId)
            ->where('event_type', $type)->where('starts_at', $date)->first();
        if ($existing) {
            DB::table('schedule_events')->where('id', $existing->id)->update([
                'title' => mb_strlen($title) > mb_strlen($existing->title) ? $title : $existing->title,
                'details' => $details && mb_strlen($details) > mb_strlen($existing->details ?? '') ? $details : $existing->details,
                'updated_at' => now(),
            ]);
            return;
        }
        $call = DB::table('calls')->where('id', $callId)->first();
        if (! $call) return;
        $id = DB::table('schedule_events')->insertGetId([
            'organization_id' => $call->organization_id, 'contact_id' => $call->contact_id,
            'call_id' => $callId, 'event_type' => $type, 'title' => $title, 'created_by_type' => 'ai',
            'details' => $details, 'starts_at' => $date, 'timezone' => $timezone,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->recordCreation($id, $callId);
    }

    public function fromCall(int $callId): void
    {
        $messages = DB::table('call_messages')->where('call_id', $callId)->orderBy('id')->get();
        $customerText = $messages->where('speaker', 'customer')->pluck('message')->implode("\n");
        $allText = $messages->pluck('message')->implode("\n");

        // A stated date and time in a customer's scheduling request is enough
        // to create a reminder once its time zone is known from the call.
        if (! preg_match('/\b(schedule|book|set up|remind|meeting|interview|call back|callback)\b/i', $customerText)) {
            return;
        }
        if (! preg_match('/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(20\d{2})\b/i', $customerText, $dateMatch)) {
            return;
        }
        if (! preg_match('/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i', $customerText, $timeMatch)) {
            return;
        }
        if (! preg_match('/\b(IST|India(?:n)?\s+(?:Standard\s+)?Time(?:s)?)\b/i', $allText)) {
            return;
        }

        try {
            $month = Carbon::parse('1 '.$dateMatch[2].' 2000')->month;
            $day = (int) $dateMatch[1];
            $spokenYear = (int) $dateMatch[3];
            $year = $spokenYear;
            $hour = (int) $timeMatch[1] % 12 + (str_starts_with(strtolower($timeMatch[3]), 'p') ? 12 : 0);
            $minute = (int) ($timeMatch[2] ?? 0);
            if (! checkdate($month, $day, $year) || $minute > 59) {
                return;
            }
            $startsAt = Carbon::create($year, $month, $day, $hour, $minute, 0, 'Asia/Kolkata')->utc();
            // A spoken past year is ambiguous; never silently rewrite it.
        } catch (\Throwable) {
            return;
        }
        if ($startsAt->isPast()) {
            return;
        }

        $type = preg_match('/\binterview\b/i', $customerText) ? 'interview'
            : (preg_match('/\b(call back|callback|call reminder)\b/i', $customerText) ? 'call_reminder' : 'meeting');
        $leadName = DB::table('calls')->join('leads', 'leads.id', '=', 'calls.lead_id')
            ->where('calls.id', $callId)->value('leads.name');
        if (! $leadName) {
            return;
        }
        if (preg_match('/\b(?:I am|I\'m|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/', $customerText, $person)) {
            $leadName = $person[1];
        }
        $title = ucfirst(str_replace('_', ' ', $type)).' with '.$leadName;
        $details = 'Scheduled during voice call';
        if (preg_match_all('/\babout\s+([^\n.]+)/i', $customerText, $topics)) {
            foreach ($topics[1] as $topic) {
                if (strlen(trim($topic)) >= 12) {
                    $details = 'Discuss '.trim($topic);
                }
            }
        }
        if (preg_match('/\bAI voice assistant development\b/i', $customerText)) {
            $details = 'Discuss AI voice assistant development';
        }

        $existing = DB::table('schedule_events')->where('call_id', $callId)
            ->where('event_type', $type)->where('starts_at', $startsAt->format('Y-m-d H:i:s'))->first();
        if ($existing) {
            DB::table('schedule_events')->where('id', $existing->id)->update([
                'title' => $title, 'details' => $details, 'updated_at' => now(),
            ]);
            return;
        }
        $call = DB::table('calls')->where('id', $callId)->first();
        if (! $call) return;
        $id = DB::table('schedule_events')->insertGetId([
            'organization_id' => $call->organization_id, 'contact_id' => $call->contact_id,
            'call_id' => $callId, 'event_type' => $type, 'title' => $title, 'details' => $details, 'created_by_type' => 'ai',
            'starts_at' => $startsAt->format('Y-m-d H:i:s'), 'timezone' => 'Asia/Kolkata',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->recordCreation($id, $callId);
    }

    private function recordCreation(int $eventId, int $callId): void
    {
        DB::table('schedule_event_history')->insert([
            'schedule_event_id' => $eventId, 'action' => 'created',
            'new_values' => json_encode(DB::table('schedule_events')->where('id', $eventId)->first()),
            'actor_type' => 'ai', 'call_id' => $callId, 'created_at' => now(),
        ]);
    }
}
