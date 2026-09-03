import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

const SUPER_ADMIN_EMAIL = 'ap294105@gmail.com';

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) return Response.json({ error: 'Admin access required.' }, { status: 403 });
  const db = env.DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_email TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL)`).run();
  await db.prepare('INSERT INTO audit_logs (id, actor_email, action, target, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), user.email, 'admin_view', 'admin_dashboard', new Date().toISOString()).run();
  if (url.searchParams.get('format') === 'audit_csv') {
    const auditExport = await db.prepare('SELECT id, actor_email, action, target, created_at FROM audit_logs ORDER BY created_at DESC').all();
    const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = ['id,actor_email,action,target,created_at', ...(auditExport.results ?? []).map((row: any) => [row.id, row.actor_email, row.action, row.target, row.created_at].map(csvCell).join(','))].join('\n');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="campus-cash-audit-log.csv"' } });
  }
  const [students, transactions, audit] = await Promise.all([
    db.prepare('SELECT user_id, email, display_name, created_at, updated_at FROM student_profiles ORDER BY updated_at DESC').all(),
    db.prepare('SELECT COUNT(*) AS count FROM student_transactions').first<{ count: number }>(),
    db.prepare('SELECT id, actor_email, action, target, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50').all(),
  ]);
  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const rows = await db.prepare('SELECT user_id, description, amount_paise, type, category, occurred_on, account, payment_method FROM student_transactions ORDER BY occurred_on DESC').all<Record<string, unknown>>();
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const header = ['Student ID', 'Description', 'Amount (INR)', 'Type', 'Category', 'Date', 'Account', 'Payment method'];
    const lines = rows.results.map((row) => [row.user_id, row.description, Number(row.amount_paise) / 100, row.type, row.category, row.occurred_on, row.account, row.payment_method].map(escape).join(','));
    return new Response([header.join(','), ...lines].join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="campus-cash-admin-backup.csv"' } });
  }
  return Response.json({ students: students.results, transactionCount: transactions?.count ?? 0, auditLogs: audit.results });
}
