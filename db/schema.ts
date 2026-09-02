import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
