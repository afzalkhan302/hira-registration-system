<?php

declare(strict_types=1);

/**
 * JSON replies, in the shape the front end expects.
 *
 * Every reply carries "ok": true or false, so the pages never have to inspect a
 * status code to know what happened. A failure may also carry "fields", which
 * the registration form paints onto the individual inputs.
 */
final class Respond
{
    /**
     * @param array<string,mixed> $payload
     */
    public static function json(array $payload, int $status = 200): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
            header('X-Content-Type-Options: nosniff');

            self::cors();
        }

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        exit;
    }

    public static function ok(array $extra = []): never
    {
        self::json(['ok' => true] + $extra);
    }

    /**
     * @param array<string,string> $fields per-field messages for the form
     */
    public static function fail(string $error, array $fields = [], int $code = 0): never
    {
        $payload = ['ok' => false, 'error' => $error];

        if ($fields !== []) {
            $payload['fields'] = $fields;
        }

        if ($code !== 0) {
            $payload['code'] = $code;
        }

        self::json($payload);
    }

    /**
     * Allow the page to call this API from another origin.
     *
     * Served from the same host — the normal case — this changes nothing. It
     * matters only if the pages are hosted apart from the API, and it is
     * restricted to a list you control in .env rather than a blanket "*",
     * because a blanket rule would let any site on the internet post
     * applications into your database.
     */
    private static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ($origin === '') {
            return; // same-origin request; no header needed
        }

        $allowed = array_filter(array_map('trim', explode(',', (string) Env::get('ALLOWED_ORIGINS', ''))));

        if (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            // Named origin, never "*", because the staff session cookie rides
            // along with these requests and the browser refuses to send it to a
            // wildcard.
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        }
    }
}
