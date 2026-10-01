<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use App\Services\ScheduleCapture;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Artisan::command('schedule:extract-history {--call=}', function (ScheduleCapture $capture) {
    $query = DB::table('calls')->where('status', 'completed')->orderBy('id');
    if ($this->option('call')) {
        $query->where('id', (int) $this->option('call'));
    }
    $count = 0;
    foreach ($query->pluck('id') as $callId) {
        $capture->fromCall($callId);
        $capture->fromCompletedCall($callId);
        $count++;
    }
    $events = DB::table('schedule_events')->count();
    $this->info("Scanned {$count} completed call(s). {$events} schedule event(s) stored.");
})->purpose('Extract future schedule events from saved call transcripts');
