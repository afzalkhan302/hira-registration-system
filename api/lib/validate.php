<?php

declare(strict_types=1);

/**
 * Field checks for an incoming application.
 *
 * These mirror the ones in assets/js/register.js on purpose. The browser's copy
 * is a courtesy — it saves the applicant a round trip — but anyone can edit it,
 * so this is the copy that decides what reaches the database.
 */
final class Validate
{
    /** @var array<int,string> the only courses on offer */
    public const COURSES = ['DIT', 'Web Development', 'Pharmacy'];

    /** @var array<int,string> */
    public const STATUSES = ['New', 'Contacted', 'Approved', 'Rejected'];

    /** @var array<int,string> */
    public const GENDERS = ['Male', 'Female'];

    /**
     * @param  array<string,mixed> $data
     * @return array{0:array<string,mixed>,1:array<string,string>} cleaned values, field errors
     */
    public static function application(array $data): array
    {
        $clean  = [];
        $errors = [];

        $clean['full_name'] = self::text($data['fullName'] ?? '', 150);
        if (mb_strlen($clean['full_name']) < 3) {
            $errors['fullName'] = 'Please enter the full name.';
        }

        $clean['father_name'] = self::text($data['fatherName'] ?? '', 150);
        if (mb_strlen($clean['father_name']) < 3) {
            $errors['fatherName'] = 'Please enter the father\'s name.';
        }

        $clean['dob'] = self::text($data['dob'] ?? '', 10);
        if (!self::isPlausibleBirthDate($clean['dob'])) {
            $errors['dob'] = 'Please check the date of birth.';
        }

        $clean['gender'] = self::text($data['gender'] ?? '', 10);
        if (!in_array($clean['gender'], self::GENDERS, true)) {
            $errors['gender'] = 'Please choose one.';
        }

        $clean['mobile'] = self::digits($data['mobile'] ?? '');
        if (!self::isMobile($clean['mobile'])) {
            $errors['mobile'] = 'Enter a valid mobile number, e.g. 03001234567.';
        }

        $clean['whatsapp'] = self::digits($data['whatsapp'] ?? '');
        if ($clean['whatsapp'] !== '' && !self::isMobile($clean['whatsapp'])) {
            $errors['whatsapp'] = 'Enter a valid WhatsApp number.';
        }

        $clean['email'] = self::text($data['email'] ?? '', 150);
        if ($clean['email'] !== '' && !filter_var($clean['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid e-mail address.';
        }

        $clean['address'] = self::text($data['address'] ?? '', 300);
        if (mb_strlen($clean['address']) < 5) {
            $errors['address'] = 'Please enter the address.';
        }

        $clean['qualification'] = self::text($data['qualification'] ?? '', 120);
        if ($clean['qualification'] === '') {
            $errors['qualification'] = 'Please enter the last qualification.';
        }

        $clean['course'] = self::text($data['course'] ?? '', 40);
        if (!in_array($clean['course'], self::COURSES, true)) {
            $errors['course'] = 'Please choose one of the courses on offer.';
        }

        $clean['knowledge'] = self::text($data['knowledge'] ?? '', 60);
        $clean['message']   = self::text($data['message'] ?? '', 800);

        // Empty optional fields are stored as NULL rather than as an empty
        // string, so "no e-mail given" and "e-mail deleted" read the same way.
        foreach (['whatsapp', 'email', 'knowledge', 'message'] as $optional) {
            if ($clean[$optional] === '') {
                $clean[$optional] = null;
            }
        }

        return [$clean, $errors];
    }

    /**
     * Collapses the runs of whitespace a phone keyboard leaves behind, then
     * cuts to the column's length rather than rejecting — an over-long name is
     * a slip, not an attack, and refusing it helps nobody.
     */
    public static function text(mixed $value, int $max): string
    {
        $value = preg_replace('/\s+/u', ' ', (string) $value) ?? '';

        return mb_substr(trim($value), 0, $max);
    }

    /**
     * Phone numbers are stored as digits only, so "0301-234 5678" and
     * "03012345678" are recognised as the same person on a second submission.
     */
    public static function digits(mixed $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';

        // The shapes people actually write: 923001234567 and 3001234567 are
        // the same number as 03001234567.
        if (strlen($digits) === 12 && str_starts_with($digits, '92')) {
            $digits = '0' . substr($digits, 2);
        }

        if (strlen($digits) === 10 && $digits[0] === '3') {
            $digits = '0' . $digits;
        }

        return $digits;
    }

    public static function isMobile(string $digits): bool
    {
        return preg_match('/^03\d{9}$/', $digits) === 1;
    }

    /**
     * A real date, in the past, and an age a short-course applicant could
     * plausibly be. Catches both the typo and the empty date picker.
     */
    public static function isPlausibleBirthDate(string $value): bool
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return false;
        }

        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);

        if ($date === false || $date->format('Y-m-d') !== $value) {
            return false; // e.g. 2003-02-31
        }

        $age = (int) $date->diff(new DateTimeImmutable('today'))->format('%r%a') / 365.25;

        return $age > 8 && $age < 90;
    }
}
