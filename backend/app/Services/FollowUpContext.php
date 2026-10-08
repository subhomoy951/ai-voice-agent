<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class FollowUpContext
{
    public function forContact(int $organizationId, int $contactId, ?int $beforeCallId = null): ?string
    {
        $query = DB::table('calls')->where('organization_id', $organizationId)
            ->where('contact_id', $contactId)->where('status', 'completed');
        if ($beforeCallId !== null) {
            $query->where('id', '<', $beforeCallId);
        }
        $previous = $query->orderByDesc('id')->first(['id', 'summary', 'outcome', 'ended_at']);
        if (! $previous) {
            return null;
        }

        $messages = DB::table('call_messages')->where('call_id', $previous->id)
            ->orderByDesc('id')->limit(6)->get(['speaker', 'message'])->reverse()
            ->map(fn ($message) => ucfirst($message->speaker).': '.mb_substr($message->message, 0, 350))
            ->implode("\n");

        return trim('Previous call #'.$previous->id.' ('.($previous->ended_at ?: 'date unknown').")\n"
            .'Outcome: '.($previous->outcome ?: 'unknown')."\n"
            .'Summary: '.mb_substr($previous->summary ?: 'none', 0, 1500)."\n"
            .'Recent conversation: '.($messages ?: 'not available'));
    }
}
