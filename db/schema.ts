import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const plannerItems = sqliteTable('student_planner_items', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(),
  kind: text('kind').notNull(), payload: text('payload').notNull(),
}, table => [index('idx_planner_user').on(table.userId)]);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    description: text('description').notNull(),
    amountPaise: integer('amount_paise').notNull(),
    type: text('type').notNull(),
    category: text('category').notNull(),
    occurredOn: text('occurred_on').notNull(),
    account: text('account').notNull().default('UPI'),
    paymentMethod: text('payment_method').notNull().default('UPI'),
    note: text('note').notNull().default(''),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_transactions_date_type').on(table.occurredOn, table.type),
    index('idx_transactions_category_date').on(table.category, table.occurredOn),
  ],
);

export const budgets = sqliteTable('budgets', {
  category: text('category').primaryKey(),
  monthlyLimitPaise: integer('monthly_limit_paise').notNull(),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetPaise: integer('target_paise').notNull(),
  currentPaise: integer('current_paise').notNull(),
  deadline: text('deadline').notNull(),
  kind: text('kind').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  balancePaise: integer('balance_paise').notNull(),
});

export const studentProfiles = sqliteTable('student_profiles', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  demoInitialized: integer('demo_initialized', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const studentTransactions = sqliteTable(
  'student_transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    description: text('description').notNull(),
    amountPaise: integer('amount_paise').notNull(),
    type: text('type').notNull(),
    category: text('category').notNull(),
    occurredOn: text('occurred_on').notNull(),
    account: text('account').notNull().default('UPI'),
    paymentMethod: text('payment_method').notNull().default('UPI'),
    note: text('note').notNull().default(''),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_student_transactions_user_date_type').on(
      table.userId,
      table.occurredOn,
      table.type,
    ),
    index('idx_student_transactions_user_category_date').on(
      table.userId,
      table.category,
      table.occurredOn,
    ),
  ],
);

export const studentBudgets = sqliteTable(
  'student_budgets',
  {
    userId: text('user_id').notNull(),
    category: text('category').notNull(),
    monthlyLimitPaise: integer('monthly_limit_paise').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.category] })],
);

export const studentGoals = sqliteTable(
  'student_goals',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    targetPaise: integer('target_paise').notNull(),
    currentPaise: integer('current_paise').notNull(),
    deadline: text('deadline').notNull(),
    kind: text('kind').notNull(),
  },
  (table) => [index('idx_student_goals_user').on(table.userId)],
);

export const studentAccounts = sqliteTable(
  'student_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    balancePaise: integer('balance_paise').notNull(),
  },
  (table) => [index('idx_student_accounts_user').on(table.userId)],
);
