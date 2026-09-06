<?php

declare(strict_types=1);

/**
 * Turns a password into the bcrypt hash that belongs in .env.
 *
 * The plain password is never written to a file — only this hash, which cannot
 * be turned back into the password.
 *
 *   php bin/set-admin-password.php "your new password"
 *
 * Copy the printed line into .env, replacing the existing ADMIN_PASS_HASH.
 */

$password = $argv[1] ?? '';

if ($password === '') {
    fwrite(STDERR, "\n  Usage: php bin/set-admin-password.php \"your new password\"\n\n");
    exit(2);
}

if (strlen($password) < 8) {
    fwrite(STDERR, "\n  Too short. Use at least 8 characters.\n\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_BCRYPT);

echo "\n  Put this line in .env (replace the existing one):\n\n";
echo '  ADMIN_PASS_HASH=' . $hash . "\n\n";
echo "  The password itself is not stored anywhere. Keep it somewhere safe.\n\n";
