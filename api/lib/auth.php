<?php

declare(strict_types=1);

/**
 * Staff sign-in: username, password, and a server-side session.
 *
 * The password is never stored anywhere — only a bcrypt hash of it, in .env,
 * which the browser never downloads. Signing in exchanges the credentials for a
 * session cookie; every later request is recognised by that cookie, so the
 * password crosses the wire exactly once.
 *
 * The cookie is httponly, so page scripts cannot read it, and SameSite=Lax, so
 * another site cannot make the browser send it on a top-level navigation. The
 * gap that leaves is a cross-site POST, which SameSite=Lax still permits, so
 * every action that changes anything also carries a CSRF token that only this
 * origin's JavaScript can know.
 */
final class Auth
{
    private const SESSION_NAME = 'hira_staff';

    /** Signed out after this long with no activity. */
    private const IDLE_MINUTES = 60;

    /** With "keep me signed in", the cookie survives a closed browser. */
    private const REMEMBER_DAYS = 14;

    /** After this many failures from one address, sign-in pauses. */
    private const MAX_ATTEMPTS = 6;

    private const LOCKOUT_MINUTES = 15;

    private static string $throttleDir = '';

    public static function boot(string $storageDir): void
    {
        self::$throttleDir = $storageDir . '/throttle';

        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $secure = (($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off')
            || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

        session_name(self::SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => 0,          // raised on sign-in when "remember" is ticked
            'path'     => '/',
            'httponly' => true,       // out of reach of any script on the page
            'secure'   => $secure,    // https only, once the site is on https
            'samesite' => 'Lax',
        ]);

        session_start();
    }

    /**
     * @return array{0:bool,1:string} success, and the message when it fails
     */
    public static function signIn(string $username, string $password, bool $remember): array
    {
        if (self::isLockedOut()) {
            return [false, sprintf(
                'Too many failed attempts. Try again in %d minutes.',
                self::LOCKOUT_MINUTES
            )];
        }

        $expectedUser = (string) Env::get('ADMIN_USER', '');
        $expectedHash = (string) Env::get('ADMIN_PASS_HASH', '');

        if ($expectedUser === '' || $expectedHash === '') {
            return [false, 'No staff account is configured. Set ADMIN_USER and ADMIN_PASS_HASH in .env.'];
        }

        /*
         * The password is verified even when the username is already wrong, so
         * both failures take the same time. Otherwise the speed of the reply
         * would tell an attacker which usernames exist.
         */
        $userOk = hash_equals($expectedUser, $username);
        $passOk = password_verify($password, $expectedHash);

        if (!$userOk || !$passOk) {
            self::recordFailure();

            return [false, 'Those details were not accepted.'];
        }

        self::clearFailures();

        // A new id on sign-in, so a session id someone else may have seen
        // before you signed in cannot become a signed-in one.
        session_regenerate_id(true);

        $_SESSION['admin'] = [
            'user'  => $expectedUser,
            'since' => time(),
            'seen'  => time(),
            'csrf'  => bin2hex(random_bytes(32)),
        ];

        if ($remember) {
            $params = session_get_cookie_params();
            setcookie(session_name(), session_id(), [
                'expires'  => time() + self::REMEMBER_DAYS * 86400,
                'path'     => $params['path'],
                'httponly' => true,
                'secure'   => $params['secure'],
                'samesite' => 'Lax',
            ]);
        }

        return [true, ''];
    }

    public static function signOut(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires'  => time() - 42000,
                'path'     => $params['path'],
                'httponly' => true,
                'secure'   => $params['secure'],
                'samesite' => 'Lax',
            ]);
        }

        session_destroy();
    }

    /**
     * Is there a signed-in staff member behind this request?
     *
     * Idle time is measured on every call, so a dashboard left open on a shared
     * computer stops working on its own rather than staying open all night.
     */
    public static function check(): bool
    {
        $admin = $_SESSION['admin'] ?? null;

        if (!is_array($admin) || !isset($admin['seen'])) {
            return false;
        }

        if (time() - (int) $admin['seen'] > self::IDLE_MINUTES * 60) {
            self::signOut();

            return false;
        }

        $_SESSION['admin']['seen'] = time();

        return true;
    }

    public static function user(): string
    {
        return (string) ($_SESSION['admin']['user'] ?? '');
    }

    public static function csrfToken(): string
    {
        return (string) ($_SESSION['admin']['csrf'] ?? '');
    }

    /**
     * The session cookie alone is not proof the request was intended: a form on
     * another site can post to us and the browser will attach it. This token is
     * only ever handed to this origin's own JavaScript, so a cross-site request
     * cannot produce it.
     */
    public static function csrfValid(mixed $sent): bool
    {
        $expected = self::csrfToken();

        return $expected !== '' && is_string($sent) && $sent !== '' && hash_equals($expected, $sent);
    }

    // -----------------------------------------------------------------------
    // Throttling. Kept in a file per address rather than in the session, which
    // an attacker would simply discard between attempts.
    // -----------------------------------------------------------------------

    private static function throttleFile(): string
    {
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

        return self::$throttleDir . '/' . hash('sha256', $ip) . '.json';
    }

    private static function isLockedOut(): bool
    {
        $file = self::throttleFile();

        if (!is_file($file)) {
            return false;
        }

        $state = json_decode((string) file_get_contents($file), true);

        if (!is_array($state)) {
            return false;
        }

        $count = (int) ($state['count'] ?? 0);
        $last  = (int) ($state['last'] ?? 0);

        if (time() - $last > self::LOCKOUT_MINUTES * 60) {
            @unlink($file); // the window has passed; start again

            return false;
        }

        return $count >= self::MAX_ATTEMPTS;
    }

    private static function recordFailure(): void
    {
        $dir = self::$throttleDir;

        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            return; // cannot throttle; the password check still stands
        }

        $file  = self::throttleFile();
        $state = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
        $count = is_array($state) ? (int) ($state['count'] ?? 0) : 0;

        @file_put_contents($file, json_encode(['count' => $count + 1, 'last' => time()]));
    }

    private static function clearFailures(): void
    {
        $file = self::throttleFile();

        if (is_file($file)) {
            @unlink($file);
        }
    }
}
