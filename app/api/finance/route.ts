import { env } from 'cloudflare:workers';

import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';

type D1Row = Record<string, string | number | null>;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    demo_initialized INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS student_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
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
  `CREATE TABLE IF NOT EXISTS student_budgets (
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    monthly_limit_paise INTEGER NOT NULL,
    PRIMARY KEY (user_id, category)
  )`,
  `CREATE TABLE IF NOT EXISTS student_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_paise INTEGER NOT NULL,
    current_paise INTEGER NOT NULL,
    deadline TEXT NOT NULL,
    kind TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS student_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance_paise INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS student_fee_settings (
    user_id TEXT PRIMARY KEY,
    semester_one_paise INTEGER NOT NULL DEFAULT 900000,
    semester_two_paise INTEGER NOT NULL DEFAULT 900000,
    exam_lab_paise INTEGER NOT NULL DEFAULT 220000,
    hostel_yearly_paise INTEGER NOT NULL DEFAULT 750000,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_student_transactions_user_date_type
    ON student_transactions(user_id, occurred_on, type)`,
  `CREATE INDEX IF NOT EXISTS idx_student_transactions_user_category_date
    ON student_transactions(user_id, category, occurred_on)`,
  `CREATE INDEX IF NOT EXISTS idx_student_goals_user
    ON student_goals(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_student_accounts_user
    ON student_accounts(user_id)`,
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

async function ensureStudentWorkspace(user: ChatGPTUser) {
  const db = env.DB;
  await db.batch(schemaStatements.map((sql) => db.prepare(sql)));

  const now = new Date().toISOString();
  await db
    .prepare(`INSERT INTO student_profiles
      (user_id, email, display_name, demo_initialized, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = excluded.updated_at`)
    .bind(user.userId, user.email, user.displayName, now, now)
    .run();

  const profile = await db
    .prepare('SELECT demo_initialized AS demoInitialized FROM student_profiles WHERE user_id = ?')
    .bind(user.userId)
    .first<{ demoInitialized: number }>();

  await db.prepare('INSERT OR IGNORE INTO student_fee_settings (user_id, updated_at) VALUES (?, ?)').bind(user.userId, now).run();

  if (!profile?.demoInitialized) {
    const transactionStatements = demoTransactions.map((row) =>
      db
        .prepare(`INSERT OR IGNORE INTO student_transactions
          (id, user_id, description, amount_paise, type, category, occurred_on, account, payment_method, note, is_demo, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, ?)`)
        .bind(`${user.userId}:${row[0]}`, user.userId, ...row.slice(1), now),
    );

    const budgetRows = [
      ['Food', 500000], ['Travel', 300000], ['AI / ML Learning', 250000],
      ['College fees', 800000], ['Hostel', 550000], ['Technology', 200000],
      ['Personal', 200000], ['Subscriptions', 100000],
    ];
    const budgetStatements = budgetRows.map((row) =>
      db
        .prepare('INSERT OR IGNORE INTO student_budgets (user_id, category, monthly_limit_paise) VALUES (?, ?, ?)')
        .bind(user.userId, ...row),
    );

    const goalRows = [
      ['emergency', 'Emergency fund', 3000000, 950000, '2027-02-28', 'Safety'],
      ['laptop', 'New laptop', 6500000, 1200000, '2027-06-30', 'Technology'],
      ['course', 'Data science certification', 1500000, 450000, '2026-12-31', 'Learning'],
    ];
    const goalStatements = goalRows.map((row) =>
      db
        .prepare('INSERT OR IGNORE INTO student_goals (id, user_id, name, target_paise, current_paise, deadline, kind) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(`${user.userId}:${row[0]}`, user.userId, ...row.slice(1)),
    );

    const accountRows = [
      ['bank', 'Bank account', 'Bank', 1400000],
      ['upi', 'UPI wallet', 'Digital wallet', 540300],
      ['cash', 'Cash', 'Cash', 90000],
      ['savings', 'Savings account', 'Savings', 950000],
    ];
    const accountStatements = accountRows.map((row) =>
      db
        .prepare('INSERT OR IGNORE INTO student_accounts (id, user_id, name, type, balance_paise) VALUES (?, ?, ?, ?, ?)')
        .bind(`${user.userId}:${row[0]}`, user.userId, ...row.slice(1)),
    );

    await db.batch([
      ...transactionStatements,
      ...budgetStatements,
      ...goalStatements,
      ...accountStatements,
      db
        .prepare('UPDATE student_profiles SET demo_initialized = 1, updated_at = ? WHERE user_id = ?')
        .bind(now, user.userId),
    ]);
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

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    await ensureStudentWorkspace(user);
    const db = env.DB;
    const [transactions, budgets, goals, accounts, feeSettings] = await Promise.all([
      db
        .prepare(`SELECT id, description, amount_paise, type, category, occurred_on, account,
          payment_method, note, is_demo, created_at
          FROM student_transactions WHERE user_id = ?
          ORDER BY occurred_on DESC, created_at DESC`)
        .bind(user.userId)
        .all<D1Row>(),
      db
        .prepare('SELECT category, monthly_limit_paise FROM student_budgets WHERE user_id = ? ORDER BY category')
        .bind(user.userId)
        .all<D1Row>(),
      db
        .prepare('SELECT id, name, target_paise, current_paise, deadline, kind FROM student_goals WHERE user_id = ? ORDER BY deadline')
        .bind(user.userId)
        .all<D1Row>(),
      db
        .prepare('SELECT id, name, type, balance_paise FROM student_accounts WHERE user_id = ? ORDER BY name')
        .bind(user.userId)
        .all<D1Row>(),
      db
        .prepare('SELECT semester_one_paise, semester_two_paise, exam_lab_paise, hostel_yearly_paise FROM student_fee_settings WHERE user_id = ?')
        .bind(user.userId)
        .first<D1Row>(),
    ]);

    if (new URL(request.url).searchParams.get('format') === 'csv') {
      const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const header = ['Date', 'Description', 'Type', 'Category', 'Amount (INR)', 'Account', 'Payment method', 'Note'];
      const lines = normalizeRows(transactions.results).map((row) => [
        row.occurredOn, row.description, row.type, row.category,
        Number(row.amountPaise) / 100, row.account, row.paymentMethod, row.note,
      ].map(escape).join(','));
      return new Response([header.join(','), ...lines].join('\n'), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="campus-cash-backup.csv"',
        },
      });
    }

    return Response.json({
      transactions: normalizeRows(transactions.results),
      budgets: normalizeRows(budgets.results),
      goals: normalizeRows(goals.results),
      accounts: normalizeRows(accounts.results),
      feeSettings: feeSettings ? normalizeRows([feeSettings])[0] : null,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load finance data.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    await ensureStudentWorkspace(user);
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? 'transaction');
    const db = env.DB;

    if (action === 'transaction') {
      const description = String(body.description ?? '').trim();
      const type = String(body.type ?? 'expense');
      const category = String(body.category ?? 'Personal');
      const occurredOn = String(
        body.occurredOn ?? new Date().toISOString().slice(0, 10),
      );
      const account = String(body.account ?? 'UPI wallet');
      const paymentMethod = String(body.paymentMethod ?? 'UPI');
      const amount = Number(body.amount);
      if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !['income', 'expense', 'savings'].includes(type)
      ) {
        return Response.json(
          { error: 'Please enter a valid description, amount, and transaction type.' },
          { status: 400 },
        );
      }
      const id = crypto.randomUUID();
      await db
        .prepare(`INSERT INTO student_transactions
          (id, user_id, description, amount_paise, type, category, occurred_on, account, payment_method, note, is_demo, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
        .bind(
          id,
          user.userId,
          description,
          Math.round(amount * 100),
          type,
          category,
          occurredOn,
          account,
          paymentMethod,
          String(body.note ?? ''),
          new Date().toISOString(),
        )
        .run();
      return Response.json({ ok: true, id });
    }

    if (action === 'budget') {
      const category = String(body.category ?? '').trim();
      const monthlyLimit = Number(body.monthlyLimit);
      if (!category || !Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
        return Response.json(
          { error: 'Please enter a valid category and monthly limit.' },
          { status: 400 },
        );
      }
      await db
        .prepare(`INSERT INTO student_budgets (user_id, category, monthly_limit_paise)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, category) DO UPDATE SET
            monthly_limit_paise = excluded.monthly_limit_paise`)
        .bind(user.userId, category, Math.round(monthlyLimit * 100))
        .run();
      return Response.json({ ok: true });
    }

    if (action === 'deleteBudget') {
      await db.prepare('DELETE FROM student_budgets WHERE user_id = ? AND category = ?').bind(user.userId, String(body.category ?? '')).run();
      return Response.json({ ok: true });
    }

    if (action === 'updateTransaction') {
      const id = String(body.id ?? '');
      const description = String(body.description ?? '').trim();
      const category = String(body.category ?? '').trim();
      const type = String(body.type ?? 'expense');
      const occurredOn = String(body.occurredOn ?? '');
      const account = String(body.account ?? '').trim();
      const paymentMethod = String(body.paymentMethod ?? '').trim();
      const note = String(body.note ?? '');
      const amount = Number(body.amount);
      if (!id || !description || !category || !occurredOn || !account || !paymentMethod || !['income', 'expense', 'savings'].includes(type) || !Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'Please enter valid transaction details.' }, { status: 400 });
      await db.prepare('UPDATE student_transactions SET description = ?, category = ?, amount_paise = ?, type = ?, occurred_on = ?, account = ?, payment_method = ?, note = ? WHERE id = ? AND user_id = ?').bind(description, category, Math.round(amount * 100), type, occurredOn, account, paymentMethod, note, id, user.userId).run();
      return Response.json({ ok: true });
    }

    if (action === 'goalContribution') {
      const goalId = String(body.goalId ?? '');
      const amount = Number(body.amount);
      if (!goalId || !Number.isFinite(amount) || amount <= 0) {
        return Response.json(
          { error: 'Please enter a valid contribution.' },
          { status: 400 },
        );
      }
      await db
        .prepare(`UPDATE student_goals
          SET current_paise = MIN(target_paise, current_paise + ?)
          WHERE id = ? AND user_id = ?`)
        .bind(Math.round(amount * 100), goalId, user.userId)
        .run();
      return Response.json({ ok: true });
    }

    if (action === 'goalCreate') {
      const name = String(body.name ?? '').trim();
      const target = Number(body.target);
      const deadline = String(body.deadline ?? '');
      const kind = String(body.kind ?? 'Wishlist').trim() || 'Wishlist';
      if (!name || !Number.isFinite(target) || target <= 0 || !deadline) return Response.json({ error: 'Please enter a valid goal.' }, { status: 400 });
      await db.prepare('INSERT INTO student_goals (id, user_id, name, target_paise, current_paise, deadline, kind) VALUES (?, ?, ?, ?, 0, ?, ?)').bind(`${user.userId}:${crypto.randomUUID()}`, user.userId, name, Math.round(target * 100), deadline, kind).run();
      return Response.json({ ok: true });
    }

    if (action === 'deleteGoal') {
      await db.prepare('DELETE FROM student_goals WHERE id = ? AND user_id = ?').bind(String(body.goalId ?? ''), user.userId).run();
      return Response.json({ ok: true });
    }

    if (action === 'goalUpdate') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '').trim();
      const target = Number(body.target);
      const deadline = String(body.deadline ?? '');
      const kind = String(body.kind ?? 'Wishlist').trim() || 'Wishlist';
      if (!id || !name || !Number.isFinite(target) || target <= 0 || !deadline) return Response.json({ error: 'Please enter a valid goal.' }, { status: 400 });
      await db.prepare('UPDATE student_goals SET name = ?, target_paise = ?, deadline = ?, kind = ? WHERE id = ? AND user_id = ?').bind(name, Math.round(target * 100), deadline, kind, id, user.userId).run();
      return Response.json({ ok: true });
    }

    if (action === 'accountCreate') {
      const name = String(body.name ?? '').trim();
      const type = String(body.type ?? 'Other').trim() || 'Other';
      const balance = Number(body.balance ?? 0);
      if (!name || !Number.isFinite(balance) || balance < 0) return Response.json({ error: 'Please enter a valid account.' }, { status: 400 });
      await db.prepare('INSERT INTO student_accounts (id, user_id, name, type, balance_paise) VALUES (?, ?, ?, ?, ?)').bind(`${user.userId}:${crypto.randomUUID()}`, user.userId, name, type, Math.round(balance * 100)).run();
      return Response.json({ ok: true });
    }

    if (action === 'accountUpdate') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '').trim();
      const balance = Number(body.balance ?? 0);
      if (!id || !name || !Number.isFinite(balance) || balance < 0) return Response.json({ error: 'Please enter a valid account.' }, { status: 400 });
      const type = String(body.type ?? 'Other').trim() || 'Other';
      await db.prepare('UPDATE student_accounts SET name = ?, type = ?, balance_paise = ? WHERE id = ? AND user_id = ?').bind(name, type, Math.round(balance * 100), id, user.userId).run();
      return Response.json({ ok: true });
    }

    if (action === 'accountDelete') {
      await db.prepare('DELETE FROM student_accounts WHERE id = ? AND user_id = ?').bind(String(body.id ?? ''), user.userId).run();
      return Response.json({ ok: true });
    }

    if (action === 'saveFeeSettings') {
      const values = ['semesterOne', 'semesterTwo', 'examLab', 'hostelYearly'].map((key) => Number(body[key] ?? 0));
      if (values.some((value) => !Number.isFinite(value) || value < 0)) return Response.json({ error: 'Fee values must be zero or more.' }, { status: 400 });
      await db.prepare(`INSERT INTO student_fee_settings (user_id, semester_one_paise, semester_two_paise, exam_lab_paise, hostel_yearly_paise, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET semester_one_paise = excluded.semester_one_paise, semester_two_paise = excluded.semester_two_paise, exam_lab_paise = excluded.exam_lab_paise, hostel_yearly_paise = excluded.hostel_yearly_paise, updated_at = excluded.updated_at`)
        .bind(user.userId, ...values.map((value) => Math.round(value * 100)), new Date().toISOString()).run();
      return Response.json({ ok: true });
    }

    if (action === 'resetDemo') {
      await db
        .prepare('DELETE FROM student_transactions WHERE user_id = ? AND is_demo = 1')
        .bind(user.userId)
        .run();
      return Response.json({ ok: true });
    }

    if (action === 'deleteMyData') {
      await db.batch([
        db.prepare('DELETE FROM student_transactions WHERE user_id = ?').bind(user.userId),
        db.prepare('DELETE FROM student_budgets WHERE user_id = ?').bind(user.userId),
        db.prepare('DELETE FROM student_goals WHERE user_id = ?').bind(user.userId),
        db.prepare('DELETE FROM student_accounts WHERE user_id = ?').bind(user.userId),
      ]);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to save finance data.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    await ensureStudentWorkspace(user);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return Response.json({ error: 'Transaction id is required.' }, { status: 400 });
    }
    await env.DB
      .prepare('DELETE FROM student_transactions WHERE id = ? AND user_id = ?')
      .bind(id, user.userId)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to delete transaction.' },
      { status: 500 },
    );
  }
}
