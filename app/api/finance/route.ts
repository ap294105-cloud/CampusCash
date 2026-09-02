import { env } from 'cloudflare:workers';

type D1Row = Record<string, string | number | null>;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    occurred_on TEXT NOT NULL,
    account TEXT NOT NULL DEFAULT 'UPI',
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    note TEXT NOT NULL DEFAULT '',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    category TEXT PRIMARY KEY,
    monthly_limit_paise INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_paise INTEGER NOT NULL,
    current_paise INTEGER NOT NULL,
    deadline TEXT NOT NULL,
    kind TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance_paise INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(occurred_on, type)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category, occurred_on)`,
];

const demoTransactions = [
  ['allowance-sep', 'Monthly allowance', 1500000, 'income', 'Allowance', '2026-09-01', 'Bank account', 'Bank transfer'],
  ['scholarship-sep', 'Merit scholarship', 650000, 'income', 'Scholarships', '2026-09-02', 'Bank account', 'Bank transfer'],
  ['freelance-sep', 'Freelance project', 350000, 'income', 'Freelance', '2026-09-01', 'UPI wallet', 'UPI'],
  ['fees-sep', 'Semester lab fee', 200000, 'expense', 'College fees', '2026-09-01', 'Bank account', 'Net banking'],
  ['hostel-sep', 'Hostel utilities', 150000, 'expense', 'Hostel', '2026-09-01', 'UPI wallet', 'UPI'],
  ['food-sep', 'Mess and canteen', 124000, 'expense', 'Food', '2026-09-02', 'UPI wallet', 'UPI'],
  ['travel-sep', 'Metro and bus pass', 95000, 'expense', 'Travel', '2026-09-01', 'UPI wallet', 'UPI'],
  ['learning-sep', 'Python course', 79900, 'expense', 'AI / ML Learning', '2026-09-01', 'Bank account', 'Card'],
  ['internet-sep', 'Mobile data recharge', 39900, 'expense', 'Technology', '2026-09-02', 'UPI wallet', 'UPI'],
  ['personal-sep', 'Personal care', 30900, 'expense', 'Personal', '2026-09-02', 'Cash', 'Cash'],
  ['saving-sep', 'Emergency fund transfer', 250000, 'savings', 'Savings', '2026-09-02', 'Bank account', 'Bank transfer'],
  ['income-aug', 'Allowance and stipend', 2400000, 'income', 'Allowance', '2026-08-01', 'Bank account', 'Bank transfer'],
  ['expense-aug', 'August living costs', 1035000, 'expense', 'Food', '2026-08-26', 'UPI wallet', 'UPI'],
  ['saving-aug', 'Savings transfer', 200000, 'savings', 'Savings', '2026-08-27', 'Bank account', 'Bank transfer'],
  ['income-jul', 'Allowance and internship', 2850000, 'income', 'Allowance', '2026-07-01', 'Bank account', 'Bank transfer'],
  ['expense-jul', 'July living costs', 1180000, 'expense', 'Hostel', '2026-07-25', 'UPI wallet', 'UPI'],
] as const;

async function ensureDatabase() {
  const db = env.DB;
  await db.batch(schemaStatements.map((sql) => db.prepare(sql)));

  const count = await db.prepare('SELECT COUNT(*) AS count FROM transactions').first<{ count: number }>();
  if ((count?.count ?? 0) === 0) {
    const transactionStatements = demoTransactions.map((row) =>
      db
        .prepare(`INSERT INTO transactions
          (id, description, amount_paise, type, category, occurred_on, account, payment_method, note, is_demo, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 1, ?)`)
        .bind(...row, new Date().toISOString()),
    );

    const budgetRows = [
      ['Food', 500000], ['Travel', 300000], ['AI / ML Learning', 250000],
      ['College fees', 800000], ['Hostel', 550000], ['Technology', 200000],
      ['Personal', 200000], ['Subscriptions', 100000],
    ];
    const budgetStatements = budgetRows.map((row) =>
      db.prepare('INSERT OR IGNORE INTO budgets (category, monthly_limit_paise) VALUES (?, ?)').bind(...row),
    );

    const goalRows = [
      ['emergency', 'Emergency fund', 3000000, 950000, '2027-02-28', 'Safety'],
      ['laptop', 'New laptop', 6500000, 1200000, '2027-06-30', 'Technology'],
      ['course', 'Data science certification', 1500000, 450000, '2026-12-31', 'Learning'],
    ];
    const goalStatements = goalRows.map((row) =>
      db.prepare('INSERT OR IGNORE INTO goals (id, name, target_paise, current_paise, deadline, kind) VALUES (?, ?, ?, ?, ?, ?)').bind(...row),
    );

    const accountRows = [
      ['bank', 'Bank account', 'Bank', 1400000],
      ['upi', 'UPI wallet', 'Digital wallet', 540300],
      ['cash', 'Cash', 'Cash', 90000],
      ['savings', 'Savings account', 'Savings', 950000],
    ];
    const accountStatements = accountRows.map((row) =>
      db.prepare('INSERT OR IGNORE INTO accounts (id, name, type, balance_paise) VALUES (?, ?, ?, ?)').bind(...row),
    );

    await db.batch([...transactionStatements, ...budgetStatements, ...goalStatements, ...accountStatements]);
    await db.prepare('PRAGMA optimize').run();
  }
}

function normalizeRows(rows: D1Row[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        value,
      ]),
    ),
  );
}

export async function GET() {
  try {
    await ensureDatabase();
    const db = env.DB;
    const [transactions, budgets, goals, accounts] = await Promise.all([
      db.prepare('SELECT * FROM transactions ORDER BY occurred_on DESC, created_at DESC').all<D1Row>(),
      db.prepare('SELECT * FROM budgets ORDER BY category').all<D1Row>(),
      db.prepare('SELECT * FROM goals ORDER BY deadline').all<D1Row>(),
      db.prepare('SELECT * FROM accounts ORDER BY name').all<D1Row>(),
    ]);

    return Response.json({
      transactions: normalizeRows(transactions.results),
      budgets: normalizeRows(budgets.results),
      goals: normalizeRows(goals.results),
      accounts: normalizeRows(accounts.results),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to load finance data.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? 'transaction');
    const db = env.DB;

    if (action === 'transaction') {
      const description = String(body.description ?? '').trim();
      const type = String(body.type ?? 'expense');
      const category = String(body.category ?? 'Personal');
      const occurredOn = String(body.occurredOn ?? new Date().toISOString().slice(0, 10));
      const account = String(body.account ?? 'UPI wallet');
      const paymentMethod = String(body.paymentMethod ?? 'UPI');
      const amount = Number(body.amount);
      if (!description || !Number.isFinite(amount) || amount <= 0 || !['income', 'expense', 'savings'].includes(type)) {
        return Response.json({ error: 'Please enter a valid description, amount, and transaction type.' }, { status: 400 });
      }
      const id = crypto.randomUUID();
      await db.prepare(`INSERT INTO transactions
        (id, description, amount_paise, type, category, occurred_on, account, payment_method, note, is_demo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
        .bind(id, description, Math.round(amount * 100), type, category, occurredOn, account, paymentMethod, String(body.note ?? ''), new Date().toISOString())
        .run();
      return Response.json({ ok: true, id });
    }

    if (action === 'budget') {
      const category = String(body.category ?? '').trim();
      const monthlyLimit = Number(body.monthlyLimit);
      if (!category || !Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
        return Response.json({ error: 'Please enter a valid category and monthly limit.' }, { status: 400 });
      }
      await db.prepare(`INSERT INTO budgets (category, monthly_limit_paise) VALUES (?, ?)
        ON CONFLICT(category) DO UPDATE SET monthly_limit_paise = excluded.monthly_limit_paise`)
        .bind(category, Math.round(monthlyLimit * 100)).run();
      return Response.json({ ok: true });
    }

    if (action === 'goalContribution') {
      const goalId = String(body.goalId ?? '');
      const amount = Number(body.amount);
      if (!goalId || !Number.isFinite(amount) || amount <= 0) {
        return Response.json({ error: 'Please enter a valid contribution.' }, { status: 400 });
      }
      await db.prepare('UPDATE goals SET current_paise = MIN(target_paise, current_paise + ?) WHERE id = ?')
        .bind(Math.round(amount * 100), goalId).run();
      return Response.json({ ok: true });
    }

    if (action === 'resetDemo') {
      await db.prepare('DELETE FROM transactions WHERE is_demo = 1').run();
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to save finance data.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureDatabase();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'Transaction id is required.' }, { status: 400 });
    await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to delete transaction.' }, { status: 500 });
  }
}
