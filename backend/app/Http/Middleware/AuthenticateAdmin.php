<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! $token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $session = DB::table('admin_tokens')
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->first();
        $admin = $session ? AdminUser::find($session->admin_user_id) : null;
        if (! $admin || ! $admin->is_active) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! $admin->organization_id) {
            $admin->organization_id = DB::table('organizations')->orderBy('id')->value('id');
            $admin->save();
        }

        $request->attributes->set('admin', $admin);

        return $next($request);
    }
}
