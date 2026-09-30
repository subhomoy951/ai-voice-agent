<?php

use App\Http\Controllers\CallRecordController;
use Illuminate\Support\Facades\Route;

Route::get('/call-records', [CallRecordController::class, 'index']);
Route::get('/call-records/{call}', [CallRecordController::class, 'show']);
Route::post('/call-records', [CallRecordController::class, 'store']);
Route::post('/call-records/{call}/messages', [CallRecordController::class, 'storeMessage']);
Route::patch('/call-records/{call}', [CallRecordController::class, 'update']);
