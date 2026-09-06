<?php

declare(strict_types=1);

/**
 * Reads key=value pairs from the project's .env file.
 *
 * Values are kept in a private static array rather than being pushed into
 * $_ENV or getenv(), so a stray var_dump($_ENV) or a phpinfo() page cannot
 * leak the database password.
 */
final class Env
{
    /** @var array<string,string> */
    private static array $values = [];

    private static bool $loaded = false;

    public static function load(string $path): void
    {
        self::$loaded = true;

        if (!is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);

            $key   = trim($key);
            $value = trim($value);

            // Strip one matching pair of surrounding quotes, so a password
            // containing spaces or a "#" can be written as "pa ss#word".
            if (strlen($value) >= 2) {
                $first = $value[0];
                $last  = $value[strlen($value) - 1];

                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            if ($key !== '') {
                self::$values[$key] = $value;
            }
        }
    }

    public static function isLoaded(): bool
    {
        return self::$loaded;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return self::$values[$key] ?? $default;
    }

    public static function required(string $key): string
    {
        $value = self::$values[$key] ?? '';

        if ($value === '') {
            // The message names the key but never a value, so a misconfigured
            // server cannot be made to print its own credentials.
            throw new RuntimeException(sprintf('%s is missing from .env', $key));
        }

        return $value;
    }
}
