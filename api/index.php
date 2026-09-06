<?php

declare(strict_types=1);

/**
 * The whole backend: one endpoint, one action per request.
 *
 * The browser posts {"action": "...", ...} as text/plain — a "simple" request
 * that needs no CORS preflight — and gets JSON back. Keeping that one shape for
 * every action is what lets the pages stay ordinary static files: they know a
 * single endpoint and nothing else about the server.
 *
 *   submit   public   file an application
 *   ping     public   health check
 *   login    public   exchange a username and password for a session
 *   session  public   is this browser still signed in?
 *   logout   staff    end the session
 *   list     staff    every application, newest first
 *   status   staff    mark one New / Contacted / Approved / Rejected
 *   delete   staff    remove one, and its photo
 *   photo    staff    read a photo back as a data URL
 *
 * Staff actions are recognised by a session cookie, not by anything the page
 * holds: the password is sent once, at sign-in, and never again. Actions that
 * change data additionally carry a CSRF token, because a cookie alone does not
 * prove the request was intended.
 */

require __DIR__ . '/lib/env.php';
require __DIR__ . '/lib/respond.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/validate.php';
require __DIR__ . '/lib/auth.php';

/** Photos live here, outside the web root, and are only ever served by `photo`. */
const PHOTO_DIR = __DIR__ . '/../storage/photos';

/** The applicant resizes the picture in the browser; this is the backstop. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** The same person applying twice for one course inside this window is a double click. */
const DUPLICATE_MINUTES = 10;

Env::load(__DIR__ . '/../.env');
Auth::boot(__DIR__ . '/../storage');

// A crash must not print a stack trace containing the database password.
set_exception_handler(static function (Throwable $e): void {
    error_log('[registration-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());

    Respond::fail(
        Env::get('APP_DEBUG') === 'true'
            ? $e->getMessage()
            : 'Something went wrong on the server. Please try again.'
    );
});

// ---------------------------------------------------------------------------
// Read the request
// ---------------------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    Respond::ok(); // a preflight, if a browser ever sends one
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    // GET is a health check only. It never returns applicant data.
    Respond::json(['ok' => true, 'service' => 'student-registration', 'version' => 2]);
}

$raw  = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);

if (!is_array($body)) {
    Respond::fail('Bad request.');
}

$action = is_string($body['action'] ?? null) ? $body['action'] : '';

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

if ($action === 'ping') {
    Respond::ok();
}

if ($action === 'submit') {
    submitApplication(is_array($body['data'] ?? null) ? $body['data'] : []);
}

if ($action === 'login') {
    signIn(
        (string) ($body['username'] ?? ''),
        (string) ($body['password'] ?? ''),
        (bool) ($body['remember'] ?? false)
    );
}

// Lets the dashboard find out on load whether the cookie is still good,
// without asking anybody to type a password they may not have to.
if ($action === 'session') {
    Auth::check()
        ? Respond::ok(['user' => Auth::user(), 'csrf' => Auth::csrfToken()])
        : Respond::fail('Signed out', [], 401);
}

// Everything past this point is the office's.
if (!Auth::check()) {
    Respond::fail('Your session has ended. Please sign in again.', [], 401);
}

// Reading is safe for a cookie to authorise on its own; changing anything is
// not, so those three actions must also prove they came from our own page.
if (in_array($action, ['status', 'delete', 'logout'], true) && !Auth::csrfValid($body['csrf'] ?? null)) {
    Respond::fail('This request could not be verified. Reload the page and sign in again.', [], 401);
}

match ($action) {
    'logout' => logOut(),
    'list'   => listApplications(),
    'status' => setStatus($body['id'] ?? null, $body['status'] ?? null, $body['note'] ?? null),
    'delete' => deleteApplication($body['id'] ?? null),
    'photo'  => readPhoto($body['fileId'] ?? null),
    default  => Respond::fail('Unknown action'),
};

function signIn(string $username, string $password, bool $remember): never
{
    if ($username === '' || $password === '') {
        Respond::fail('Enter your username and password.', [], 401);
    }

    [$ok, $message] = Auth::signIn($username, $password, $remember);

    if (!$ok) {
        Respond::fail($message, [], 401);
    }

    Respond::ok(['user' => Auth::user(), 'csrf' => Auth::csrfToken()]);
}

function logOut(): never
{
    Auth::signOut();

    Respond::ok();
}

// ---------------------------------------------------------------------------
// Public: one new application
// ---------------------------------------------------------------------------

/**
 * @param array<string,mixed> $data
 */
function submitApplication(array $data): never
{
    [$clean, $errors] = Validate::application($data);

    if ($errors !== []) {
        Respond::fail('Please check the highlighted fields.', $errors);
    }

    // A double click, or a page restored with the back button, must not file
    // the same person twice. The number already issued is handed back.
    $existing = Db::one(
        'SELECT application_no FROM applications
          WHERE mobile = ? AND course = ?
            AND submitted_at >= (NOW() - INTERVAL ? MINUTE)
          ORDER BY id DESC LIMIT 1',
        [$clean['mobile'], $clean['course'], DUPLICATE_MINUTES]
    );

    if ($existing !== null) {
        Respond::ok(['applicationNo' => $existing['application_no'], 'duplicate' => true]);
    }

    $clean['photo_file'] = storePhoto($data['photo'] ?? null);
    $clean['source_ip']  = substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);

    $number = insertWithNumber($clean);

    Respond::ok(['applicationNo' => $number]);
}

/**
 * Insert the row, generating its application number.
 *
 * Two people submitting at the same instant could compute the same next number,
 * so the unique index on application_no is what actually prevents a duplicate:
 * a clash throws, and the loop simply tries the next one.
 *
 * @param array<string,mixed> $clean
 */
function insertWithNumber(array $clean): string
{
    $prefix = 'HIRA-' . date('Y') . '-';

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $highest = (int) Db::scalar(
            'SELECT COALESCE(MAX(CAST(SUBSTRING(application_no, ?) AS UNSIGNED)), 0)
               FROM applications WHERE application_no LIKE ?',
            [strlen($prefix) + 1, $prefix . '%']
        );

        $number = $prefix . str_pad((string) ($highest + 1 + $attempt), 4, '0', STR_PAD_LEFT);

        try {
            Db::run(
                'INSERT INTO applications
                    (application_no, full_name, father_name, dob, gender, mobile, whatsapp,
                     email, address, qualification, course, knowledge, message, photo_file, source_ip)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [
                    $number, $clean['full_name'], $clean['father_name'], $clean['dob'],
                    $clean['gender'], $clean['mobile'], $clean['whatsapp'], $clean['email'],
                    $clean['address'], $clean['qualification'], $clean['course'],
                    $clean['knowledge'], $clean['message'], $clean['photo_file'], $clean['source_ip'],
                ]
            );

            return $number;
        } catch (PDOException $e) {
            // 23000 is the integrity-constraint family — someone took this
            // number first. Anything else is a real failure and must surface.
            if ($e->getCode() !== '23000') {
                throw $e;
            }
        }
    }

    throw new RuntimeException('An application number could not be issued.');
}

/**
 * Saves the browser-resized photo and returns its file name.
 *
 * The name is generated here, never taken from the upload, so nothing the
 * applicant sends can steer where the file lands or what it is called.
 */
function storePhoto(mixed $photo): ?string
{
    if (!is_array($photo) || !is_string($photo['data'] ?? null)) {
        return null;
    }

    if (preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#i', $photo['data'], $m) !== 1) {
        return null;
    }

    $bytes = base64_decode($m[2], true);

    if ($bytes === false || $bytes === '' || strlen($bytes) > MAX_PHOTO_BYTES) {
        return null;
    }

    // Trust the bytes, not the label the browser attached to them.
    $info = @getimagesizefromstring($bytes);

    if ($info === false || !in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP], true)) {
        return null;
    }

    $extension = ['png' => 'png', 'jpeg' => 'jpg', 'jpg' => 'jpg', 'webp' => 'webp'][strtolower($m[1])];
    $name      = bin2hex(random_bytes(16)) . '.' . $extension;

    if (!is_dir(PHOTO_DIR) && !mkdir(PHOTO_DIR, 0775, true) && !is_dir(PHOTO_DIR)) {
        return null;
    }

    return file_put_contents(PHOTO_DIR . '/' . $name, $bytes) === false ? null : $name;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

function listApplications(): never
{
    $rows = Db::all(
        'SELECT id, application_no, full_name, father_name, dob, gender, mobile, whatsapp,
                email, address, qualification, course, knowledge, message, photo_file,
                status, note, submitted_at, updated_at
           FROM applications
          ORDER BY submitted_at DESC, id DESC'
    );

    $out = [];

    foreach ($rows as $r) {
        $out[] = [
            'id'            => (int) $r['id'],
            'applicationNo' => (string) $r['application_no'],
            'fullName'      => (string) $r['full_name'],
            'fatherName'    => (string) $r['father_name'],
            'dob'           => (string) $r['dob'],
            'gender'        => (string) $r['gender'],
            'mobile'        => (string) $r['mobile'],
            'whatsapp'      => (string) ($r['whatsapp'] ?? ''),
            'email'         => (string) ($r['email'] ?? ''),
            'address'       => (string) $r['address'],
            'qualification' => (string) $r['qualification'],
            'course'        => (string) $r['course'],
            'knowledge'     => (string) ($r['knowledge'] ?? ''),
            'message'       => (string) ($r['message'] ?? ''),
            'hasPhoto'      => $r['photo_file'] !== null,
            'photoId'       => (string) ($r['photo_file'] ?? ''),
            'status'        => (string) $r['status'],
            'note'          => (string) ($r['note'] ?? ''),
            'submittedAt'   => iso((string) $r['submitted_at']),
            'updatedAt'     => iso((string) $r['updated_at']),
        ];
    }

    Respond::ok([
        'applications' => $out,
        'courses'      => Validate::COURSES,
        'statuses'     => Validate::STATUSES,
    ]);
}

function setStatus(mixed $id, mixed $status, mixed $note): never
{
    $id     = (int) $id;
    $status = (string) $status;

    if ($id < 1) {
        Respond::fail('Unknown application.');
    }

    if (!in_array($status, Validate::STATUSES, true)) {
        Respond::fail('Unknown status.');
    }

    /*
     * updated_at is set here rather than left to ON UPDATE CURRENT_TIMESTAMP,
     * which MySQL skips when the new values match the old ones. The dashboard
     * column reads "Last updated", so re-saving the same decision must still
     * record that somebody in the office touched it just now.
     */
    $changed = Db::run(
        'UPDATE applications SET status = ?, note = ?, updated_at = NOW() WHERE id = ?',
        [$status, Validate::text($note ?? '', 500) ?: null, $id]
    )->rowCount();

    // rowCount() is 0 both for "no such row" and for "saved the same value
    // again", so the row is looked up rather than guessed at.
    if ($changed === 0 && Db::one('SELECT id FROM applications WHERE id = ?', [$id]) === null) {
        Respond::fail('Unknown application.');
    }

    Respond::ok();
}

function deleteApplication(mixed $id): never
{
    $id = (int) $id;

    if ($id < 1) {
        Respond::fail('Unknown application.');
    }

    $row = Db::one('SELECT photo_file FROM applications WHERE id = ?', [$id]);

    if ($row === null) {
        Respond::fail('Unknown application.');
    }

    Db::run('DELETE FROM applications WHERE id = ?', [$id]);

    // The row is the record; a photo left behind would be an orphan nobody
    // could ever reach, so it goes with it.
    if (is_string($row['photo_file']) && $row['photo_file'] !== '') {
        $path = photoPath($row['photo_file']);

        if ($path !== null && is_file($path)) {
            @unlink($path);
        }
    }

    Respond::ok();
}

/**
 * The photo is read back as a data URL, so the folder itself is never public
 * and a leaked file name is not a leaked photograph.
 */
function readPhoto(mixed $fileId): never
{
    $path = is_string($fileId) ? photoPath($fileId) : null;

    if ($path === null || !is_file($path)) {
        Respond::fail('The photo could not be read.');
    }

    $bytes = file_get_contents($path);
    $info  = $bytes === false ? false : @getimagesizefromstring($bytes);

    if ($bytes === false || $info === false) {
        Respond::fail('The photo could not be read.');
    }

    Respond::ok(['dataUrl' => 'data:' . $info['mime'] . ';base64,' . base64_encode($bytes)]);
}

/**
 * Resolves a stored file name to a path inside the photo folder.
 *
 * The name is matched against the exact shape this API generates, so "../"
 * and absolute paths never reach the filesystem.
 */
function photoPath(string $name): ?string
{
    if (preg_match('/^[0-9a-f]{32}\.(png|jpg|webp)$/', $name) !== 1) {
        return null;
    }

    return PHOTO_DIR . '/' . $name;
}

function iso(string $mysqlDateTime): string
{
    $time = strtotime($mysqlDateTime);

    return $time === false ? $mysqlDateTime : date('c', $time);
}
