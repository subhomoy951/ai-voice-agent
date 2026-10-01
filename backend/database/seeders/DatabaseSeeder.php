<?php

namespace Database\Seeders;

use App\Models\AdminUser;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        AdminUser::updateOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Demo Admin', 'password' => 'Admin@12345', 'is_active' => true]
        );
    }
}
