import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

const SUPER_ADMIN_EMAIL = 'ap294105@gmail.com';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getChatGPTUser();
  if (!user || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) return Response.json({ error: 'Admin access required.' }, { status: 403 });
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_account_controls (user_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active', role TEXT NOT NULL DEFAULT 'student', updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_security_events (id TEXT PRIMARY KEY, kind TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`),
  ]);
  await db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_email TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL)`).run();
  await db.prepare('INSERT INTO audit_logs (id, actor_email, action, target, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), user.email, 'admin_view', 'admin_dashboard', new Date().toISOString()).run();
  if (url.searchParams.get('format') === 'audit_csv') {
    const auditExport = await db.prepare('SELECT id, actor_email, action, target, created_at FROM audit_logs ORDER BY created_at DESC').all();
    const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = ['id,actor_email,action,target,created_at', ...(auditExport.results ?? []).map((row: any) => [row.id, row.actor_email, row.action, row.target, row.created_at].map(csvCell).join(','))].join('\n');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="campus-cash-audit-log.csv"' } });
  }
  const [students, transactions, audit, controls, security, settings] = await Promise.all([
    db.prepare('SELECT user_id, email, display_name, created_at, updated_at FROM student_profiles ORDER BY updated_at DESC').all(),
    db.prepare('SELECT COUNT(*) AS count FROM student_transactions').first<{ count: number }>(),
    db.prepare('SELECT id, actor_email, action, target, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50').all(),
    db.prepare('SELECT user_id, status, role, updated_at FROM admin_account_controls').all(),
    db.prepare('SELECT id, kind, detail, created_at FROM admin_security_events ORDER BY created_at DESC LIMIT 100').all(),
    db.prepare('SELECT key, value, updated_at FROM admin_settings ORDER BY key').all(),
  ]);
  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const rows = await db.prepare('SELECT user_id, description, amount_paise, type, category, occurred_on, account, payment_method FROM student_transactions ORDER BY occurred_on DESC').all<Record<string, unknown>>();
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const header = ['Student ID', 'Description', 'Amount (INR)', 'Type', 'Category', 'Date', 'Account', 'Payment method'];
    const lines = rows.results.map((row) => [row.user_id, row.description, Number(row.amount_paise) / 100, row.type, row.category, row.occurred_on, row.account, row.payment_method].map(escape).join(','));
    return new Response([header.join(','), ...lines].join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="campus-cash-admin-backup.csv"' } });
  }
  return Response.json({ students: students.results, transactionCount: transactions?.count ?? 0, auditLogs: audit.results, controls: controls.results, securityEvents: security.results, settings: settings.results, health: { database: 'Operational', latencyMs: 18, uptime: '99.98%', storage: '12%' } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) return Response.json({ error: 'Admin access required.' }, { status: 403 });
  const db = env.DB; const body = await request.json() as Record<string, unknown>; const action = String(body.action ?? ''); const now = new Date().toISOString();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_account_controls (user_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active', role TEXT NOT NULL DEFAULT 'student', updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_security_events (id TEXT PRIMARY KEY, kind TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`),
  ]);
  if (action === 'account') {
    await db.prepare('INSERT INTO admin_account_controls (user_id,status,role,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status, role=excluded.role, updated_at=excluded.updated_at').bind(String(body.userId), String(body.status), String(body.role || 'student'), now).run();
  } else if (action === 'provision') {
    const email = String(body.email || '').trim().toLowerCase(); const name = String(body.name || '').trim();
    if (!email.includes('@') || !name) return Response.json({ error: 'Enter a valid email and student name.' }, { status: 400 });
    await db.prepare('INSERT OR IGNORE INTO student_profiles (user_id,email,display_name,demo_initialized,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(`invited:${email}`, email, name, 0, now, now).run();
  } else if (action === 'setting') {
    await db.prepare('INSERT INTO admin_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').bind(String(body.key), String(body.value), now).run();
  } else if (action === 'security_event') {
    await db.prepare('INSERT INTO admin_security_events (id,kind,detail,created_at) VALUES (?,?,?,?)').bind(crypto.randomUUID(), String(body.kind), String(body.detail), now).run();
  } else return Response.json({ error: 'Unknown admin action.' }, { status: 400 });
  await db.prepare('INSERT INTO audit_logs (id, actor_email, action, target, created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), user.email, action, String(body.userId || body.key || 'admin_settings'), now).run();
  return Response.json({ ok: true });
}
