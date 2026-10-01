<?php

namespace App\Http\Controllers;

use App\Models\AdminUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = AdminUser::where('email', strtolower($credentials['email']))->first();
        if (! $admin || ! $admin->is_active || ! Hash::check($credentials['password'], $admin->password)) {
            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        $token = bin2hex(random_bytes(32));
        DB::table('admin_tokens')->insert([
            'admin_user_id' => $admin->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDays(7),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['token' => $token, 'admin' => $admin->only('id', 'name', 'email')]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->attributes->get('admin')->only('id', 'name', 'email'));
    }

    public function logout(Request $request): JsonResponse
    {
        DB::table('admin_tokens')->where('token_hash', hash('sha256', $request->bearerToken()))->delete();

        return response()->json(['message' => 'Signed out.']);
    }
}
