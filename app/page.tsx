'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Bus,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  Download,
  Goal as GoalIcon,
  GraduationCap,
  IndianRupee,
  Landmark,
  Laptop,
  LayoutDashboard,
  Loader2,
  LogOut,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  UserCircle,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type View = 'overview' | 'transactions' | 'budgets' | 'goals' | 'accounts' | 'college' | 'reports' | 'settings';
type TransactionType = 'income' | 'expense' | 'savings';

type Transaction = {
  id: string;
  description: string;
  amountPaise: number;
  type: TransactionType;
  category: string;
  occurredOn: string;
  account: string;
  paymentMethod: string;
  note: string;
  isDemo: number;
  createdAt: string;
};

type Budget = { category: string; monthlyLimitPaise: number };
type SavingsGoal = { id: string; name: string; targetPaise: number; currentPaise: number; deadline: string; kind: string };
type Account = { id: string; name: string; type: string; balancePaise: number };
type FinanceData = { transactions: Transaction[]; budgets: Budget[]; goals: SavingsGoal[]; accounts: Account[] };
type CurrentUser = { displayName: string; email: string };

const categories = [
  'Food', 'Travel', 'College fees', 'Hostel', 'Technology', 'AI / ML Learning',
  'Personal', 'Subscriptions', 'Savings', 'Scholarships', 'Allowance', 'Freelance',
];

const navItems: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'transactions', label: 'Transactions', icon: ReceiptText },
  { key: 'budgets', label: 'Budgets', icon: BarChart3 },
  { key: 'goals', label: 'Savings goals', icon: GoalIcon },
  { key: 'accounts', label: 'Accounts', icon: WalletCards },
  { key: 'college', label: 'College costs', icon: BookOpen },
  { key: 'reports', label: 'Reports & insights', icon: Sparkles },
];

const viewTitles: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: 'Wednesday, 2 September', title: 'Your money, at a glance.', subtitle: 'You’re on track this month. Keep the good streak going.' },
  transactions: { eyebrow: 'Money log', title: 'Every rupee, accounted for.', subtitle: 'Search, filter, add, or remove income and expenses.' },
  budgets: { eyebrow: 'Monthly plan', title: 'Spend with a clear limit.', subtitle: 'Compare each category’s plan with what you have actually spent.' },
  goals: { eyebrow: 'Save with purpose', title: 'Small deposits. Big progress.', subtitle: 'Build your safety net and fund the things that move you forward.' },
  accounts: { eyebrow: 'Balance check', title: 'All your money in one view.', subtitle: 'Track bank, UPI, cash, and savings balances together.' },
  college: { eyebrow: 'Academic money plan', title: 'College costs, without surprises.', subtitle: 'Prepare for fees, hostel, learning, subscriptions, and purchases.' },
  reports: { eyebrow: 'Money review', title: 'Turn activity into insight.', subtitle: 'See monthly trends, annual direction, and practical next steps.' },
  settings: { eyebrow: 'Workspace', title: 'Make Campus Cash yours.', subtitle: 'Manage demo data, categories, and privacy preferences.' },
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const toRupees = (paise: number) => paise / 100;
const formatMoney = (paise: number) => currency.format(toRupees(paise));
const monthLabel = (month: string) => new Date(`${month}-02T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

const fallbackData: FinanceData = {
  transactions: [
    { id: 'allowance-sep', description: 'Monthly allowance', amountPaise: 1500000, type: 'income', category: 'Allowance', occurredOn: '2026-09-01', account: 'Bank account', paymentMethod: 'Bank transfer', note: '', isDemo: 1, createdAt: '2026-09-01T08:00:00Z' },
    { id: 'scholarship-sep', description: 'Merit scholarship', amountPaise: 650000, type: 'income', category: 'Scholarships', occurredOn: '2026-09-02', account: 'Bank account', paymentMethod: 'Bank transfer', note: '', isDemo: 1, createdAt: '2026-09-02T08:00:00Z' },
    { id: 'freelance-sep', description: 'Freelance project', amountPaise: 350000, type: 'income', category: 'Freelance', occurredOn: '2026-09-01', account: 'UPI wallet', paymentMethod: 'UPI', note: '', isDemo: 1, createdAt: '2026-09-01T08:00:00Z' },
    { id: 'fees-sep', description: 'Semester lab fee', amountPaise: 200000, type: 'expense', category: 'College fees', occurredOn: '2026-09-01', account: 'Bank account', paymentMethod: 'Net banking', note: '', isDemo: 1, createdAt: '2026-09-01T08:00:00Z' },
    { id: 'hostel-sep', description: 'Hostel utilities', amountPaise: 150000, type: 'expense', category: 'Hostel', occurredOn: '2026-09-01', account: 'UPI wallet', paymentMethod: 'UPI', note: '', isDemo: 1, createdAt: '2026-09-01T08:00:00Z' },
    { id: 'food-sep', description: 'Mess and canteen', amountPaise: 124000, type: 'expense', category: 'Food', occurredOn: '2026-09-02', account: 'UPI wallet', paymentMethod: 'UPI', note: '', isDemo: 1, createdAt: '2026-09-02T08:00:00Z' },
    { id: 'travel-sep', description: 'Metro and bus pass', amountPaise: 95000, type: 'expense', category: 'Travel', occurredOn: '2026-09-01', account: 'UPI wallet', paymentMethod: 'UPI', note: '', isDemo: 1, createdAt: '2026-09-01T08:00:00Z' },
    { id: 'learning-sep', description: 'Python course', amountPaise: 79900, type: 'expense', category: 'AI / ML Learning', occurredOn: '2026-09-01', account: 'Bank account', paymentMethod: 'Card', note: '', isDemo: 1, createdAt: '2026-09-01T08:00:00Z' },
    { id: 'internet-sep', description: 'Mobile data recharge', amountPaise: 39900, type: 'expense', category: 'Technology', occurredOn: '2026-09-02', account: 'UPI wallet', paymentMethod: 'UPI', note: '', isDemo: 1, createdAt: '2026-09-02T08:00:00Z' },
    { id: 'personal-sep', description: 'Personal care', amountPaise: 30900, type: 'expense', category: 'Personal', occurredOn: '2026-09-02', account: 'Cash', paymentMethod: 'Cash', note: '', isDemo: 1, createdAt: '2026-09-02T08:00:00Z' },
    { id: 'saving-sep', description: 'Emergency fund transfer', amountPaise: 250000, type: 'savings', category: 'Savings', occurredOn: '2026-09-02', account: 'Bank account', paymentMethod: 'Bank transfer', note: '', isDemo: 1, createdAt: '2026-09-02T08:00:00Z' },
    { id: 'income-aug', description: 'Allowance and stipend', amountPaise: 2400000, type: 'income', category: 'Allowance', occurredOn: '2026-08-01', account: 'Bank account', paymentMethod: 'Bank transfer', note: '', isDemo: 1, createdAt: '2026-08-01T08:00:00Z' },
    { id: 'expense-aug', description: 'August living costs', amountPaise: 1035000, type: 'expense', category: 'Food', occurredOn: '2026-08-26', account: 'UPI wallet', paymentMethod: 'UPI', note: '', isDemo: 1, createdAt: '2026-08-26T08:00:00Z' },
    { id: 'saving-aug', description: 'Savings transfer', amountPaise: 200000, type: 'savings', category: 'Savings', occurredOn: '2026-08-27', account: 'Bank account', paymentMethod: 'Bank transfer', note: '', isDemo: 1, createdAt: '2026-08-27T08:00:00Z' },
    { id: 'income-jul', description: 'Allowance and internship', amountPaise: 2850000, type: 'income', category: 'Allowance', occurredOn: '2026-07-01', account: 'Bank account', paymentMethod: 'Bank transfer', note: '', isDemo: 1, createdAt: '2026-07-01T08:00:00Z' },
    { id: 'expense-jul', description: 'July living costs', amountPaise: 1180000, type: 'expense', category: 'Hostel', occurredOn: '2026-07-25', account: 'UPI wallet', paymentMethod: 'UPI', note: '', isDemo: 1, createdAt: '2026-07-25T08:00:00Z' },
  ],
  budgets: [
    { category: 'Food', monthlyLimitPaise: 500000 }, { category: 'Travel', monthlyLimitPaise: 300000 },
    { category: 'AI / ML Learning', monthlyLimitPaise: 250000 }, { category: 'College fees', monthlyLimitPaise: 800000 },
    { category: 'Hostel', monthlyLimitPaise: 550000 }, { category: 'Technology', monthlyLimitPaise: 200000 },
    { category: 'Personal', monthlyLimitPaise: 200000 }, { category: 'Subscriptions', monthlyLimitPaise: 100000 },
  ],
  goals: [
    { id: 'emergency', name: 'Emergency fund', targetPaise: 3000000, currentPaise: 950000, deadline: '2027-02-28', kind: 'Safety' },
    { id: 'laptop', name: 'New laptop', targetPaise: 6500000, currentPaise: 1200000, deadline: '2027-06-30', kind: 'Technology' },
    { id: 'course', name: 'Data science certification', targetPaise: 1500000, currentPaise: 450000, deadline: '2026-12-31', kind: 'Learning' },
  ],
  accounts: [
    { id: 'bank', name: 'Bank account', type: 'Bank', balancePaise: 1400000 },
    { id: 'upi', name: 'UPI wallet', type: 'Digital wallet', balancePaise: 540300 },
    { id: 'cash', name: 'Cash', type: 'Cash', balancePaise: 90000 },
    { id: 'savings', name: 'Savings account', type: 'Savings', balancePaise: 950000 },
  ],
};

const chartConfig = {
  income: { label: 'Income', color: '#138a76' },
  expenses: { label: 'Expenses', color: '#f19a4b' },
  savings: { label: 'Savings', color: '#5d67b2' },
} satisfies ChartConfig;

export default function Home() {
  const [data, setData] = useState<FinanceData>(fallbackData);
  const [activeView, setActiveView] = useState<View>('overview');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [financeResponse, userResponse] = await Promise.all([
        fetch('/api/finance', { cache: 'no-store' }),
        fetch('/api/me', { cache: 'no-store' }),
      ]);
      if (!financeResponse.ok || !userResponse.ok) {
        throw new Error('Your private workspace is temporarily unavailable.');
      }
      setData((await financeResponse.json()) as FinanceData);
      setCurrentUser((await userResponse.json()) as CurrentUser);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load saved data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const monthTransactions = useMemo(
    () => data.transactions.filter((item) => item.occurredOn.startsWith(selectedMonth)),
    [data.transactions, selectedMonth],
  );

  const totals = useMemo(() => {
    const sum = (type: TransactionType) => monthTransactions.filter((item) => item.type === type).reduce((total, item) => total + item.amountPaise, 0);
    const income = sum('income');
    const expenses = sum('expense');
    const savings = sum('savings');
    const budget = data.budgets.reduce((total, item) => total + item.monthlyLimitPaise, 0);
    return { income, expenses, savings, budget, balance: income - expenses - savings };
  }, [data.budgets, monthTransactions]);

  const submitTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'transaction',
          description: form.get('description'),
          amount: form.get('amount'),
          type: form.get('type'),
          category: form.get('category'),
          occurredOn: form.get('occurredOn'),
          account: form.get('account'),
          paymentMethod: form.get('paymentMethod'),
          note: form.get('note'),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to save the transaction.');
      await loadData();
      setDialogOpen(false);
      setMessage('Transaction saved — your totals are up to date.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the transaction.');
    } finally {
      setSaving(false);
    }
  };

  const postAction = async (payload: Record<string, unknown>, successMessage: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to save your change.');
      await loadData();
      setMessage(successMessage);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your change.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/finance?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to remove the transaction.');
      await loadData();
      setMessage('Transaction removed.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove the transaction.');
    }
  };

  const page = (() => {
    switch (activeView) {
      case 'transactions':
        return <TransactionsView transactions={data.transactions} month={selectedMonth} search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} onDelete={deleteTransaction} />;
      case 'budgets':
        return <BudgetsView budgets={data.budgets} transactions={monthTransactions} onSave={(category, monthlyLimit) => postAction({ action: 'budget', category, monthlyLimit }, 'Monthly budget updated.')} saving={saving} />;
      case 'goals':
        return <GoalsView goals={data.goals} onContribute={(goalId, amount) => postAction({ action: 'goalContribution', goalId, amount }, 'Contribution added to your goal.')} saving={saving} />;
      case 'accounts':
        return <AccountsView accounts={data.accounts} transactions={monthTransactions} />;
      case 'college':
        return <CollegeView />;
      case 'reports':
        return <ReportsView transactions={data.transactions} totals={totals} />;
      case 'settings':
        return <SettingsView data={data} currentUser={currentUser} onReset={() => postAction({ action: 'resetDemo' }, 'Demo transactions removed. Add your first real transaction whenever you’re ready.')} saving={saving} />;
      default:
        return <Overview data={data} month={selectedMonth} transactions={monthTransactions} totals={totals} onNavigate={setActiveView} />;
    }
  })();

  const title = viewTitles[activeView];

  return (
    <main className="min-h-screen bg-[#f2f5f3] pb-20 text-[#142925] lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#28473f] bg-[#102e29] px-5 py-6 text-white lg:flex lg:flex-col">
        <button type="button" onClick={() => setActiveView('overview')} className="flex items-center gap-3 px-2 text-left">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#f2b45d] text-[#173b34]"><CircleDollarSign className="size-5" /></div>
          <div><p className="text-base font-semibold tracking-tight">Campus Cash</p><p className="text-xs text-white/55">Student finance, sorted.</p></div>
        </button>
        <nav aria-label="Primary navigation" className="mt-9 space-y-1.5">
          {navItems.map((item) => (
            <button key={item.key} type="button" onClick={() => setActiveView(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${activeView === item.key ? 'bg-white text-[#153a33] shadow-sm' : 'text-white/65 hover:bg-white/8 hover:text-white'}`}>
              <item.icon className="size-4" /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#f8cd8e]"><Sparkles className="size-3.5" /> Smart money nudge</div>
          <p className="text-sm leading-5 text-white/80">
            Your safe pace is <strong className="text-white">{formatMoney(Math.max(0, totals.budget - totals.expenses) / 28)}</strong> per day this month.
          </p>
        </div>
        {currentUser && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f2b45d] text-xs font-bold text-[#173b34]">
              {currentUser.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{currentUser.displayName}</p>
              <p className="truncate text-[10px] text-white/45">Private workspace</p>
            </div>
            <a href="/signout-with-chatgpt?return_to=%2F" target="_top" aria-label="Sign out" className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
            </a>
          </div>
        )}
        <button type="button" onClick={() => setActiveView('settings')} className={`mt-4 flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${activeView === 'settings' ? 'bg-white text-[#153a33]' : 'text-white/55 hover:text-white'}`}><Settings className="size-4" /> Settings</button>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[#dce5e1]/80 bg-[#f2f5f3]/90 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10 lg:py-4">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <button type="button" onClick={() => setActiveView('overview')} className="flex items-center gap-2.5 lg:hidden">
              <div className="grid size-9 place-items-center rounded-xl bg-[#173e36] text-[#f7c87c]"><CircleDollarSign className="size-5" /></div>
              <span className="font-semibold">Campus Cash</span>
            </button>
            <div className="relative hidden w-full max-w-sm md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71807c]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} onFocus={() => setActiveView('transactions')} aria-label="Search transactions" placeholder="Search transactions…" className="h-10 border-[#d6e0dc] bg-white pl-9 shadow-sm" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {loading ? <span className="hidden items-center gap-1.5 text-xs text-[#71807c] sm:flex"><Loader2 className="size-3.5 animate-spin" /> Syncing</span> : currentUser && <button type="button" onClick={() => setActiveView('settings')} className="hidden items-center gap-2 rounded-full border border-[#d6e0dc] bg-white py-1.5 pl-1.5 pr-3 text-xs font-semibold text-[#39574f] shadow-sm sm:flex"><span className="grid size-6 place-items-center rounded-full bg-[#173e36] text-[10px] text-white">{currentUser.displayName.slice(0, 1).toUpperCase()}</span>{currentUser.displayName}</button>}
              <Button variant="outline" size="icon-lg" aria-label="Notifications" className="hidden rounded-xl border-[#d6e0dc] bg-white sm:inline-flex"><Bell className="size-4" /></Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button className="h-10 rounded-xl bg-[#173e36] px-4 text-white hover:bg-[#235b50]" />}><Plus className="size-4" /><span className="hidden sm:inline">Add transaction</span><span className="sm:hidden">Add</span></DialogTrigger>
                <TransactionDialog onSubmit={submitTransaction} saving={saving} />
              </Dialog>
            </div>
          </div>
        </header>

        {error && <div role="alert" className="mx-auto mt-4 flex max-w-[1360px] items-center justify-between gap-4 rounded-xl border border-[#e5c497] bg-[#fff4e3] px-4 py-3 text-sm text-[#7f541c]"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => { setError(''); void loadData(); }}><RefreshCw /> Retry</Button></div>}
        {message && <div role="status" className="fixed right-4 top-20 z-50 flex max-w-sm items-center gap-2 rounded-xl bg-[#173e36] px-4 py-3 text-sm font-medium text-white shadow-xl"><CircleCheck className="size-4 text-[#f5c77c]" />{message}</div>}

        <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#6d817b]">{title.eyebrow}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#142925] sm:text-4xl">{title.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#6d817b]">{title.subtitle}</p>
            </div>
            {activeView !== 'settings' && <NativeSelect value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Select month" className="w-44 bg-white shadow-sm"><NativeSelectOption value="2026-09">September 2026</NativeSelectOption><NativeSelectOption value="2026-08">August 2026</NativeSelectOption><NativeSelectOption value="2026-07">July 2026</NativeSelectOption></NativeSelect>}
          </div>
          <div className="mt-7">{page}</div>
        </div>
      </section>

      <nav aria-label="Mobile navigation" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-[#d6e0dc] bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <button key={item.key} type="button" onClick={() => setActiveView(item.key)} className={`grid place-items-center gap-1 rounded-xl py-2 text-[10px] font-medium ${activeView === item.key ? 'bg-[#173e36] text-white' : 'text-[#657b75]'}`}><item.icon className="size-4" /><span>{item.label.split(' ')[0]}</span></button>
        ))}
      </nav>
    </main>
  );
}

function TransactionDialog({ onSubmit, saving }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  return (
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl p-5">
      <DialogHeader><DialogTitle className="text-xl">Add a transaction</DialogTitle><DialogDescription>Log it now. Every view updates automatically.</DialogDescription></DialogHeader>
      <form className="grid gap-4 pt-1" onSubmit={onSubmit}>
        <label className="grid gap-1.5 text-sm font-medium">Description<Input name="description" required placeholder="e.g. College canteen" className="h-10" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Amount<Input name="amount" required min="1" step="0.01" type="number" placeholder="₹ 0" className="h-10" /></label>
          <label className="grid gap-1.5 text-sm font-medium">Type<NativeSelect name="type" className="w-full"><NativeSelectOption value="expense">Expense</NativeSelectOption><NativeSelectOption value="income">Income</NativeSelectOption><NativeSelectOption value="savings">Savings</NativeSelectOption></NativeSelect></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Category<NativeSelect name="category" className="w-full">{categories.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="grid gap-1.5 text-sm font-medium">Date<Input name="occurredOn" type="date" defaultValue="2026-09-02" required className="h-10" /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Account<NativeSelect name="account" className="w-full">{['UPI wallet', 'Bank account', 'Cash', 'Savings account'].map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
          <label className="grid gap-1.5 text-sm font-medium">Payment method<NativeSelect name="paymentMethod" className="w-full">{['UPI', 'Cash', 'Card', 'Bank transfer', 'Net banking'].map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">Note <span className="font-normal text-[#71807c]">(optional)</span><Input name="note" placeholder="Anything worth remembering" className="h-10" /></label>
        <DialogFooter className="mt-1"><Button disabled={saving} type="submit" className="h-10 bg-[#173e36] px-5">{saving && <Loader2 className="animate-spin" />}Save transaction</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function Overview({ data, transactions, totals, month, onNavigate }: { data: FinanceData; transactions: Transaction[]; totals: { income: number; expenses: number; savings: number; budget: number; balance: number }; month: string; onNavigate: (view: View) => void }) {
  const savingsRate = totals.income ? Math.round((totals.savings / totals.income) * 100) : 0;
  const budgetUsed = totals.budget ? Math.round((totals.expenses / totals.budget) * 100) : 0;
  const health = Math.max(0, Math.min(100, Math.round(70 + savingsRate * 0.7 - Math.max(0, budgetUsed - 70) * 0.5)));
  const monthlyChart = ['2026-07', '2026-08', '2026-09'].map((key) => {
    const rows = data.transactions.filter((item) => item.occurredOn.startsWith(key));
    const sum = (type: TransactionType) => toRupees(rows.filter((item) => item.type === type).reduce((total, item) => total + item.amountPaise, 0));
    return { month: monthLabel(key).slice(0, 3), income: sum('income'), expenses: sum('expense'), savings: sum('savings') };
  });
  const spending = data.budgets.map((budget) => ({ ...budget, spent: transactions.filter((item) => item.type === 'expense' && item.category === budget.category).reduce((sum, item) => sum + item.amountPaise, 0) })).sort((a, b) => b.spent - a.spent);
  const categoryData = spending.filter((item) => item.spent > 0).slice(0, 5).map((item) => ({ name: item.category, value: toRupees(item.spent) }));
  const pieColors = ['#173e36', '#f19a4b', '#5d67b2', '#77a697', '#d56d4f'];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Balance left', value: formatMoney(totals.balance), meta: totals.income ? `${Math.max(0, Math.round((totals.balance / totals.income) * 100))}% of income` : 'Add income to begin', icon: WalletCards, tone: 'bg-[#173e36] text-white' },
          { label: 'Spent this month', value: formatMoney(totals.expenses), meta: `${formatMoney(Math.max(0, totals.budget - totals.expenses))} under plan`, icon: TrendingDown, tone: 'bg-white' },
          { label: 'Saved', value: formatMoney(totals.savings), meta: `${savingsRate}% savings rate`, icon: Target, tone: 'bg-white' },
          { label: 'Money health', value: `${health} / 100`, meta: health >= 75 ? 'Looking strong' : 'Room to improve', icon: Sparkles, tone: 'bg-[#fff3df]' },
        ].map((item) => <MetricCard key={item.label} {...item} />)}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <Panel title="Cash flow" subtitle="Income, spending, and savings over three months" action={<span className="rounded-full bg-[#e7f5ef] px-2.5 py-1 text-xs font-semibold text-[#167463]">{formatMoney(totals.balance)} left</span>}>
          <ChartContainer config={chartConfig} className="mt-5 h-[280px] w-full">
            <BarChart data={monthlyChart} margin={{ left: -15, right: 8 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" fill="var(--color-expenses)" radius={[6, 6, 0, 0]} /><Bar dataKey="savings" fill="var(--color-savings)" radius={[6, 6, 0, 0]} /></BarChart>
          </ChartContainer>
        </Panel>

        <Panel title="Spending mix" subtitle={`Where your money went in ${monthLabel(month)}`} action={<Button variant="ghost" size="icon-sm" aria-label="View budgets" onClick={() => onNavigate('budgets')}><ChevronRight /></Button>}>
          {categoryData.length ? <ChartContainer config={chartConfig} className="mx-auto mt-3 h-[190px] max-w-xs"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>{categoryData.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent nameKey="name" />} /></PieChart></ChartContainer> : <EmptyState text="Add expenses to see your spending mix." />}
          <div className="grid grid-cols-2 gap-2">{categoryData.slice(0, 4).map((item, index) => <div key={item.name} className="flex items-center gap-2 text-xs text-[#647a74]"><span className="size-2 rounded-full" style={{ backgroundColor: pieColors[index] }} />{item.name}</div>)}</div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <Panel title="Budget watch" subtitle="Your monthly limits vs actual spending" action={<Button variant="ghost" className="text-[#167463]" onClick={() => onNavigate('budgets')}>Manage <ChevronRight /></Button>}>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">{spending.slice(0, 6).map((item) => <BudgetMeter key={item.category} name={item.category} spent={item.spent} total={item.monthlyLimitPaise} />)}</div>
        </Panel>
        <Panel title="Emergency fund" subtitle="Your first line of financial safety" action={<PiggyBank className="size-5 text-[#198f7d]" />}>
          {data.goals.filter((goal) => goal.kind === 'Safety').map((goal) => {
            const percent = Math.round((goal.currentPaise / goal.targetPaise) * 100);
            return <div key={goal.id} className="mt-6"><div className="flex items-end justify-between"><p className="text-3xl font-semibold tracking-tight">{formatMoney(goal.currentPaise)}</p><span className="text-sm font-semibold">{percent}%</span></div><Progress value={percent} className="mt-4"><ProgressTrack className="h-2"><ProgressIndicator className="bg-[#198f7d]" /></ProgressTrack></Progress><p className="mt-3 text-sm text-[#6d817b]">{formatMoney(goal.targetPaise - goal.currentPaise)} to reach your {formatMoney(goal.targetPaise)} target.</p><Button variant="outline" className="mt-5 w-full" onClick={() => onNavigate('goals')}>View savings goals</Button></div>;
          })}
        </Panel>
      </div>

      <Panel className="mt-5" title="Recent activity" subtitle="Your latest money movements" action={<Button variant="ghost" className="text-[#167463]" onClick={() => onNavigate('transactions')}>View all <ChevronRight /></Button>}>
        <TransactionTable rows={transactions.slice().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)).slice(0, 6)} compact />
      </Panel>
    </>
  );
}

function TransactionsView({ transactions, month, search, setSearch, typeFilter, setTypeFilter, onDelete }: { transactions: Transaction[]; month: string; search: string; setSearch: (value: string) => void; typeFilter: 'all' | TransactionType; setTypeFilter: (value: 'all' | TransactionType) => void; onDelete: (id: string) => void }) {
  const rows = transactions.filter((item) => item.occurredOn.startsWith(month) && (typeFilter === 'all' || item.type === typeFilter) && `${item.description} ${item.category} ${item.account}`.toLowerCase().includes(search.toLowerCase()));
  const exportCsv = () => {
    const header = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Account', 'Payment Method'];
    const lines = rows.map((item) => [item.occurredOn, item.description, item.type, item.category, toRupees(item.amountPaise), item.account, item.paymentMethod].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' }));
    link.download = `campus-cash-${month}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <Panel title={`${rows.length} transactions`} subtitle={`Showing ${monthLabel(month)} activity`} action={<Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>}>
      <div className="mb-5 mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71807c]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description, category, or account" className="h-10 pl-9" /></div>
        <NativeSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | TransactionType)} className="w-full sm:w-44"><NativeSelectOption value="all">All types</NativeSelectOption><NativeSelectOption value="expense">Expenses</NativeSelectOption><NativeSelectOption value="income">Income</NativeSelectOption><NativeSelectOption value="savings">Savings</NativeSelectOption></NativeSelect>
      </div>
      <TransactionTable rows={rows} onDelete={onDelete} />
    </Panel>
  );
}

function BudgetsView({ budgets, transactions, onSave, saving }: { budgets: Budget[]; transactions: Transaction[]; onSave: (category: string, amount: number) => void; saving: boolean }) {
  const totalBudget = budgets.reduce((sum, item) => sum + item.monthlyLimitPaise, 0);
  const totalSpent = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountPaise, 0);
  const actual = (category: string) => transactions.filter((item) => item.type === 'expense' && item.category === category).reduce((sum, item) => sum + item.amountPaise, 0);
  const submitBudget = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave(String(form.get('category')), Number(form.get('amount'))); };
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3"><MiniStat label="Total monthly plan" value={formatMoney(totalBudget)} icon={Target} /><MiniStat label="Used so far" value={formatMoney(totalSpent)} icon={TrendingDown} /><MiniStat label="Still available" value={formatMoney(Math.max(0, totalBudget - totalSpent))} icon={WalletCards} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_0.65fr]">
        <Panel title="Category budgets" subtitle="Green under 70%, amber near the limit, red when over"><div className="mt-5 grid gap-5 sm:grid-cols-2">{budgets.map((budget) => <BudgetMeter key={budget.category} name={budget.category} spent={actual(budget.category)} total={budget.monthlyLimitPaise} detailed />)}</div></Panel>
        <Panel title="Edit a limit" subtitle="Set or replace any monthly category budget"><form className="mt-5 grid gap-4" onSubmit={submitBudget}><label className="grid gap-1.5 text-sm font-medium">Category<NativeSelect name="category" className="w-full">{categories.filter((item) => !['Savings', 'Scholarships', 'Allowance', 'Freelance'].includes(item)).map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="grid gap-1.5 text-sm font-medium">Monthly limit<Input name="amount" required min="0" type="number" placeholder="₹ 5,000" className="h-10" /></label><Button disabled={saving} type="submit" className="mt-1 h-10 bg-[#173e36]">{saving && <Loader2 className="animate-spin" />}Update budget</Button></form><div className="mt-6 rounded-xl bg-[#f3f6f4] p-4 text-sm leading-6 text-[#536d66]"><strong className="text-[#173e36]">Tip:</strong> Start with a realistic limit based on your last two months, then tighten it gradually.</div></Panel>
      </div>
    </>
  );
}

function GoalsView({ goals, onContribute, saving }: { goals: SavingsGoal[]; onContribute: (id: string, amount: number) => void; saving: boolean }) {
  const iconMap = { Safety: ShieldCheck, Technology: Laptop, Learning: GraduationCap };
  return <div className="grid gap-5 lg:grid-cols-3">{goals.map((goal) => {
    const percent = Math.min(100, Math.round((goal.currentPaise / goal.targetPaise) * 100));
    const Icon = iconMap[goal.kind as keyof typeof iconMap] ?? Target;
    return <Panel key={goal.id} title={goal.name} subtitle={`${goal.kind} • target by ${new Date(`${goal.deadline}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`} action={<div className="grid size-10 place-items-center rounded-xl bg-[#e7f5ef] text-[#167463]"><Icon className="size-5" /></div>}><div className="mt-7"><div className="flex items-end justify-between"><p className="text-3xl font-semibold tracking-tight">{formatMoney(goal.currentPaise)}</p><span className="text-sm font-semibold text-[#167463]">{percent}%</span></div><p className="mt-1 text-sm text-[#71807c]">of {formatMoney(goal.targetPaise)}</p><Progress value={percent} className="mt-5"><ProgressTrack className="h-2"><ProgressIndicator className="bg-[#198f7d]" /></ProgressTrack></Progress><div className="mt-5 flex items-center justify-between rounded-xl bg-[#f3f6f4] p-3 text-sm"><span className="text-[#6d817b]">Left to save</span><strong>{formatMoney(Math.max(0, goal.targetPaise - goal.currentPaise))}</strong></div><Dialog><DialogTrigger render={<Button className="mt-4 h-10 w-full bg-[#173e36]" />}><Plus />Add contribution</DialogTrigger><DialogContent className="max-w-sm rounded-3xl"><DialogHeader><DialogTitle>Add to {goal.name}</DialogTitle><DialogDescription>Record a transfer toward this goal.</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); const amount = Number(new FormData(event.currentTarget).get('amount')); onContribute(goal.id, amount); }} className="grid gap-4"><label className="grid gap-1.5 text-sm font-medium">Contribution amount<Input name="amount" type="number" required min="1" placeholder="₹ 1,000" className="h-10" /></label><DialogFooter><Button disabled={saving} className="bg-[#173e36]" type="submit">{saving && <Loader2 className="animate-spin" />}Save contribution</Button></DialogFooter></form></DialogContent></Dialog></div></Panel>;
  })}</div>;
}

function AccountsView({ accounts, transactions }: { accounts: Account[]; transactions: Transaction[] }) {
  const net = accounts.reduce((sum, item) => sum + item.balancePaise, 0);
  const methods = [...new Set(transactions.map((item) => item.paymentMethod))].map((method) => ({ method, value: transactions.filter((item) => item.type === 'expense' && item.paymentMethod === method).reduce((sum, item) => sum + item.amountPaise, 0) })).sort((a, b) => b.value - a.value);
  return <><div className="rounded-3xl bg-[#173e36] p-6 text-white sm:p-8"><p className="text-sm text-white/60">Total across tracked accounts</p><p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{formatMoney(net)}</p><p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Reconcile these balances with your banking and UPI apps once a week to catch missing entries early.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{accounts.map((account, index) => <article key={account.id} className="rounded-2xl border border-[#dce5e1] bg-white p-5 shadow-[0_10px_30px_rgba(24,62,54,0.04)]"><div className="flex items-center justify-between"><div className={`grid size-10 place-items-center rounded-xl ${index === 3 ? 'bg-[#fff0d9] text-[#9a5f17]' : 'bg-[#e7f5ef] text-[#167463]'}`}>{account.type === 'Bank' ? <Landmark className="size-5" /> : account.type === 'Savings' ? <PiggyBank className="size-5" /> : <WalletCards className="size-5" />}</div><span className="text-xs text-[#71807c]">{account.type}</span></div><p className="mt-5 text-sm font-medium text-[#6d817b]">{account.name}</p><p className="mt-1 text-2xl font-semibold">{formatMoney(account.balancePaise)}</p></article>)}</div><Panel className="mt-5" title="Payment method activity" subtitle="How this month’s expenses were paid"><div className="mt-5 space-y-4">{methods.map((item) => <div key={item.method} className="flex items-center justify-between border-b border-[#e8eeeb] pb-4 last:border-0"><div><p className="font-medium">{item.method}</p><p className="mt-0.5 text-xs text-[#71807c]">{transactions.filter((row) => row.paymentMethod === item.method && row.type === 'expense').length} transactions</p></div><strong>{formatMoney(item.value)}</strong></div>)}</div></Panel></>;
}

function CollegeView() {
  const feeItems = [
    { label: 'Semester tuition', due: '10 Oct', amount: 1800000, status: 'Plan now', icon: GraduationCap },
    { label: 'Exam & lab forms', due: '05 Nov', amount: 220000, status: 'Upcoming', icon: BookOpen },
    { label: 'Hostel renewal', due: '01 Dec', amount: 750000, status: 'Upcoming', icon: Landmark },
    { label: 'Expected scholarship', due: '15 Oct', amount: -650000, status: 'Expected', icon: Sparkles },
  ];
  const planning = [
    { title: 'Food & mess', amount: '₹5,000 / month', icon: Utensils, copy: 'Mess, canteen, groceries, and delivery.' },
    { title: 'Travel', amount: '₹3,000 / month', icon: Bus, copy: 'Metro, bus pass, rides, and hometown trips.' },
    { title: 'Technology', amount: '₹65,000 goal', icon: Laptop, copy: 'Laptop, accessories, repairs, and warranties.' },
    { title: 'AI / ML learning', amount: '₹2,500 / month', icon: GraduationCap, copy: 'Courses, APIs, books, and project hosting.' },
  ];
  return <><div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"><Panel title="Upcoming college payments" subtitle="Fees, deposits, and expected concessions"><div className="mt-5 space-y-3">{feeItems.map((item) => <div key={item.label} className="flex items-center gap-4 rounded-xl border border-[#e2e9e6] p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f5ef] text-[#167463]"><item.icon className="size-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold">{item.label}</p><p className="mt-0.5 text-xs text-[#71807c]">Due {item.due} • {item.status}</p></div><strong className={item.amount < 0 ? 'text-[#16806d]' : ''}>{item.amount < 0 ? '−' : ''}{formatMoney(Math.abs(item.amount))}</strong></div>)}</div></Panel><Panel title="Semester readiness" subtitle="What to keep ready before October"><div className="mt-5 text-center"><div className="mx-auto grid size-28 place-items-center rounded-full border-[10px] border-[#dbeee8]"><span className="text-2xl font-semibold">42%</span></div><p className="mt-5 text-sm text-[#71807c]">You have ₹8,300 of the ₹19,550 net October requirement ready.</p><div className="mt-5 rounded-xl bg-[#fff3df] p-4 text-left text-sm leading-6 text-[#6f5229]"><strong>Suggested:</strong> move ₹2,250 each week for the next five weeks.</div></div></Panel></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{planning.map((item) => <article key={item.title} className="rounded-2xl border border-[#dce5e1] bg-white p-5"><div className="grid size-10 place-items-center rounded-xl bg-[#f3f6f4] text-[#173e36]"><item.icon className="size-5" /></div><h3 className="mt-5 font-semibold">{item.title}</h3><p className="mt-1 text-lg font-semibold text-[#167463]">{item.amount}</p><p className="mt-2 text-sm leading-5 text-[#71807c]">{item.copy}</p></article>)}</div><Panel className="mt-5" title="Purchase pause" subtitle="A simple check before any non-essential purchase"><div className="mt-5 grid gap-3 sm:grid-cols-3">{['Do I need it this semester?', 'Can I buy it without touching savings?', 'Will I still want it after 72 hours?'].map((question, index) => <div key={question} className="rounded-xl bg-[#f3f6f4] p-4"><span className="text-xs font-semibold text-[#167463]">CHECK {index + 1}</span><p className="mt-2 text-sm font-medium leading-5">{question}</p></div>)}</div></Panel></>;
}

function ReportsView({ transactions, totals }: { transactions: Transaction[]; totals: { income: number; expenses: number; savings: number; budget: number; balance: number } }) {
  const rows = ['2026-07', '2026-08', '2026-09'].map((month) => {
    const current = transactions.filter((item) => item.occurredOn.startsWith(month));
    const sum = (type: TransactionType) => current.filter((item) => item.type === type).reduce((total, item) => total + item.amountPaise, 0);
    return { month: monthLabel(month).slice(0, 3), income: toRupees(sum('income')), expenses: toRupees(sum('expense')), savings: toRupees(sum('savings')), balance: toRupees(sum('income') - sum('expense') - sum('savings')) };
  });
  const topCategory = transactions.filter((item) => item.type === 'expense' && item.occurredOn.startsWith('2026-09')).reduce<Record<string, number>>((map, item) => ({ ...map, [item.category]: (map[item.category] ?? 0) + item.amountPaise }), {});
  const top = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0];
  return <><div className="grid gap-4 sm:grid-cols-3"><MiniStat label="September surplus" value={formatMoney(totals.balance)} icon={TrendingUp} /><MiniStat label="Savings rate" value={`${totals.income ? Math.round((totals.savings / totals.income) * 100) : 0}%`} icon={PiggyBank} /><MiniStat label="Largest spend area" value={top?.[0] ?? 'None yet'} icon={BarChart3} /></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><Panel title="Three-month direction" subtitle="Closing balance after spending and savings"><ChartContainer config={chartConfig} className="mt-5 h-[310px] w-full"><LineChart data={rows} margin={{ left: -15, right: 18 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="balance" name="Balance" stroke="#173e36" strokeWidth={3} dot={{ fill: '#f19a4b', strokeWidth: 0, r: 5 }} /></LineChart></ChartContainer></Panel><Panel title="This month’s insight" subtitle="A practical read on your numbers"><div className="mt-5 space-y-4">{[{ icon: CircleCheck, title: 'Budget is healthy', copy: `You have used ${totals.budget ? Math.round((totals.expenses / totals.budget) * 100) : 0}% of planned spending.` }, { icon: PiggyBank, title: 'Savings habit started', copy: `${formatMoney(totals.savings)} is already separated from spending money.` }, { icon: CalendarClock, title: 'College payment ahead', copy: 'Begin funding October fees now to avoid a last-minute cash squeeze.' }].map((item) => <div key={item.title} className="flex gap-3 rounded-xl bg-[#f3f6f4] p-4"><item.icon className="mt-0.5 size-4 shrink-0 text-[#167463]" /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#71807c]">{item.copy}</p></div></div>)}</div></Panel></div><Panel className="mt-5" title="Monthly close checklist" subtitle="Five minutes at month-end keeps every report trustworthy"><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{['Reconcile bank and UPI balances', 'Check refunds and shared expenses', 'Move savings before spending', 'Set next month’s category limits'].map((item, index) => <div key={item} className="flex gap-3 rounded-xl border border-[#e2e9e6] p-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e7f5ef] text-xs font-bold text-[#167463]">{index + 1}</span><p className="text-sm font-medium leading-5">{item}</p></div>)}</div></Panel></>;
}

function SettingsView({ data, currentUser, onReset, saving }: { data: FinanceData; currentUser: CurrentUser | null; onReset: () => void; saving: boolean }) {
  const demoCount = data.transactions.filter((item) => Boolean(item.isDemo)).length;
  return <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]"><div className="space-y-5"><Panel title="Student account" subtitle="Your identity keeps this budget workspace separate"><div className="mt-5 flex items-center gap-4 rounded-xl border border-[#dce5e1] p-4"><div className="grid size-11 place-items-center rounded-full bg-[#173e36] text-white"><UserCircle className="size-5" /></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{currentUser?.displayName ?? 'Signed-in student'}</p><p className="truncate text-sm text-[#71807c]">{currentUser?.email}</p></div><a href="/signout-with-chatgpt?return_to=%2F" target="_top" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d6e0dc] px-3 text-sm font-medium hover:bg-[#f3f6f4]"><LogOut className="size-4" />Sign out</a></div></Panel><Panel title="Demo data" subtitle="Explore safely, then clear examples before real use"><div className="mt-5 flex flex-col gap-4 rounded-xl bg-[#fff3df] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{demoCount} sample transactions are active</p><p className="mt-1 text-sm text-[#765c35]">Only your demo entries are removed. Other students are never affected.</p></div><Button disabled={saving || demoCount === 0} variant="outline" onClick={onReset}>{saving ? <Loader2 className="animate-spin" /> : <Trash2 />}Remove demo data</Button></div></Panel><Panel title="Categories" subtitle="The shared category system used across budgets and reports"><div className="mt-5 flex flex-wrap gap-2">{categories.map((item) => <span key={item} className="rounded-full border border-[#dce5e1] bg-[#f7f9f8] px-3 py-1.5 text-sm text-[#536d66]">{item}</span>)}</div></Panel></div><div className="space-y-5"><Panel title="Data & privacy" subtitle="How every student’s records are protected"><div className="mt-5 space-y-4">{[{ icon: ShieldCheck, title: 'Isolated by account', copy: 'Every database read and write is tied to the signed-in student on the server.' }, { icon: RefreshCw, title: 'Saved automatically', copy: 'New transactions and goal contributions persist across sessions.' }, { icon: Download, title: 'Portable records', copy: 'Each student can export only their own transaction history.' }].map((item) => <div key={item.title} className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e7f5ef] text-[#167463]"><item.icon className="size-4" /></div><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#71807c]">{item.copy}</p></div></div>)}</div></Panel><Panel title="About" subtitle="Built from your college finance specification"><p className="mt-5 text-sm leading-6 text-[#61756f]">Campus Cash brings transactions, budgets, savings, fees, accounts, subscriptions, purchase planning, and monthly insights into one private student workspace.</p></Panel></div></div>;
}

function MetricCard({ label, value, meta, icon: Icon, tone }: { label: string; value: string; meta: string; icon: typeof WalletCards; tone: string }) {
  const dark = tone.includes('text-white');
  return <article className={`rounded-2xl border border-[#dce5e1] p-5 shadow-[0_10px_30px_rgba(24,62,54,0.04)] ${tone}`}><div className="flex items-center justify-between"><p className={`text-sm ${dark ? 'text-white/65' : 'text-[#71807c]'}`}>{label}</p><Icon className={`size-4 ${dark ? 'text-[#f5c77c]' : 'text-[#198f7d]'}`} /></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className={`mt-1 text-xs ${dark ? 'text-white/55' : 'text-[#71807c]'}`}>{meta}</p></article>;
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Target }) {
  return <article className="flex items-center gap-4 rounded-2xl border border-[#dce5e1] bg-white p-5"><div className="grid size-11 place-items-center rounded-xl bg-[#e7f5ef] text-[#167463]"><Icon className="size-5" /></div><div><p className="text-xs text-[#71807c]">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div></article>;
}

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <article className={`rounded-2xl border border-[#dce5e1] bg-white p-5 shadow-[0_10px_30px_rgba(24,62,54,0.04)] sm:p-6 ${className}`}><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-[#71807c]">{subtitle}</p></div>{action}</div>{children}</article>;
}

function BudgetMeter({ name, spent, total, detailed = false }: { name: string; spent: number; total: number; detailed?: boolean }) {
  const percent = total ? Math.round((spent / total) * 100) : 0;
  const color = percent > 100 ? '#d35c4b' : percent >= 70 ? '#f19a4b' : '#198f7d';
  return <div className={detailed ? 'rounded-xl border border-[#e2e9e6] p-4' : ''}><div className="mb-2 flex items-end justify-between"><div><p className="text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-[#71807c]">{formatMoney(spent)} of {formatMoney(total)}</p></div><span className="text-sm font-semibold tabular-nums" style={{ color }}>{percent}%</span></div><Progress value={Math.min(percent, 100)}><ProgressTrack className={detailed ? 'h-2' : ''}><ProgressIndicator style={{ backgroundColor: color }} /></ProgressTrack></Progress>{detailed && <p className="mt-3 text-xs text-[#71807c]">{spent > total ? `${formatMoney(spent - total)} over limit` : `${formatMoney(total - spent)} remaining`}</p>}</div>;
}

function TransactionTable({ rows, compact = false, onDelete }: { rows: Transaction[]; compact?: boolean; onDelete?: (id: string) => void }) {
  if (!rows.length) return <EmptyState text="No transactions match this view yet." />;
  return <Table><TableHeader><TableRow><TableHead>Transaction</TableHead><TableHead className="hidden sm:table-cell">Category</TableHead><TableHead className="hidden md:table-cell">Date</TableHead>{!compact && <TableHead className="hidden lg:table-cell">Account</TableHead>}<TableHead className="text-right">Amount</TableHead>{onDelete && <TableHead><span className="sr-only">Actions</span></TableHead>}</TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell><div className="flex items-center gap-3"><div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.type === 'income' ? 'bg-[#e7f5ef] text-[#16806d]' : item.type === 'savings' ? 'bg-[#eeeefe] text-[#5d67b2]' : 'bg-[#fff0d9] text-[#a76518]'}`}>{item.type === 'income' ? <ArrowUpRight className="size-4" /> : item.type === 'savings' ? <PiggyBank className="size-4" /> : <ArrowDownRight className="size-4" />}</div><div><p className="font-medium">{item.description}</p><p className="mt-0.5 text-xs text-[#71807c] sm:hidden">{item.category}</p></div></div></TableCell><TableCell className="hidden text-[#71807c] sm:table-cell">{item.category}</TableCell><TableCell className="hidden text-[#71807c] md:table-cell">{new Date(`${item.occurredOn}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</TableCell>{!compact && <TableCell className="hidden text-[#71807c] lg:table-cell">{item.account}</TableCell>}<TableCell className={`text-right font-semibold tabular-nums ${item.type === 'income' ? 'text-[#16806d]' : item.type === 'savings' ? 'text-[#5d67b2]' : 'text-[#253a36]'}`}>{item.type === 'income' ? '+' : item.type === 'expense' ? '−' : ''}{formatMoney(item.amountPaise)}</TableCell>{onDelete && <TableCell className="w-10"><Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.description}`} onClick={() => onDelete(item.id)}><Trash2 className="text-[#9b655e]" /></Button></TableCell>}</TableRow>)}</TableBody></Table>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="my-6 grid min-h-36 place-items-center rounded-xl border border-dashed border-[#ccd9d4] bg-[#f8faf9] p-6 text-center"><div><ReceiptText className="mx-auto size-6 text-[#8aa098]" /><p className="mt-3 text-sm text-[#6d817b]">{text}</p></div></div>;
}
