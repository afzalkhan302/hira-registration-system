<?php

declare(strict_types=1);

/**
 * Set the staff password AND write it straight into .env — no copy-paste step.
 *
 *   php bin/reset-admin-password.php "your new password"
 *   php bin/reset-admin-password.php "your new password" someusername
 *
 * The plain password is never stored: only its bcrypt hash is written, exactly
 * where api/lib/auth.php reads it from. The username is optional; leave it off
 * to keep the existing ADMIN_USER. On success it re-reads .env and verifies the
 * hash against the password, so a bad write can never pass silently.
 *
 * This is a sibling of set-admin-password.php (which only prints the line for
 * you to paste); use whichever you prefer.
 */

$root    = dirname(__DIR__);
$envPath = $root . '/.env';

$password = $argv[1] ?? '';
$username = $argv[2] ?? null;

if ($password === '') {
    fwrite(STDERR, "\n  Usage: php bin/reset-admin-password.php \"your new password\" [username]\n\n");
    exit(2);
}

if (strlen($password) < 8) {
    fwrite(STDERR, "\n  Too short. Use at least 8 characters.\n\n");
    exit(1);
}

if (!is_file($envPath)) {
    fwrite(STDERR, "\n  No .env found at: $envPath\n  Copy .env.example to .env first.\n\n");
    exit(1);
}

$env = file_get_contents($envPath);

if ($env === false) {
    fwrite(STDERR, "\n  Could not read .env (check file permissions).\n\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_BCRYPT);

/**
 * Replace (or append) one KEY=value line, preserving every other line exactly.
 * The value is escaped so preg_replace treats "$" and "\" in a bcrypt hash as
 * literal text, never as backreferences.
 */
$setLine = static function (string $env, string $key, string $value): string {
    $replacement = str_replace(['\\', '$'], ['\\\\', '\\$'], $key . '=' . $value);
    $pattern     = '/^' . preg_quote($key, '/') . '=.*$/m';

    if (preg_match($pattern, $env)) {
        return preg_replace($pattern, $replacement, $env, 1);
    }

    return rtrim($env, "\r\n") . "\n" . $key . '=' . $value . "\n";
};

$env = $setLine($env, 'ADMIN_PASS_HASH', $hash);

if ($username !== null && $username !== '') {
    $env = $setLine($env, 'ADMIN_USER', $username);
}

if (file_put_contents($envPath, $env) === false) {
    fwrite(STDERR, "\n  Could not write .env (check file permissions).\n\n");
    exit(1);
}

// Re-read through the app's own loader and prove the credential works.
require $root . '/api/lib/env.php';
Env::load($envPath);

$storedHash = (string) Env::get('ADMIN_PASS_HASH', '');
$storedUser = (string) Env::get('ADMIN_USER', '');

if (!password_verify($password, $storedHash)) {
    fwrite(STDERR, "\n  Wrote .env but verification FAILED. The password was not changed cleanly.\n\n");
    exit(1);
}

echo "\n  Admin password updated in .env.\n";
echo "  Username : " . $storedUser . "\n";
echo "  Verified : the new password matches the stored hash.\n";
echo "  The password itself is not stored anywhere. Keep it somewhere safe.\n\n";
