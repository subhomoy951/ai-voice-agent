<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReportingAgentController extends Controller
{
    public function answer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'topic' => ['required', Rule::in(['activity', 'outcomes', 'appointments', 'review'])],
            'days' => ['required', Rule::in([7, 30, 90])],
            'assistant' => ['nullable', 'string', 'max:120'],
        ]);
        $organizationId = $request->attributes->get('admin')->organization_id;
        $agent = DB::table('ai_agents')->where('organization_id', $organizationId)
            ->where('name', 'Reporting')->where('status', 'active')->first();
        abort_if(! $agent, 404);
        $query = DB::table('calls')->where('calls.organization_id', $organizationId)
            ->where('calls.created_at', '>=', now()->subDays((int) $data['days']))
            ->leftJoin('leads', 'leads.id', '=', 'calls.lead_id');
        if (! empty($data['assistant']) && $data['assistant'] !== 'all') {
            $query->where('calls.assistant_name', $data['assistant']);
        }
        $calls = $query->get(['calls.id', 'calls.status', 'calls.outcome', 'calls.assistant_name',
            'calls.created_at', 'leads.name as contact_name']);
        $topic = $data['topic'];
        $evidence = collect();
        $facts = [];

        if ($topic === 'activity') {
            $facts = [
                'Total calls' => $calls->count(),
                'Completed' => $calls->where('status', 'completed')->count(),
                'Failed' => $calls->where('status', 'failed')->count(),
                'In progress' => $calls->where('status', 'in_progress')->count(),
                'Queued' => $calls->where('status', 'queued')->count(),
            ];
            $evidence = $calls->sortByDesc('id');
        } elseif ($topic === 'outcomes') {
            $facts = $calls->whereIn('status', ['completed', 'failed'])
                ->groupBy(fn ($call) => $call->outcome ?: 'No recorded outcome')
                ->map(fn ($group) => $group->count())->sortKeys()->all();
            $evidence = $calls->whereIn('status', ['completed', 'failed'])->sortByDesc('id');
        } elseif ($topic === 'appointments') {
            $ids = $calls->pluck('id')->all();
            $events = $ids ? DB::table('schedule_events')->where('organization_id', $organizationId)
                ->whereIn('call_id', $ids)->whereIn('event_type', ['meeting', 'interview', 'call_reminder'])
                ->get(['call_id', 'event_type', 'status']) : collect();
            $facts = [
                'Meetings' => $events->where('event_type', 'meeting')->count(),
                'Interviews' => $events->where('event_type', 'interview')->count(),
                'Call reminders' => $events->where('event_type', 'call_reminder')->count(),
            ];
            $evidence = $calls->whereIn('id', $events->pluck('call_id')->all())->sortByDesc('id');
        } else {
            $evidence = $calls->where('status', 'completed')
                ->filter(fn ($call) => ! $call->outcome || in_array($call->outcome, ['completed', 'local_outgoing', 'browser_test'], true))
                ->sortByDesc('id');
            $facts = ['Completed calls with no specific outcome' => $evidence->count()];
        }

        return response()->json([
            'agent' => $agent->name,
            'topic' => $topic,
            'days' => (int) $data['days'],
            'facts' => $facts,
            'scope' => 'All saved calls created in the last '.$data['days'].' days'.(! empty($data['assistant']) && $data['assistant'] !== 'all' ? ' for '.$data['assistant'] : '').'.',
            'note' => $topic === 'review'
                ? 'These calls need an admin to inspect the transcript. A generic completion status does not establish interest or a promised follow-up.'
                : ($topic === 'appointments' ? 'Counts reflect saved calendar events linked to calls in this period; they do not prove attendance.' : null),
            'evidence_total' => $evidence->count(),
            'evidence' => $evidence->take(20)->values()->map(fn ($call) => [
                'call_id' => $call->id, 'contact_name' => $call->contact_name,
                'created_at' => $call->created_at, 'status' => $call->status, 'outcome' => $call->outcome,
            ])->all(),
        ]);
    }
}
