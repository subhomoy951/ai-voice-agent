<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public static function defaults(): array
    {
        return [
            'business_name' => '', 'contact_email' => '', 'contact_phone' => '', 'logo_url' => '',
            'default_assistant' => 'deblina', 'language' => 'English',
            'greeting' => 'Hello! How can I help you today?', 'instructions' => '',
            'timezone' => 'Asia/Kolkata', 'business_hours_enabled' => false,
            'business_days' => [1, 2, 3, 4, 5], 'business_start' => '09:00', 'business_end' => '18:00',
            'max_call_minutes' => 15, 'callback_preferences' => '',
        ];
    }

    public function show(): JsonResponse
    {
        $stored = DB::table('workspace_settings')->where('id', 1)->value('preferences');
        return response()->json(array_replace(self::defaults(), $stored ? json_decode($stored, true) : []));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_name' => ['present', 'nullable', 'string', 'max:160'],
            'contact_email' => ['present', 'nullable', 'email', 'max:255'],
            'contact_phone' => ['present', 'nullable', 'string', 'max:30'],
            'logo_url' => ['present', 'nullable', 'url:http,https', 'max:2000'],
            'default_assistant' => ['required', Rule::in(['deblina', 'subrata'])],
            'language' => ['required', Rule::in(['English', 'Hindi', 'Bengali'])],
            'greeting' => ['required', 'string', 'max:500'],
            'instructions' => ['present', 'nullable', 'string', 'max:5000'],
            'timezone' => ['required', 'timezone'],
            'business_hours_enabled' => ['required', 'boolean'],
            'business_days' => ['required', 'array', 'min:1', 'max:7'],
            'business_days.*' => ['integer', 'between:0,6', 'distinct'],
            'business_start' => ['required', 'date_format:H:i'],
            'business_end' => ['required', 'date_format:H:i', 'after:business_start'],
            'max_call_minutes' => ['required', 'integer', 'between:1,120'],
            'callback_preferences' => ['present', 'nullable', 'string', 'max:2000'],
        ]);
        foreach (['business_name', 'contact_email', 'contact_phone', 'logo_url', 'instructions', 'callback_preferences'] as $field) {
            $data[$field] = $data[$field] ?? '';
        }
        DB::table('workspace_settings')->updateOrInsert(['id' => 1], [
            'preferences' => json_encode($data), 'updated_at' => now(), 'created_at' => now(),
        ]);
        return response()->json($data);
    }

    public function account(Request $request): JsonResponse
    {
        $admin = $request->attributes->get('admin');
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower($request->input('email'))]);
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('admin_users')->ignore($admin->id)],
            'current_password' => ['required', 'string'],
            'password' => ['nullable', 'string', 'min:12', 'max:128', 'confirmed'],
        ]);
        if (!Hash::check($data['current_password'], $admin->password)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password is incorrect.']);
        }
        DB::transaction(function () use ($admin, $data, $request) {
            $admin->name = $data['name'];
            $admin->email = strtolower($data['email']);
            if (!empty($data['password'])) $admin->password = $data['password'];
            $admin->save();
            if (!empty($data['password'])) {
                DB::table('admin_tokens')->where('admin_user_id', $admin->id)
                    ->where('token_hash', '!=', hash('sha256', $request->bearerToken()))->delete();
            }
        });
        return response()->json($admin->only('id', 'name', 'email'));
    }
}
