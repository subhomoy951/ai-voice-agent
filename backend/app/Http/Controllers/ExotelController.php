<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Services\ScheduleCapture;
use App\Services\FollowUpContext;
use App\Services\KnowledgeSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class ExotelController extends Controller
{
    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'contact_id' => ['required', 'integer'],
            'assistant_name' => ['required', 'in:Deblina,Subrata,Lead Qualification,Appointment Coordinator,Follow-up,Company Information'],
            'topic' => ['required', 'string', 'max:2000'],
        ]);
        $config = config('services.exotel');
        foreach (['api_key', 'api_token', 'account_sid', 'caller_id', 'stream_url', 'callback_url', 'bridge_token', 'callback_token'] as $key) {
            if (! $config['enabled'] || ! $config[$key] || str_starts_with($config[$key], 'dummy_')) {
                return response()->json(['message' => 'Exotel is not configured for live calling.'], 503);
            }
        }
        if (! str_starts_with($config['stream_url'], 'wss://') || ! str_starts_with($config['callback_url'], 'https://')) {
            return response()->json(['message' => 'Exotel requires public WSS and HTTPS URLs.'], 503);
        }
        $organizationId = $request->attributes->get('admin')->organization_id;
        $contact = DB::table('contacts')->where('id', $data['contact_id'])->where('organization_id', $organizationId)->first();
        abort_if(! $contact, 404);
        if ($contact->dnc || $contact->consent_status !== 'granted' || ! preg_match('/^\+[1-9]\d{7,14}$/', $contact->phone ?? '')) {
            throw ValidationException::withMessages(['contact_id' => 'A consented contact with an E.164 phone number is required.']);
        }
        $settings = DB::table('workspace_settings')->where('organization_id', $organizationId)->value('preferences');
        $preferences = $settings ? json_decode($settings, true) : [];
        $timezone = $preferences['timezone'] ?? 'Asia/Kolkata';
        if ($preferences['business_hours_enabled'] ?? false) {
            $now = Carbon::now($timezone);
            if (! in_array($now->dayOfWeek, $preferences['business_days'] ?? [], true)
                || $now->format('H:i') < ($preferences['business_start'] ?? '09:00')
                || $now->format('H:i') >= ($preferences['business_end'] ?? '18:00')) {
                throw ValidationException::withMessages(['contact_id' => 'Outside configured business hours.']);
            }
        }
        $agent = DB::table('ai_agents')->where('organization_id', $organizationId)->where('name', $data['assistant_name'])->where('status', 'active')->first();
        if (! $agent) throw ValidationException::withMessages(['assistant_name' => 'Choose an active AI agent.']);
        if ($agent->name === 'Follow-up' && ! app(FollowUpContext::class)->forContact($organizationId, $contact->id)) {
            throw ValidationException::withMessages(['contact_id' => 'A completed earlier call is required for a follow-up.']);
        }

        $callId = DB::transaction(function () use ($contact, $agent, $data, $organizationId, $timezone) {
            $leadId = $contact->legacy_lead_id ?: DB::table('leads')->insertGetId([
                'organization_id' => $organizationId, 'name' => $contact->name,
                'phone' => $contact->phone, 'created_at' => now(),
            ]);
            return DB::table('calls')->insertGetId([
                'organization_id' => $organizationId, 'lead_id' => $leadId, 'contact_id' => $contact->id,
                'ai_agent_id' => $agent->id, 'agent_version' => $agent->version,
                'direction' => 'outbound', 'provider' => 'exotel', 'destination_phone' => $contact->phone,
                'assistant_name' => $agent->name, 'timezone' => $timezone,
                'summary' => 'Call objective: '.$data['topic'], 'status' => 'queued', 'created_at' => now(),
            ]);
        });
        $expires = now()->addMinutes(5)->timestamp;
        $signature = hash_hmac('sha256', $callId.'.'.$expires, $config['bridge_token']);
        $streamUrl = $config['stream_url'].(str_contains($config['stream_url'], '?') ? '&' : '?').http_build_query([
            'call_id' => $callId, 'expires' => $expires, 'signature' => $signature, 'sample-rate' => 24000,
        ]);
        $callbackUrl = $config['callback_url'].(str_contains($config['callback_url'], '?') ? '&' : '?').'token='.rawurlencode($config['callback_token']);
        try {
            $response = Http::withBasicAuth($config['api_key'], $config['api_token'])->asMultipart()->timeout(15)->post(
                rtrim($config['api_base'], '/').'/v1/Accounts/'.rawurlencode($config['account_sid']).'/Calls/connect',
                [
                    ['name' => 'From', 'contents' => $contact->phone],
                    ['name' => 'CallerId', 'contents' => $config['caller_id']],
                    ['name' => 'StreamUrl', 'contents' => $streamUrl],
                    ['name' => 'StreamType', 'contents' => 'bidirectional'],
                    ['name' => 'CustomField', 'contents' => (string) $callId],
                    ['name' => 'StatusCallback', 'contents' => $callbackUrl],
                    ['name' => 'StatusCallbackEvents[]', 'contents' => 'terminal'],
                    ['name' => 'TimeLimit', 'contents' => (string) (min(120, max(1, (int) ($preferences['max_call_minutes'] ?? 15))) * 60)],
                ]
            );
            $sid = $response->json('Call.Sid');
            if (! $response->successful() || ! is_string($sid) || $sid === '') {
                throw new \RuntimeException('Exotel did not accept the call.');
            }
            DB::table('calls')->where('id', $callId)->update(['provider_call_id' => $sid]);
        } catch (\Throwable $error) {
            DB::table('calls')->where('id', $callId)->update(['status' => 'failed', 'outcome' => 'provider_error', 'ended_at' => now()]);
            return response()->json(['message' => 'Exotel could not start the call.', 'call_id' => $callId], 502);
        }
        return response()->json(['id' => $callId, 'provider_call_id' => $sid, 'status' => 'queued'], 201);
    }

    public function callback(Request $request): JsonResponse
    {
        $secret = config('services.exotel.callback_token');
        abort_unless($secret && hash_equals($secret, (string) $request->query('token', '')), 401);
        $sid = $request->input('CallSid');
        $callId = $request->input('CustomField');
        if (! is_string($sid) || ! ctype_digit((string) $callId)) return response()->json(['ignored' => true]);
        DB::transaction(function () use ($sid, $callId, $request) {
            $call = DB::table('calls')->where('id', $callId)->where('provider', 'exotel')->lockForUpdate()->first();
            if (! $call || ($call->provider_call_id && $call->provider_call_id !== $sid)) return;
            $status = $request->input('Status');
            $update = ['provider_call_id' => $sid];
            if ($request->input('EventType') === 'terminal' && in_array($status, ['completed', 'failed', 'busy', 'no-answer'], true)) {
                if (! in_array($call->status, ['completed', 'failed'], true)) {
                    $update['status'] = $status === 'completed' ? 'completed' : 'failed';
                    $update['outcome'] = $status;
                    $update['ended_at'] = now();
                    $update['duration_seconds'] = max(0, (int) $request->input('ConversationDuration', 0));
                }
            }
            DB::table('calls')->where('id', $callId)->update($update);
        });
        if (DB::table('calls')->where('id', $callId)->where('provider', 'exotel')->where('status', 'completed')->exists()) {
            app(ScheduleCapture::class)->fromCompletedCall((int) $callId);
        }
        return response()->json(['ok' => true]);
    }

    public function context(Request $request, int $call): JsonResponse
    {
        $this->authenticateBridge($request);
        $record = DB::table('calls')->where('calls.id', $call)->where('calls.provider', 'exotel')
            ->join('contacts', 'contacts.id', '=', 'calls.contact_id')
            ->leftJoin('ai_agents', 'ai_agents.id', '=', 'calls.ai_agent_id')
            ->leftJoin('workspace_settings', 'workspace_settings.organization_id', '=', 'calls.organization_id')
            ->select('calls.id', 'calls.organization_id', 'calls.contact_id', 'calls.assistant_name', 'calls.summary', 'calls.timezone', 'calls.status',
                'contacts.name as contact_name', 'contacts.company', 'ai_agents.language', 'ai_agents.opening_message',
                'ai_agents.purpose', 'ai_agents.voice', 'ai_agents.system_prompt', 'workspace_settings.preferences')->first();
        abort_if(! $record || in_array($record->status, ['completed', 'failed'], true), 404);
        $record->preferences = $record->preferences ? json_decode($record->preferences, true) : [];
        $record->previous_context = $record->assistant_name === 'Follow-up'
            ? app(FollowUpContext::class)->forContact((int) $record->organization_id, (int) $record->contact_id, $call)
            : null;
        DB::table('calls')->where('id', $call)->where('status', 'queued')->update(['status' => 'in_progress', 'started_at' => now()]);
        return response()->json($record);
    }

    public function transcript(Request $request, int $call): JsonResponse
    {
        $this->authenticateBridge($request);
        $data = $request->validate(['speaker' => ['required', 'in:ai,customer'], 'message' => ['required', 'string', 'max:10000']]);
        abort_unless(DB::table('calls')->where('id', $call)->where('provider', 'exotel')->exists(), 404);
        DB::table('call_messages')->insert([
            'call_id' => $call, 'speaker' => $data['speaker'], 'message' => $data['message'], 'spoken_at' => now(),
        ]);
        return response()->json(['ok' => true], 201);
    }

    public function knowledgeSearch(Request $request, int $call, KnowledgeSearch $search): JsonResponse
    {
        $this->authenticateBridge($request);
        $data = $request->validate(['question' => ['required', 'string', 'max:2000']]);
        $record = DB::table('calls')->where('id', $call)->where('provider', 'exotel')
            ->whereIn('status', ['queued', 'in_progress'])->first(['organization_id', 'ai_agent_id']);
        abort_if(! $record, 404);
        $passages = $search->find((int) $record->organization_id, $data['question'], $record->ai_agent_id);
        foreach ($passages as $passage) {
            DB::table('call_knowledge_uses')->insert([
                'organization_id' => $record->organization_id, 'call_id' => $call,
                'document_id' => $passage->document_id, 'chunk_id' => $passage->id,
                'question' => $data['question'], 'document_title' => $passage->document_title,
                'page_number' => $passage->page_number, 'created_at' => now(),
            ]);
        }
        return response()->json(['passages' => array_map(fn ($passage) => [
            'document_title' => $passage->document_title, 'page_number' => $passage->page_number,
            'section' => $passage->section, 'content' => $passage->content,
        ], $passages)]);
    }

    private function authenticateBridge(Request $request): void
    {
        $secret = config('services.exotel.bridge_token');
        abort_unless($secret && $request->bearerToken() && hash_equals($secret, $request->bearerToken()), 401);
    }
}
