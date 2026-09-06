<?php

declare(strict_types=1);

/**
 * One PDO connection per request, built from .env.
 *
 * Emulated prepares are switched off so MySQL parses the statement and the
 * values separately — the values can never be read as SQL, whatever an
 * applicant types into the form.
 */
final class Db
{
    private static ?PDO $pdo = null;

    public static function get(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = Env::get('DB_HOST', '127.0.0.1');
        $port = Env::get('DB_PORT', '3306');
        $name = Env::required('DB_NAME');

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

        self::$pdo = new PDO($dsn, Env::required('DB_USER'), Env::get('DB_PASS', '') ?? '', [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);

        return self::$pdo;
    }

    /**
     * @param  array<int|string,mixed> $bindings
     */
    public static function run(string $sql, array $bindings = []): PDOStatement
    {
        $statement = self::get()->prepare($sql);
        $statement->execute($bindings);

        return $statement;
    }

    /**
     * @param  array<int|string,mixed> $bindings
     * @return array<int,array<string,mixed>>
     */
    public static function all(string $sql, array $bindings = []): array
    {
        return self::run($sql, $bindings)->fetchAll();
    }

    /**
     * @param  array<int|string,mixed> $bindings
     * @return array<string,mixed>|null
     */
    public static function one(string $sql, array $bindings = []): ?array
    {
        $row = self::run($sql, $bindings)->fetch();

        return $row === false ? null : $row;
    }

    /**
     * @param array<int|string,mixed> $bindings
     */
    public static function scalar(string $sql, array $bindings = []): mixed
    {
        return self::run($sql, $bindings)->fetchColumn();
    }
}
