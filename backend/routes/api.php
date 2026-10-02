<?php

use App\Http\Controllers\CallRecordController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\ScheduleEventController;
use App\Http\Controllers\SettingsController;
use App\Http\Middleware\AuthenticateAdmin;
use Illuminate\Support\Facades\Route;

Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:5,1');
Route::middleware(AuthenticateAdmin::class)->group(function () {
    Route::get('/admin/me', [AdminAuthController::class, 'me']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    Route::get('/admin/settings', [SettingsController::class, 'show']);
    Route::put('/admin/settings', [SettingsController::class, 'update']);
    Route::put('/admin/account', [SettingsController::class, 'account'])->middleware('throttle:5,1');
    Route::get('/leads', [LeadController::class, 'index']);
    Route::post('/leads', [LeadController::class, 'store']);
    Route::get('/call-records', [CallRecordController::class, 'index']);
    Route::get('/call-records/{call}', [CallRecordController::class, 'show']);
    Route::post('/call-records', [CallRecordController::class, 'store']);
    Route::post('/call-records/{call}/messages', [CallRecordController::class, 'storeMessage']);
    Route::patch('/call-records/{call}', [CallRecordController::class, 'update']);
    Route::get('/schedule-events', [ScheduleEventController::class, 'index']);
    Route::post('/call-records/{call}/schedule-events', [ScheduleEventController::class, 'store']);
});
