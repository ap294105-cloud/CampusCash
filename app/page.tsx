'use client';

import { StudentUpgrades } from '@/components/student-upgrades';
import { readCsv, validDate } from '@/lib/student-planner';
import { SpatialBackdrop } from '@/components/spatial-backdrop';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Blocks,
  BookOpen,
  BrainCircuit,
  Bus,
  Calculator,
  CalendarClock,
  Camera,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  CreditCard,
  Download,
  Gift,
  Goal as GoalIcon,
  GraduationCap,
  IndianRupee,
  Landmark,
  Laptop,
  LayoutDashboard,
  Loader2,
  LogOut,
  MonitorSmartphone,
  PackageSearch,
  Pencil,
  PiggyBank,
  PlugZap,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Split,
  Sparkles,
  Target,
  Train,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Utensils,
  Upload,
  UserCircle,
  Users,
  WalletCards,
  Zap,
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
  DialogClose,
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

type View = 'overview' | 'transactions' | 'budgets' | 'toolkit' | 'goals' | 'accounts' | 'college' | 'reports' | 'settings' | 'admin';
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
type FeeSettings = { semesterOnePaise: number; semesterTwoPaise: number; examLabPaise: number; hostelYearlyPaise: number };
type FinanceData = { transactions: Transaction[]; budgets: Budget[]; goals: SavingsGoal[]; accounts: Account[]; feeSettings: FeeSettings | null };
type CurrentUser = { displayName: string; email: string };

const categories = [
  'Food', 'Travel', 'College fees', 'Hostel', 'Technology', 'AI / ML Learning',
  'Personal', 'Subscriptions', 'Savings', 'Scholarships', 'Allowance', 'Freelance',
];
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const currentMonth = today.slice(0, 7);

const navItems: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'transactions', label: 'Transactions', icon: ReceiptText },
  { key: 'budgets', label: 'Budgets', icon: BarChart3 },
  { key: 'toolkit', label: 'Money toolkit', icon: Blocks },
  { key: 'goals', label: 'Savings goals', icon: GoalIcon },
  { key: 'accounts', label: 'Accounts', icon: WalletCards },
  { key: 'college', label: 'College costs', icon: BookOpen },
  { key: 'reports', label: 'Reports & insights', icon: Sparkles },
];

const viewTitles: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: 'Wednesday, 2 September', title: 'Your money, at a glance.', subtitle: 'You’re on track this month. Keep the good streak going.' },
  transactions: { eyebrow: 'Money log', title: 'Every rupee, accounted for.', subtitle: 'Search, filter, add, or remove income and expenses.' },
  budgets: { eyebrow: 'Monthly plan', title: 'Spend with a clear limit.', subtitle: 'Compare each category’s plan with what you have actually spent.' },
  toolkit: { eyebrow: '20 student money tools', title: 'Your complete money toolkit.', subtitle: 'Plan, predict, split, save, and explore — from one private student workspace.' },
  goals: { eyebrow: 'Save with purpose', title: 'Small deposits. Big progress.', subtitle: 'Build your safety net and fund the things that move you forward.' },
  accounts: { eyebrow: 'Balance check', title: 'All your money in one view.', subtitle: 'Track bank, UPI, cash, and savings balances together.' },
  college: { eyebrow: 'Academic money plan', title: 'College costs, without surprises.', subtitle: 'Prepare for fees, hostel, learning, subscriptions, and purchases.' },
  reports: { eyebrow: 'Money review', title: 'Turn activity into insight.', subtitle: 'See monthly trends, annual direction, and practical next steps.' },
  settings: { eyebrow: 'Workspace', title: 'Make Campus Cash yours.', subtitle: 'Manage demo data, categories, and privacy preferences.' },
  admin: { eyebrow: 'Super admin', title: 'Operate Campus Cash safely.', subtitle: 'Review student accounts, audit activity, and export institution-owned backups.' },
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
  feeSettings: { semesterOnePaise: 900000, semesterTwoPaise: 900000, examLabPaise: 220000, hostelYearlyPaise: 750000 },
};

const chartConfig = {
  income: { label: 'Income', color: '#138a76' },
  expenses: { label: 'Expenses', color: '#e7bb79' },
  savings: { label: 'Savings', color: '#5d67b2' },
} satisfies ChartConfig;

const emptyFinanceData: FinanceData = {
  transactions: [],
  budgets: [],
  goals: [],
  accounts: [],
  feeSettings: fallbackData.feeSettings,
};

export default function Home() {
  const [data, setData] = useState<FinanceData>(emptyFinanceData);
  const [activeView, setActiveView] = useState<View>('overview');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
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

  useEffect(() => {
    const refreshMonth = () => {
      const liveMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).slice(0, 7);
      setSelectedMonth((previous) => previous === currentMonth ? liveMonth : previous);
    };
    const timer = window.setInterval(refreshMonth, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const monthTransactions = useMemo(
    () => data.transactions.filter((item) => item.occurredOn.startsWith(selectedMonth)),
    [data.transactions, selectedMonth],
  );

  const availableMonths = useMemo(() => {
    const liveYear = Number(currentMonth.slice(0, 4));
    const years = new Set([
      ...Array.from({ length: 5 }, (_, index) => String(liveYear - 2 + index)),
      ...data.transactions.map((item) => item.occurredOn.slice(0, 4)),
    ]);
    return [...years].sort().reverse().flatMap((year) => Array.from({ length: 12 }, (_, index) => `${year}-${String(12 - index).padStart(2, '0')}`));
  }, [data.transactions]);

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
      if (form.get('type') === 'income') window.dispatchEvent(new Event('campus-celebrate'));
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
      if (payload.action === 'goalContribution' || (payload.action === 'transaction' && payload.type === 'income')) window.dispatchEvent(new Event('campus-celebrate'));
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your change.');
      return false;
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

  const editTransaction = (id: string) => {
    const item = data.transactions.find((row) => row.id === id);
    if (!item) return;
    const description = window.prompt('Description', item.description);
    if (description === null) return;
    const amount = window.prompt('Amount in rupees', String(toRupees(item.amountPaise)));
    if (amount === null) return;
    const category = window.prompt('Category', item.category);
    if (category === null) return;
    const type = window.prompt('Type: income, expense, or savings', item.type);
    if (type === null) return;
    const occurredOn = window.prompt('Date (YYYY-MM-DD)', item.occurredOn);
    if (occurredOn === null) return;
    const account = window.prompt('Account', item.account);
    if (account === null) return;
    const paymentMethod = window.prompt('Payment method', item.paymentMethod);
    if (paymentMethod === null) return;
    const note = window.prompt('Note', item.note);
    if (note === null) return;
    void postAction({ action: 'updateTransaction', id, description, amount, category, type, occurredOn, account, paymentMethod, note }, 'Transaction updated.');
  };

  const page = (() => {
    switch (activeView) {
      case 'transactions':
        return <TransactionsView transactions={data.transactions} month={selectedMonth} search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} onDelete={deleteTransaction} onEdit={editTransaction} />;
      case 'budgets':
        return <BudgetsView budgets={data.budgets} transactions={monthTransactions} onSave={(category, monthlyLimit) => postAction({ action: 'budget', category, monthlyLimit }, 'Monthly budget updated.')} onDelete={(category) => postAction({ action: 'deleteBudget', category }, 'Budget envelope deleted.')} saving={saving} />;
      case 'toolkit':
        return <ToolkitView data={data} transactions={monthTransactions} totals={totals} onNavigate={setActiveView} onImportRows={(rows) => postAction({ action: 'bulkTransactions', rows }, 'CSV transactions imported. Duplicate rows were skipped.')} onAddReceipt={(receipt) => postAction({ action: 'transaction', ...receipt }, 'Receipt added as a transaction.')} />;
      case 'goals':
        return <><p className="mb-4 text-sm text-[#b3cbbf]">Your 3D savings model comes together as your combined goals approach completion.</p><GoalsView goals={data.goals} onContribute={(goalId, amount) => postAction({ action: 'goalContribution', goalId, amount }, 'Contribution added to your goal.')} onCreate={(name, target, deadline, kind) => postAction({ action: 'goalCreate', name, target, deadline, kind }, 'Savings goal created.')} onEdit={(id, name, target, deadline, kind) => postAction({ action: 'goalUpdate', id, name, target, deadline, kind }, 'Savings goal updated.')} onDelete={(goalId) => postAction({ action: 'deleteGoal', goalId }, 'Savings goal deleted.')} saving={saving} /></>;
      case 'accounts':
        return <AccountsView accounts={data.accounts} transactions={monthTransactions} onCreate={(name, type, balance) => postAction({ action: 'accountCreate', name, type, balance }, 'Account added.')} onEdit={(id, name, type, balance) => postAction({ action: 'accountUpdate', id, name, type, balance }, 'Account updated.')} onDelete={(id) => postAction({ action: 'accountDelete', id }, 'Account deleted.')} />;
      case 'college':
        return <CollegeView transactions={data.transactions} feeSettings={data.feeSettings ?? fallbackData.feeSettings!} onMarkPaid={(label, amount, date, category) => postAction({ action: 'transaction', description: label, amount, type: 'expense', category, occurredOn: date, account: 'Bank account', paymentMethod: 'Net banking', note: 'College fee planner' }, `${label} marked paid.`)} onMarkDue={(id) => deleteTransaction(id)} />;
      case 'reports':
        return <ReportsView transactions={data.transactions} totals={totals} month={selectedMonth} />;
      case 'settings':
        return <SettingsView data={data} currentUser={currentUser} onSaveFees={(values) => postAction({ action: 'saveFeeSettings', ...values }, 'Fee settings updated across College Costs.')} onReset={() => postAction({ action: 'resetDemo' }, 'Demo transactions removed. Add your first real transaction whenever you’re ready.')} onDeleteData={() => postAction({ action: 'deleteMyData' }, 'Your private finance records have been deleted.')} saving={saving} />;
      case 'admin':
        return <AdminView />;
      default:
        return <Overview data={data} month={selectedMonth} transactions={monthTransactions} totals={totals} onNavigate={setActiveView} />;
    }
  })();

  const title = activeView === 'overview'
    ? { ...viewTitles.overview, eyebrow: new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date()) }
    : viewTitles[activeView];

  return (
    <main suppressHydrationWarning className="spatial-app min-h-screen pb-20 text-[#ecf4ed] lg:pb-0" data-view={activeView}>
      <SpatialBackdrop view={activeView} goalProgress={data.goals.length ? data.goals.reduce((n,g)=>n+Math.min(g.currentPaise,g.targetPaise),0)/Math.max(1,data.goals.reduce((n,g)=>n+g.targetPaise,0)) : 0} />
      <aside className="spatial-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#29473e] bg-[#183f32] px-5 py-6 text-white lg:flex lg:flex-col">
        <button type="button" onClick={() => setActiveView('overview')} className="flex items-center gap-3 px-2 text-left">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#f2b45d] text-[#ecf4ed]"><CircleDollarSign className="size-5" /></div>
          <div><p className="text-base font-semibold tracking-tight">Campus Cash</p><p className="text-xs text-white/55">Student finance, sorted.</p></div>
        </button>
        <nav aria-label="Primary navigation" className="mt-9 space-y-1.5">
          {navItems.map((item) => (
            <button key={item.key} type="button" onClick={() => setActiveView(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${activeView === item.key ? 'bg-[#10271f] text-[#ecf4ed] shadow-sm' : 'text-white/65 hover:bg-[#10271f]/8 hover:text-white'}`}>
              <item.icon className="size-4" /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-[#10271f]/6 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#eac491]"><Sparkles className="size-3.5" /> Smart money nudge</div>
          <p className="text-sm leading-5 text-white/80">
            See your daily allowance on Overview, with bills and savings reserved.
          </p>
        </div>
        {currentUser && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f2b45d] text-xs font-bold text-[#ecf4ed]">
              {currentUser.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{currentUser.displayName}</p>
              <p className="truncate text-[10px] text-white/45">Private workspace</p>
            </div>
            <a href="/signout-with-chatgpt?return_to=%2F" target="_top" aria-label="Sign out" className="rounded-lg p-1.5 text-white/45 transition hover:bg-[#10271f]/10 hover:text-white">
              <LogOut className="size-4" />
            </a>
          </div>
        )}
        {currentUser?.email.toLowerCase() === 'ap294105@gmail.com' && <button type="button" onClick={() => setActiveView('admin')} className={`mt-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${activeView === 'admin' ? 'bg-[#10271f] text-[#ecf4ed]' : 'text-white/55 hover:text-white'}`}><Users className="size-4" /> Admin dashboard</button>}
        <button type="button" onClick={() => setActiveView('settings')} className={`mt-4 flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${activeView === 'settings' ? 'bg-[#10271f] text-[#ecf4ed]' : 'text-white/55 hover:text-white'}`}><Settings className="size-4" /> Settings</button>
      </aside>

      <section className="spatial-content lg:pl-64">
        <header className="spatial-topbar sticky top-0 z-20 border-b border-[#29473e]/80 bg-[#122b24]/90 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10 lg:py-4">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <button type="button" onClick={() => setActiveView('overview')} className="flex items-center gap-2.5 lg:hidden">
              <div className="grid size-9 place-items-center rounded-xl bg-[#183f32] text-[#eac491]"><CircleDollarSign className="size-5" /></div>
              <span className="font-semibold">Campus Cash</span>
            </button>
            <div className="relative hidden w-full max-w-sm md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a2bcb0]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} onFocus={() => setActiveView('transactions')} aria-label="Search transactions" placeholder="Search transactions…" className="h-10 border-[#29473e] bg-[#10271f] pl-9 shadow-sm" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {loading ? <span className="hidden items-center gap-1.5 text-xs text-[#a2bcb0] sm:flex"><Loader2 className="size-3.5 animate-spin" /> Syncing</span> : currentUser && <button type="button" onClick={() => setActiveView('settings')} className="hidden items-center gap-2 rounded-full border border-[#29473e] bg-[#10271f] py-1.5 pl-1.5 pr-3 text-xs font-semibold text-[#ecf4ed] shadow-sm sm:flex"><span className="grid size-6 place-items-center rounded-full bg-[#183f32] text-[10px] text-white">{currentUser.displayName.slice(0, 1).toUpperCase()}</span>{currentUser.displayName}</button>}
              <Button variant="outline" size="icon-lg" aria-label="Notifications" onClick={() => setError('Notifications will appear here when a budget, bill, or renewal needs your attention.')} className="hidden rounded-xl border-[#29473e] bg-[#10271f] sm:inline-flex"><Bell className="size-4" /></Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button className="h-10 rounded-xl bg-[#183f32] px-4 text-white hover:bg-[#183f32]" />}><Plus className="size-4" /><span className="hidden sm:inline">Add transaction</span><span className="sm:hidden">Add</span></DialogTrigger>
                <TransactionDialog onSubmit={submitTransaction} saving={saving} />
              </Dialog>
            </div>
          </div>
        </header>

        {error && <div role="alert" className="mx-auto mt-4 flex max-w-[1360px] items-center justify-between gap-4 rounded-xl border border-[#29473e] bg-[#30291c] px-4 py-3 text-sm text-[#ecf4ed]"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => { setError(''); void loadData(); }}><RefreshCw /> Retry</Button></div>}
        {message && <div role="status" className="fixed right-4 top-20 z-50 flex max-w-sm items-center gap-2 rounded-xl bg-[#183f32] px-4 py-3 text-sm font-medium text-white shadow-xl"><CircleCheck className="size-4 text-[#eac491]" />{message}</div>}

        <div className="spatial-workspace mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          <div className="spatial-heading flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p suppressHydrationWarning className="text-sm font-medium text-[#a2bcb0]">{title.eyebrow}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#ecf4ed] sm:text-4xl">{title.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#a2bcb0]">{title.subtitle}</p>
            </div>
            {activeView !== 'settings' && <NativeSelect value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Select month" className="w-44 bg-[#10271f] shadow-sm">{availableMonths.map((month) => <NativeSelectOption key={month} value={month}>{monthLabel(month)}</NativeSelectOption>)}</NativeSelect>}
          </div>
          <div className="spatial-page mt-7" key={activeView}>{!loading && currentUser && <StudentUpgrades data={data} userKey={currentUser.email} onRefresh={loadData} onNavigate={setActiveView} view={activeView}/>} {page}</div>
        </div>
      </section>

      <datalist id="category-options">{categories.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="account-options">{['UPI wallet', 'Bank account', 'Cash', 'Savings account'].map((item) => <option key={item} value={item} />)}</datalist>

      <nav aria-label="Mobile navigation" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-[#29473e] bg-[#10271f]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
        {[...navItems, { key: 'settings' as View, label: 'Settings', icon: Settings }].map((item) => (
          <button key={item.key} type="button" onClick={() => setActiveView(item.key)} className={`grid place-items-center gap-1 rounded-xl py-2 text-[10px] font-medium ${activeView === item.key ? 'bg-[#183f32] text-white' : 'text-[#a2bcb0]'}`}><item.icon className="size-4" /><span>{item.label.split(' ')[0]}</span></button>
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
          <label className="grid gap-1.5 text-sm font-medium">Category<Input name="category" list="category-options" defaultValue="Food" required placeholder="Food or a custom category" className="h-10" /></label>
          <label className="grid gap-1.5 text-sm font-medium">Date<Input name="occurredOn" type="date" defaultValue={today} required className="h-10" /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Account<Input name="account" list="account-options" defaultValue="UPI wallet" required className="h-10" /></label>
          <label className="grid gap-1.5 text-sm font-medium">Payment method<NativeSelect name="paymentMethod" className="w-full">{['UPI', 'Cash', 'Card', 'Bank transfer', 'Net banking'].map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">Note <span className="font-normal text-[#a2bcb0]">(optional)</span><Input name="note" placeholder="Anything worth remembering" className="h-10" /></label>
        <DialogFooter className="mt-1"><Button disabled={saving} type="submit" className="h-10 bg-[#183f32] px-5">{saving && <Loader2 className="animate-spin" />}Save transaction</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function Overview({ data, transactions, totals, month, onNavigate }: { data: FinanceData; transactions: Transaction[]; totals: { income: number; expenses: number; savings: number; budget: number; balance: number }; month: string; onNavigate: (view: View) => void }) {
  const savingsRate = totals.income ? Math.round((totals.savings / totals.income) * 100) : 0;
  const budgetUsed = totals.budget ? Math.round((totals.expenses / totals.budget) * 100) : 0;
  const health = Math.max(0, Math.min(100, Math.round(70 + savingsRate * 0.7 - Math.max(0, budgetUsed - 70) * 0.5)));
  const historyMonths = [...new Set([...data.transactions.map((item) => item.occurredOn.slice(0, 7)), month])].filter((item) => item <= month).sort().slice(-3);
  const monthlyChart = historyMonths.map((key) => {
    const rows = data.transactions.filter((item) => item.occurredOn.startsWith(key));
    const sum = (type: TransactionType) => toRupees(rows.filter((item) => item.type === type).reduce((total, item) => total + item.amountPaise, 0));
    return { month: monthLabel(key).slice(0, 3), income: sum('income'), expenses: sum('expense'), savings: sum('savings') };
  });
  const spending = data.budgets.map((budget) => ({ ...budget, spent: transactions.filter((item) => item.type === 'expense' && item.category === budget.category).reduce((sum, item) => sum + item.amountPaise, 0) })).sort((a, b) => b.spent - a.spent);
  const expenseByCategory = transactions.filter((item) => item.type === 'expense').reduce<Record<string, number>>((map, item) => ({ ...map, [item.category]: (map[item.category] ?? 0) + item.amountPaise }), {});
  const unplannedSpend = Object.entries(expenseByCategory).filter(([category]) => !data.budgets.some((budget) => budget.category === category)).reduce((sum, [, amount]) => sum + amount, 0);
  const categoryData = spending.filter((item) => item.spent > 0).slice(0, 5).map((item) => ({ name: item.category, value: toRupees(item.spent) }));
  const pieColors = ['#173e36', '#e7bb79', '#5d67b2', '#77a697', '#d56d4f'];
  const latestDay = month === currentMonth ? Number(today.slice(-2)) : month < currentMonth ? new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate() : 1;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const dailyPace = toRupees(totals.expenses) / latestDay;
  const safeDailySpend = Math.max(0, toRupees(totals.budget - totals.expenses) / Math.max(1, daysInMonth - latestDay + 1));
  const runwayDays = dailyPace > 0 ? Math.max(0, Math.floor(toRupees(totals.balance) / dailyPace)) : null;
  const runwayDate = runwayDays === null ? null : new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, latestDay + runwayDays);
  const alerts = [
    ...spending.filter((item) => item.monthlyLimitPaise > 0 && item.spent > item.monthlyLimitPaise).map((item) => ({ tone: 'danger', title: `${item.category} is over its limit`, copy: `${formatMoney(item.spent - item.monthlyLimitPaise)} over your monthly envelope.`, action: 'Budgets' })),
    ...spending.filter((item) => item.monthlyLimitPaise > 0 && item.spent <= item.monthlyLimitPaise && item.spent / item.monthlyLimitPaise >= 0.8).map((item) => ({ tone: 'warning', title: `${item.category} is close to its limit`, copy: `${formatMoney(item.monthlyLimitPaise - item.spent)} remains in this envelope.`, action: 'Budgets' })),
    ...(unplannedSpend > 0 ? [{ tone: 'warning', title: 'Some spending is unplanned', copy: `${formatMoney(unplannedSpend)} has no matching budget envelope yet.`, action: 'Budgets' }] : []),
    ...(totals.savings === 0 && totals.income > 0 ? [{ tone: 'info', title: 'No savings transfer logged', copy: 'Protect your plan by moving even a small amount into a goal.', action: 'Goals' }] : []),
  ].slice(0, 4);
  const emergencyGoal = data.goals.find((goal) => goal.kind === 'Safety');

  return (
    <>
      {!data.transactions.length && <div className="mb-5 rounded-2xl border border-[#29473e] bg-[#122b24] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#ecf4ed]">Your workspace is ready for real data.</p><p className="mt-1 text-sm leading-5 text-[#a2bcb0]">No sample transactions are shown. Add your first allowance, expense, or savings transfer to activate personalized insights.</p></div><Button className="bg-[#183f32]" onClick={() => onNavigate('transactions')}><Plus />Add first transaction</Button></div></div>}
      <section className="spatial-plan" aria-label="Monthly money plan">
        <div><p className="spatial-kicker">{monthLabel(month)} / MONEY PLAN</p><h2>{formatMoney(Math.max(0, totals.balance))}<span> available to direct</span></h2><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => onNavigate('transactions')}><Plus />Log a transaction</Button><Button variant="outline" onClick={() => onNavigate('budgets')}>Review budgets <ChevronRight /></Button></div></div>
        <div className="spatial-plan-stats"><div><span>Budget left / day</span><strong>{currency.format(safeDailySpend)}</strong></div><div><span>Savings rate</span><strong>{savingsRate}%</strong></div><div><span>Runway</span><strong>{runwayDate ? `${runwayDays} days` : 'Learning'}</strong></div></div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Balance available', value: formatMoney(totals.balance), meta: totals.income ? `${Math.max(0, Math.round((totals.balance / totals.income) * 100))}% of income is still available` : 'Add income to begin', icon: WalletCards, tone: 'bg-[#10271f]' },
          { label: 'Budget used', value: `${budgetUsed}%`, meta: `${formatMoney(Math.max(0, totals.budget - totals.expenses))} remains in envelopes`, icon: TrendingDown, tone: 'bg-[#10271f]' },
          { label: 'Saved this month', value: formatMoney(totals.savings), meta: `${savingsRate}% of monthly income`, icon: Target, tone: 'bg-[#10271f]' },
          { label: 'Money health', value: `${health} / 100`, meta: health >= 75 ? 'Looking strong — keep the pace.' : 'One change can improve this.', icon: Sparkles, tone: 'bg-[#30291c]' },
        ].map((item) => <MetricCard key={item.label} {...item} />)}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Attention centre" subtitle="The clearest next actions from your current numbers" action={<Button variant="ghost" className="text-[#ecf4ed]" onClick={() => onNavigate('toolkit')}>Open toolkit <ChevronRight /></Button>}>
          {alerts.length ? <div className="mt-5 space-y-3">{alerts.map((alert) => <button key={alert.title} type="button" onClick={() => onNavigate(alert.action === 'Goals' ? 'goals' : 'budgets')} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition hover:brightness-[0.98] ${alert.tone === 'danger' ? 'border-[#29473e] bg-[#30291c]' : alert.tone === 'warning' ? 'border-[#29473e] bg-[#30291c]' : 'border-[#29473e] bg-[#122b24]'}`}><div className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${alert.tone === 'danger' ? 'bg-[#30291c] text-[#f2a69a]' : alert.tone === 'warning' ? 'bg-[#30291c] text-[#eac491]' : 'bg-[#122b24] text-[#ecf4ed]'}`}><Bell className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{alert.title}</p><p className="mt-1 text-xs leading-5 text-[#a2bcb0]">{alert.copy}</p></div><ChevronRight className="mt-2 size-4 text-[#a2bcb0]" /></button>)}</div> : <div className="mt-5 rounded-xl bg-[#122b24] p-5"><CircleCheck className="size-5 text-[#ecf4ed]" /><p className="mt-3 font-semibold">No urgent budget alerts.</p><p className="mt-1 text-sm text-[#a2bcb0]">Keep logging transactions so Campus Cash can continue watching your plan.</p></div>}
        </Panel>
        <Panel title="Plan coverage" subtitle="How much of your spending already has a job"><div className="mt-5 space-y-5"><div><div className="flex items-end justify-between"><div><p className="text-sm font-semibold">Envelope coverage</p><p className="mt-1 text-xs text-[#a2bcb0]">Expenses assigned to a monthly category limit</p></div><strong>{totals.expenses ? Math.max(0, Math.round(((totals.expenses - unplannedSpend) / totals.expenses) * 100)) : 100}%</strong></div><Progress value={totals.expenses ? Math.max(0, ((totals.expenses - unplannedSpend) / totals.expenses) * 100) : 100} className="mt-3"><ProgressTrack className="h-2"><ProgressIndicator className="bg-[#183f32]" /></ProgressTrack></Progress></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#122b24] p-4"><p className="text-xs text-[#a2bcb0]">Planned expenses</p><p className="mt-1 text-xl font-semibold">{formatMoney(totals.expenses - unplannedSpend)}</p></div><div className="rounded-xl bg-[#30291c] p-4"><p className="text-xs text-[#eac491]">Unplanned expenses</p><p className="mt-1 text-xl font-semibold">{formatMoney(unplannedSpend)}</p></div></div><Button variant="outline" className="w-full" onClick={() => onNavigate('budgets')}>Assign every rupee a job <ChevronRight /></Button></div></Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <Panel title="Cash flow" subtitle="Income, spending, and savings over three months" action={<span className="rounded-full bg-[#122b24] px-2.5 py-1 text-xs font-semibold text-[#ecf4ed]">{formatMoney(totals.balance)} left</span>}>
          <ChartContainer config={chartConfig} className="mt-5 h-[280px] w-full">
            <BarChart data={monthlyChart} margin={{ left: -15, right: 8 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" fill="var(--color-expenses)" radius={[6, 6, 0, 0]} /><Bar dataKey="savings" fill="var(--color-savings)" radius={[6, 6, 0, 0]} /></BarChart>
          </ChartContainer>
        </Panel>

        <Panel title="Spending mix" subtitle={`Where your money went in ${monthLabel(month)}`} action={<Button variant="ghost" size="icon-sm" aria-label="View budgets" onClick={() => onNavigate('budgets')}><ChevronRight /></Button>}>
          {categoryData.length ? <ChartContainer config={chartConfig} className="mx-auto mt-3 h-[190px] max-w-xs"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>{categoryData.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent nameKey="name" />} /></PieChart></ChartContainer> : <EmptyState text="Add expenses to see your spending mix." />}
          <div className="grid grid-cols-2 gap-2">{categoryData.slice(0, 4).map((item, index) => <div key={item.name} className="flex items-center gap-2 text-xs text-[#a2bcb0]"><span className="size-2 rounded-full" style={{ backgroundColor: pieColors[index] }} />{item.name}</div>)}</div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <Panel title="Budget watch" subtitle="Your monthly limits vs actual spending" action={<Button variant="ghost" className="text-[#ecf4ed]" onClick={() => onNavigate('budgets')}>Manage <ChevronRight /></Button>}>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">{spending.slice(0, 6).map((item) => <BudgetMeter key={item.category} name={item.category} spent={item.spent} total={item.monthlyLimitPaise} />)}</div>
        </Panel>
        <Panel title="Goal momentum" subtitle="Keep the goals that matter moving" action={<PiggyBank className="size-5 text-[#74d4ae]" />}>
          {emergencyGoal ? <div className="mt-6"><div className="flex items-end justify-between"><div><p className="text-sm text-[#a2bcb0]">{emergencyGoal.name}</p><p className="mt-1 text-3xl font-semibold tracking-tight">{formatMoney(emergencyGoal.currentPaise)}</p></div><span className="text-sm font-semibold text-[#ecf4ed]">{Math.round((emergencyGoal.currentPaise / emergencyGoal.targetPaise) * 100)}%</span></div><Progress value={Math.round((emergencyGoal.currentPaise / emergencyGoal.targetPaise) * 100)} className="mt-4"><ProgressTrack className="h-2"><ProgressIndicator className="bg-[#183f32]" /></ProgressTrack></Progress><p className="mt-3 text-sm text-[#a2bcb0]">{formatMoney(Math.max(0, emergencyGoal.targetPaise - emergencyGoal.currentPaise))} remaining to reach {formatMoney(emergencyGoal.targetPaise)}.</p><div className="mt-4 space-y-2">{data.goals.filter((goal) => goal.id !== emergencyGoal.id).slice(0, 2).map((goal) => <div key={goal.id} className="flex items-center justify-between rounded-lg bg-[#122b24] px-3 py-2 text-xs"><span className="font-medium">{goal.name}</span><span>{Math.round((goal.currentPaise / goal.targetPaise) * 100)}%</span></div>)}</div><Button variant="outline" className="mt-5 w-full" onClick={() => onNavigate('goals')}>Manage savings goals</Button></div> : <EmptyState text="Create a savings goal to see progress here." />}
      </Panel>
      </div>

      <Panel className="mt-5" title="Recent activity" subtitle="Your latest money movements" action={<Button variant="ghost" className="text-[#ecf4ed]" onClick={() => onNavigate('transactions')}>View all <ChevronRight /></Button>}>
        <TransactionTable rows={transactions.slice().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)).slice(0, 6)} compact />
      </Panel>
    </>
  );
}

function TransactionsView({ transactions, month, search, setSearch, typeFilter, setTypeFilter, onDelete, onEdit }: { transactions: Transaction[]; month: string; search: string; setSearch: (value: string) => void; typeFilter: 'all' | TransactionType; setTypeFilter: (value: 'all' | TransactionType) => void; onDelete: (id: string) => void; onEdit: (id: string) => void }) {
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
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a2bcb0]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description, category, or account" className="h-10 pl-9" /></div>
        <NativeSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | TransactionType)} className="w-full sm:w-44"><NativeSelectOption value="all">All types</NativeSelectOption><NativeSelectOption value="expense">Expenses</NativeSelectOption><NativeSelectOption value="income">Income</NativeSelectOption><NativeSelectOption value="savings">Savings</NativeSelectOption></NativeSelect>
      </div>
      <TransactionTable rows={rows} onDelete={onDelete} onEdit={onEdit} />
    </Panel>
  );
}

function BudgetsView({ budgets, transactions, onSave, onDelete, saving }: { budgets: Budget[]; transactions: Transaction[]; onSave: (category: string, amount: number) => void; onDelete: (category: string) => void; saving: boolean }) {
  const totalBudget = budgets.reduce((sum, item) => sum + item.monthlyLimitPaise, 0);
  const totalSpent = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountPaise, 0);
  const actual = (category: string) => transactions.filter((item) => item.type === 'expense' && item.category === category).reduce((sum, item) => sum + item.amountPaise, 0);
  const submitBudget = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave(String(form.get('category')), Number(form.get('amount'))); };
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3"><MiniStat label="Total monthly plan" value={formatMoney(totalBudget)} icon={Target} /><MiniStat label="Used so far" value={formatMoney(totalSpent)} icon={TrendingDown} /><MiniStat label="Still available" value={formatMoney(Math.max(0, totalBudget - totalSpent))} icon={WalletCards} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_0.65fr]">
        <Panel title="Category budgets" subtitle="Green under 70%, amber near the limit, red when over"><div className="mt-5 grid gap-5 sm:grid-cols-2">{budgets.map((budget) => <div key={budget.category} className="relative"><BudgetMeter name={budget.category} spent={actual(budget.category)} total={budget.monthlyLimitPaise} detailed /><Button variant="ghost" size="icon-sm" aria-label={`Delete ${budget.category} budget`} className="absolute right-1 top-1 text-[#f2a69a]" onClick={() => onDelete(budget.category)}><Trash2 /></Button></div>)}</div></Panel>
        <Panel title="Edit a limit" subtitle="Set or replace any monthly category budget"><form className="mt-5 grid gap-4" onSubmit={submitBudget}><label className="grid gap-1.5 text-sm font-medium">Category<Input name="category" list="category-options" defaultValue="Food" required placeholder="Food or a custom category" className="h-10" /></label><label className="grid gap-1.5 text-sm font-medium">Monthly limit<Input name="amount" required min="0" type="number" placeholder="₹ 5,000" className="h-10" /></label><Button disabled={saving} type="submit" className="mt-1 h-10 bg-[#183f32]">{saving && <Loader2 className="animate-spin" />}Update budget</Button></form><div className="mt-6 rounded-xl bg-[#122b24] p-4 text-sm leading-6 text-[#a2bcb0]"><strong className="text-[#ecf4ed]">Tip:</strong> Custom categories are saved exactly like the built-in ones, so make a clear envelope for every recurring cost.</div></Panel>
      </div>
    </>
  );
}

function GoalsView({ goals, onContribute, onCreate, onEdit, onDelete, saving }: { goals: SavingsGoal[]; onContribute: (id: string, amount: number) => void; onCreate: (name: string, target: number, deadline: string, kind: string) => void; onEdit: (id: string, name: string, target: number, deadline: string, kind: string) => void; onDelete: (id: string) => void; saving: boolean }) {
  const iconMap = { Safety: ShieldCheck, Technology: Laptop, Learning: GraduationCap };
  const [createOpen, setCreateOpen] = useState(false);
  const createGoal = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = new FormData(event.currentTarget); onCreate(String(values.get('name') ?? ''), Number(values.get('target') ?? 0), String(values.get('deadline') ?? today), String(values.get('kind') ?? 'Wishlist')); setCreateOpen(false); };
  return <><div className="mb-5 flex justify-end"><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger render={<Button className="bg-[#183f32]"><Plus />Add savings goal</Button>} /><DialogContent className="max-w-sm rounded-3xl"><DialogHeader><DialogTitle>Create savings goal</DialogTitle><DialogDescription>Set a target and deadline for anything you want to fund.</DialogDescription></DialogHeader><form onSubmit={createGoal} className="grid gap-4"><label className="grid gap-1.5 text-sm font-medium">Goal name<Input name="name" required placeholder="Emergency fund" className="h-10" /></label><label className="grid gap-1.5 text-sm font-medium">Target amount (₹)<Input name="target" required min="1" type="number" placeholder="10000" className="h-10" /></label><label className="grid gap-1.5 text-sm font-medium">Deadline<Input name="deadline" required type="date" defaultValue={today} className="h-10" /></label><label className="grid gap-1.5 text-sm font-medium">Type<NativeSelect name="kind" defaultValue="Wishlist"><NativeSelectOption value="Wishlist">Wishlist</NativeSelectOption><NativeSelectOption value="Safety">Safety</NativeSelectOption><NativeSelectOption value="Technology">Technology</NativeSelectOption><NativeSelectOption value="Learning">Learning</NativeSelectOption></NativeSelect></label><DialogFooter><Button type="submit" disabled={saving} className="bg-[#183f32]">{saving && <Loader2 className="animate-spin" />}Create goal</Button></DialogFooter></form></DialogContent></Dialog></div><div className="grid gap-5 lg:grid-cols-3">{goals.map((goal) => {
    const percent = Math.min(100, Math.round((goal.currentPaise / goal.targetPaise) * 100));
    const Icon = iconMap[goal.kind as keyof typeof iconMap] ?? Target;
    return <Panel key={goal.id} title={goal.name} subtitle={`${goal.kind} • target by ${new Date(`${goal.deadline}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`} action={<div className="flex items-center gap-1"><div className="grid size-10 place-items-center rounded-xl bg-[#122b24] text-[#ecf4ed]"><Icon className="size-5" /></div><Button variant="ghost" size="icon-sm" aria-label={`Edit ${goal.name}`} className="text-[#ecf4ed]" onClick={() => { const name = window.prompt('Goal name', goal.name); if (!name) return; const target = window.prompt('Target amount in rupees', String(toRupees(goal.targetPaise))); if (target === null) return; const deadline = window.prompt('Deadline (YYYY-MM-DD)', goal.deadline); if (deadline === null) return; const kind = window.prompt('Goal type', goal.kind); if (kind === null) return; onEdit(goal.id, name, Number(target), deadline, kind); }}><Pencil /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${goal.name}`} className="text-[#f2a69a]" onClick={() => onDelete(goal.id)}><Trash2 /></Button></div>}><div className="mt-7"><div className="flex items-end justify-between"><p className="text-3xl font-semibold tracking-tight">{formatMoney(goal.currentPaise)}</p><span className="text-sm font-semibold text-[#ecf4ed]">{percent}%</span></div><p className="mt-1 text-sm text-[#a2bcb0]">of {formatMoney(goal.targetPaise)}</p><Progress value={percent} className="mt-5"><ProgressTrack className="h-2"><ProgressIndicator className="bg-[#183f32]" /></ProgressTrack></Progress><div className="mt-5 flex items-center justify-between rounded-xl bg-[#122b24] p-3 text-sm"><span className="text-[#a2bcb0]">Left to save</span><strong>{formatMoney(Math.max(0, goal.targetPaise - goal.currentPaise))}</strong></div><Dialog><DialogTrigger render={<Button className="mt-4 h-10 w-full bg-[#183f32]" />}><Plus />Add contribution</DialogTrigger><DialogContent className="max-w-sm rounded-3xl"><DialogHeader><DialogTitle>Add to {goal.name}</DialogTitle><DialogDescription>Record a transfer toward this goal.</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); const amount = Number(new FormData(event.currentTarget).get('amount')); onContribute(goal.id, amount); }} className="grid gap-4"><label className="grid gap-1.5 text-sm font-medium">Contribution amount<Input name="amount" type="number" required min="1" placeholder="₹ 1,000" className="h-10" /></label><DialogFooter><Button disabled={saving} className="bg-[#183f32]" type="submit">{saving && <Loader2 className="animate-spin" />}Save contribution</Button></DialogFooter></form></DialogContent></Dialog></div></Panel>;
  })}</div></>;
}

function AccountsView({ accounts, transactions, onCreate, onEdit, onDelete }: { accounts: Account[]; transactions: Transaction[]; onCreate: (name: string, type: string, balance: number) => void; onEdit: (id: string, name: string, type: string, balance: number) => void; onDelete: (id: string) => void }) {
  const net = accounts.reduce((sum, item) => sum + item.balancePaise, 0);
  const methods = [...new Set(transactions.map((item) => item.paymentMethod))].map((method) => ({ method, value: transactions.filter((item) => item.type === 'expense' && item.paymentMethod === method).reduce((sum, item) => sum + item.amountPaise, 0) })).sort((a, b) => b.value - a.value);
  const createAccount = () => { const name = window.prompt('Account name'); if (!name) return; const type = window.prompt('Account type (Bank, UPI, Cash, Savings)', 'Bank'); if (!type) return; const balance = window.prompt('Current balance in rupees', '0'); if (balance === null) return; onCreate(name, type, Number(balance)); };
  return <><div className="flex justify-end"><Button className="bg-[#183f32]" onClick={createAccount}><Plus />Add account</Button></div><div className="mt-3 rounded-3xl bg-[#183f32] p-6 text-white sm:p-8"><p className="text-sm text-white/60">Total across tracked accounts</p><p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{formatMoney(net)}</p><p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Reconcile these balances with your banking and UPI apps once a week to catch missing entries early.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{accounts.map((account, index) => <article key={account.id} className="rounded-2xl border border-[#29473e] bg-[#10271f] p-5 shadow-[0_10px_30px_rgba(24,62,54,0.04)]"><div className="flex items-center justify-between"><div className={`grid size-10 place-items-center rounded-xl ${index === 3 ? 'bg-[#30291c] text-[#eac491]' : 'bg-[#122b24] text-[#ecf4ed]'}`}>{account.type === 'Bank' ? <Landmark className="size-5" /> : account.type === 'Savings' ? <PiggyBank className="size-5" /> : <WalletCards className="size-5" />}</div><div className="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${account.name}`} onClick={() => { const name = window.prompt('Account name', account.name); if (!name) return; const type = window.prompt('Account type', account.type); if (!type) return; const balance = window.prompt('Balance in rupees', String(toRupees(account.balancePaise))); if (balance !== null) onEdit(account.id, name, type, Number(balance)); }}><Pencil className="text-[#ecf4ed]" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${account.name}`} onClick={() => onDelete(account.id)}><Trash2 className="text-[#f2a69a]" /></Button></div></div><span className="text-xs text-[#a2bcb0]">{account.type}</span><p className="mt-5 text-sm font-medium text-[#a2bcb0]">{account.name}</p><p className="mt-1 text-2xl font-semibold">{formatMoney(account.balancePaise)}</p></article>)}</div><Panel className="mt-5" title="Payment method activity" subtitle="How this month’s expenses were paid"><div className="mt-5 space-y-4">{methods.map((item) => <div key={item.method} className="flex items-center justify-between border-b border-[#29473e] pb-4 last:border-0"><div><p className="font-medium">{item.method}</p><p className="mt-0.5 text-xs text-[#a2bcb0]">{transactions.filter((row) => row.paymentMethod === item.method && row.type === 'expense').length} transactions</p></div><strong>{formatMoney(item.value)}</strong></div>)}</div></Panel></>;
}

function CollegeView({ transactions, feeSettings, onMarkPaid, onMarkDue }: { transactions: Transaction[]; feeSettings: FeeSettings; onMarkPaid: (label: string, amount: number, date: string, category: string) => void; onMarkDue: (id: string) => void }) {
  const feeItems = [
    { label: 'Semester 1 tuition', term: 'Spring semester', due: `${today.slice(0, 4)}-01-15`, amount: feeSettings.semesterOnePaise / 100, category: 'College fees', icon: GraduationCap },
    { label: 'Semester 2 tuition', term: 'Autumn semester', due: `${today.slice(0, 4)}-07-15`, amount: feeSettings.semesterTwoPaise / 100, category: 'College fees', icon: GraduationCap },
    { label: 'Semester exam & lab forms', term: 'Current semester', due: `${today.slice(0, 4)}-11-05`, amount: feeSettings.examLabPaise / 100, category: 'College fees', icon: BookOpen },
    { label: 'Hostel fee', term: `${today.slice(0, 4)}–${String(Number(today.slice(0, 4)) + 1)} academic year`, due: `${today.slice(0, 4)}-06-01`, amount: feeSettings.hostelYearlyPaise / 100, category: 'Hostel', icon: Landmark },
  ];
  const payments = feeItems.map((item) => ({ ...item, payment: transactions.find((row) => row.description === item.label && row.category === item.category && row.type === 'expense' && row.note === 'College fee planner') }));
  const planning = [
    { title: 'Food & mess', amount: '₹5,000 / month', icon: Utensils, copy: 'Mess, canteen, groceries, and delivery.' },
    { title: 'Travel', amount: '₹3,000 / month', icon: Bus, copy: 'Metro, bus pass, rides, and hometown trips.' },
    { title: 'Technology', amount: '₹65,000 goal', icon: Laptop, copy: 'Laptop, accessories, repairs, and warranties.' },
    { title: 'AI / ML learning', amount: '₹2,500 / month', icon: GraduationCap, copy: 'Courses, APIs, books, and project hosting.' },
  ];
  const paidTotal = payments.filter((item) => item.payment).reduce((sum, item) => sum + item.amount, 0);
  const dueTotal = payments.filter((item) => !item.payment).reduce((sum, item) => sum + item.amount, 0);
  return <><div className="mb-5 grid gap-4 sm:grid-cols-3"><MiniStat label="Planned this academic year" value={currency.format(paidTotal + dueTotal)} icon={CalendarClock} /><MiniStat label="Paid" value={currency.format(paidTotal)} icon={CircleCheck} /><MiniStat label="Still due" value={currency.format(dueTotal)} icon={Landmark} /></div><div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"><Panel title="Semester & yearly fee schedule" subtitle="Track tuition and exam dues by term, plus one annual hostel charge"><div className="mt-5 space-y-3">{payments.map((item) => <div key={item.label} className="flex flex-col gap-4 rounded-xl border border-[#29473e] p-4 sm:flex-row sm:items-center"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#122b24] text-[#ecf4ed]"><item.icon className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.label}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.payment ? 'bg-[#122b24] text-[#ecf4ed]' : 'bg-[#30291c] text-[#eac491]'}`}>{item.payment ? 'Paid' : 'Due'}</span></div><p className="mt-1 text-xs text-[#a2bcb0]">{item.term} • Due {new Date(`${item.due}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><strong>{currency.format(item.amount)}</strong>{item.payment ? <Button variant="outline" size="sm" onClick={() => onMarkDue(item.payment!.id)}>Mark due</Button> : <Button size="sm" className="bg-[#183f32]" onClick={() => onMarkPaid(item.label, item.amount, item.due, item.category)}>Mark paid</Button>}</div>)}</div></Panel><Panel title="Semester readiness" subtitle="What to keep ready before the next deadline"><div className="mt-5 text-center"><div className="mx-auto grid size-28 place-items-center rounded-full border-[10px] border-[#29473e]"><span className="text-2xl font-semibold">{paidTotal + dueTotal ? Math.round((paidTotal / (paidTotal + dueTotal)) * 100) : 0}%</span></div><p className="mt-5 text-sm text-[#a2bcb0]">{currency.format(paidTotal)} of {currency.format(paidTotal + dueTotal)} planned academic costs are marked paid.</p><div className="mt-5 rounded-xl bg-[#30291c] p-4 text-left text-sm leading-6 text-[#ecf4ed]"><strong>Suggested:</strong> divide the remaining {currency.format(dueTotal)} by the number of weeks until your next due date.</div></div></Panel></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{planning.map((item) => <article key={item.title} className="rounded-2xl border border-[#29473e] bg-[#10271f] p-5"><div className="grid size-10 place-items-center rounded-xl bg-[#122b24] text-[#ecf4ed]"><item.icon className="size-5" /></div><h3 className="mt-5 font-semibold">{item.title}</h3><p className="mt-1 text-lg font-semibold text-[#ecf4ed]">{item.amount}</p><p className="mt-2 text-sm leading-5 text-[#a2bcb0]">{item.copy}</p></article>)}</div><Panel className="mt-5" title="Purchase pause" subtitle="A simple check before any non-essential purchase"><div className="mt-5 grid gap-3 sm:grid-cols-3">{['Do I need it this semester?', 'Can I buy it without touching savings?', 'Will I still want it after 72 hours?'].map((question, index) => <div key={question} className="rounded-xl bg-[#122b24] p-4"><span className="text-xs font-semibold text-[#ecf4ed]">CHECK {index + 1}</span><p className="mt-2 text-sm font-medium leading-5">{question}</p></div>)}</div></Panel></>;
}

function ReportsView({ transactions, totals, month }: { transactions: Transaction[]; totals: { income: number; expenses: number; savings: number; budget: number; balance: number }; month: string }) {
  const months = [...new Set(transactions.map((item) => item.occurredOn.slice(0, 7)).filter((item) => item <= month).concat(month))].sort().slice(-3);
  const rows = months.map((month) => {
    const current = transactions.filter((item) => item.occurredOn.startsWith(month));
    const sum = (type: TransactionType) => current.filter((item) => item.type === type).reduce((total, item) => total + item.amountPaise, 0);
    return { month: monthLabel(month).slice(0, 3), income: toRupees(sum('income')), expenses: toRupees(sum('expense')), savings: toRupees(sum('savings')), balance: toRupees(sum('income') - sum('expense') - sum('savings')) };
  });
  const topCategory = transactions.filter((item) => item.type === 'expense' && item.occurredOn.startsWith(month)).reduce<Record<string, number>>((map, item) => ({ ...map, [item.category]: (map[item.category] ?? 0) + item.amountPaise }), {});
  const top = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0];
  const previousBalance = rows.length > 1 ? rows.at(-2)?.balance ?? 0 : 0;
  const balanceChange = toRupees(totals.balance) - previousBalance;
  return <><div className="grid gap-4 sm:grid-cols-3"><MiniStat label={`${monthLabel(month)} surplus`} value={formatMoney(totals.balance)} icon={TrendingUp} /><MiniStat label="Savings rate" value={`${totals.income ? Math.round((totals.savings / totals.income) * 100) : 0}%`} icon={PiggyBank} /><MiniStat label="Largest spend area" value={top?.[0] ?? 'None yet'} icon={BarChart3} /></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><Panel title="Three-month direction" subtitle="Closing balance after spending and savings"><ChartContainer config={chartConfig} className="mt-5 h-[310px] w-full"><LineChart data={rows} margin={{ left: -15, right: 18 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="balance" name="Balance" stroke="#173e36" strokeWidth={3} dot={{ fill: '#e7bb79', strokeWidth: 0, r: 5 }} /></LineChart></ChartContainer></Panel><Panel title="This month’s insight" subtitle="A practical read on your numbers"><div className="mt-5 space-y-4">{[{ icon: CircleCheck, title: balanceChange >= 0 ? 'Balance is improving' : 'Balance is lower than last month', copy: `${balanceChange >= 0 ? '+' : ''}${currency.format(balanceChange)} compared with the prior available month.` }, { icon: PiggyBank, title: 'Savings habit started', copy: `${formatMoney(totals.savings)} is already separated from spending money.` }, { icon: CalendarClock, title: 'College payment ahead', copy: 'Use the fee planner to reserve money for upcoming college costs.' }].map((item) => <div key={item.title} className="flex gap-3 rounded-xl bg-[#122b24] p-4"><item.icon className="mt-0.5 size-4 shrink-0 text-[#ecf4ed]" /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#a2bcb0]">{item.copy}</p></div></div>)}</div></Panel></div><Panel className="mt-5" title="Monthly close checklist" subtitle="Five minutes at month-end keeps every report trustworthy"><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{['Reconcile bank and UPI balances', 'Check refunds and shared expenses', 'Move savings before spending', 'Set next month’s category limits'].map((item, index) => <div key={item} className="flex gap-3 rounded-xl border border-[#29473e] p-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#122b24] text-xs font-bold text-[#ecf4ed]">{index + 1}</span><p className="text-sm font-medium leading-5">{item}</p></div>)}</div></Panel></>;
}

type ToolkitTotals = { income: number; expenses: number; savings: number; budget: number; balance: number };

type ImportRow = { description: string; amount: number; occurredOn: string; type: TransactionType; category: string; account?: string; paymentMethod?: string };
type ReceiptDraft = { description: string; amount: number; occurredOn: string; category: string };

function ToolkitView({ data, transactions, totals, onNavigate, onImportRows, onAddReceipt }: { data: FinanceData; transactions: Transaction[]; totals: ToolkitTotals; onNavigate: (view: View) => void; onImportRows: (rows: ImportRow[]) => Promise<boolean | undefined>; onAddReceipt: (receipt: ReceiptDraft) => void }) {
  const [assistantPrompt, setAssistantPrompt] = useState('pace');
  const [splitTotal, setSplitTotal] = useState(1200);
  const [splitPeople, setSplitPeople] = useState(4);
  const [monthlyRides, setMonthlyRides] = useState(40);
  const [rideCost, setRideCost] = useState(35);
  const [passCost, setPassCost] = useState(1100);
  const [foreignAmount, setForeignAmount] = useState(20);
  const [inrPerUnit, setInrPerUnit] = useState(83.5);
  const [loanPrincipal, setLoanPrincipal] = useState(250000);
  const [loanRate, setLoanRate] = useState(9.5);
  const [loanMonths, setLoanMonths] = useState(36);
  const [receiptName, setReceiptName] = useState('');

  const expenseRows = transactions.filter((item) => item.type === 'expense');
  const latestDay = Number(today.slice(-2));
  const dailyPace = toRupees(totals.expenses) / latestDay;
  const runwayDays = dailyPace > 0 ? Math.max(0, Math.floor(toRupees(totals.balance) / dailyPace)) : null;
  const runwayDate = runwayDays === null ? null : new Date(2026, 8, latestDay + runwayDays);
  const roundUps = expenseRows.reduce((sum, item) => {
    const rupees = toRupees(item.amountPaise);
    return sum + ((10 - (rupees % 10)) % 10);
  }, 0);
  const unallocated = toRupees(totals.income - totals.budget - totals.savings);
  const activeSavingsMonths = new Set(data.transactions.filter((item) => item.type === 'savings').map((item) => item.occurredOn.slice(0, 7))).size;
  const subscriptionRows = transactions.filter((item) => item.type === 'expense' && item.category === 'Subscriptions');
  const subscriptionTotal = subscriptionRows.reduce((sum, item) => sum + item.amountPaise, 0);
  const projectRows = transactions.filter((item) => item.type === 'expense' && ['AI / ML Learning', 'Technology'].includes(item.category));
  const projectSpent = projectRows.reduce((sum, item) => sum + item.amountPaise, 0);
  const categoryTotals = expenseRows.reduce<Record<string, number>>((map, item) => ({ ...map, [item.category]: (map[item.category] ?? 0) + item.amountPaise }), {});
  const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const assistantAnswer = assistantPrompt === 'pace'
    ? `At your current pace of ${currency.format(dailyPace)} per day, ${runwayDate ? `your available balance lasts to about ${runwayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'there is not enough spending history to forecast yet'}.`
    : assistantPrompt === 'category'
      ? highestCategory ? `${highestCategory[0]} is your largest category this month at ${formatMoney(highestCategory[1])}.` : 'Add an expense and I will identify your largest category.'
      : `You have saved ${formatMoney(totals.savings)}, or ${totals.income ? Math.round((totals.savings / totals.income) * 100) : 0}% of this month’s income.`;
  const monthlyTransit = monthlyRides * rideCost;
  const monthlyLoanRate = loanRate / 1200;
  const emi = monthlyLoanRate > 0
    ? loanPrincipal * monthlyLoanRate * Math.pow(1 + monthlyLoanRate, loanMonths) / (Math.pow(1 + monthlyLoanRate, loanMonths) - 1)
    : loanPrincipal / Math.max(1, loanMonths);
  const monthlyBudgetLeft = Math.max(0, totals.budget - totals.expenses);

  const go = (view: View) => onNavigate(view);
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-[#183f32] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><span className="rounded-full bg-[#10271f]/10 px-3 py-1 text-xs font-semibold text-[#eac491]">20 tools • one private workspace</span><h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Built for college life, from canteen splits to education loans.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Manage upcoming bills and shared costs above. Explore imports, receipt scanning, and planning tools below.</p></div>
          <div className="grid min-w-64 grid-cols-2 gap-3"><div className="rounded-2xl bg-[#10271f]/8 p-4"><p className="text-xs text-white/55">Safe to spend</p><p className="mt-1 text-xl font-semibold">{formatMoney(monthlyBudgetLeft)}</p></div><div className="rounded-2xl bg-[#10271f]/8 p-4"><p className="text-xs text-white/55">Savings streak</p><p className="mt-1 text-xl font-semibold">{activeSavingsMonths} months</p></div></div>
        </div>
      </div>

      <ToolkitSection title="Automate & predict" subtitle="Understand what is happening and what may happen next.">
        <BankImportCard onImport={onImportRows} />
        <ReceiptScannerCard receiptName={receiptName} setReceiptName={setReceiptName} onAdd={onAddReceipt} />
        <FeatureCard number={3} title="Local AI Assistant" description="Ask private questions about your spending." icon={BrainCircuit} status="Works locally" tone="live"><NativeSelect value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} className="w-full"><NativeSelectOption value="pace">How long will my balance last?</NativeSelectOption><NativeSelectOption value="category">Where am I spending most?</NativeSelectOption><NativeSelectOption value="saving">How is my savings habit?</NativeSelectOption></NativeSelect><div className="mt-3 rounded-xl bg-[#122b24] p-3 text-sm leading-5 text-[#ecf4ed]">{assistantAnswer}</div><p className="mt-2 text-[11px] text-[#a2bcb0]">Rule-based analysis runs in this browser; no external AI receives your data.</p></FeatureCard>
        <FeatureCard number={4} title="Predictive Alerts" description="Forecast when this month’s balance may run out." icon={Zap} status="Live forecast" tone="live"><p className="text-3xl font-semibold tracking-tight">{runwayDate ? runwayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Learning'}</p><p className="mt-2 text-xs leading-5 text-[#a2bcb0]">Based on {currency.format(dailyPace)} average daily spending through day {latestDay}. Forecasts are estimates, not guarantees.</p></FeatureCard>
        <FeatureCard number={5} title="Subscription Manager" description="Spot recurring digital costs before renewal." icon={RefreshCw} status="Transaction scan" tone="live"><p className="text-2xl font-semibold">{formatMoney(subscriptionTotal)}<span className="text-sm font-normal text-[#a2bcb0]"> this month</span></p><p className="mt-2 text-xs leading-5 text-[#a2bcb0]">{subscriptionRows.length ? `${subscriptionRows.length} subscription transaction${subscriptionRows.length === 1 ? '' : 's'} detected.` : 'No subscription expenses logged this month. Categorize one as Subscriptions to track it here.'}</p></FeatureCard>
      </ToolkitSection>

      <ToolkitSection title="Budget, save & share" subtitle="Give every rupee a purpose, with tools for real student routines.">
        <FeatureCard number={6} title="Wishlist Savings" description="Create micro-goals for planned purchases." icon={Gift} status="Available" tone="live"><p className="text-sm font-semibold">{data.goals.length} active goal{data.goals.length === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-[#a2bcb0]">{formatMoney(data.goals.reduce((sum, goal) => sum + goal.currentPaise, 0))} saved toward them.</p><Button variant="outline" className="mt-4 w-full" onClick={() => go('goals')}>Open savings goals</Button></FeatureCard>
        <FeatureCard number={7} title="Micro-Investing" description="Simulate investing transaction round-ups." icon={TrendingUp} status="Simulation" tone="planned"><p className="text-2xl font-semibold">{currency.format(roundUps)}</p><p className="mt-2 text-xs leading-5 text-[#a2bcb0]">Potential round-ups to the next ₹10 from this month’s expenses. Simulation only — no money is moved or invested.</p></FeatureCard>
        <FeatureCard number={8} title="Envelope Budgeting" description="Enforce category limits with digital envelopes." icon={PackageSearch} status="Available" tone="live"><p className="text-sm font-semibold">{data.budgets.length} envelopes</p><p className="mt-1 text-xs text-[#a2bcb0]">{formatMoney(monthlyBudgetLeft)} remains across your monthly plan.</p><Button variant="outline" className="mt-4 w-full" onClick={() => go('budgets')}>Manage envelopes</Button></FeatureCard>
        <FeatureCard number={9} title="Zero-Based Budgeting" description="Assign every rupee until unallocated money reaches zero." icon={CircleDollarSign} status={Math.abs(unallocated) < 1 ? 'Balanced' : 'Needs assignment'} tone={Math.abs(unallocated) < 1 ? 'live' : 'attention'}><p className={`text-2xl font-semibold ${unallocated < 0 ? 'text-[#f2a69a]' : ''}`}>{currency.format(unallocated)}</p><p className="mt-2 text-xs leading-5 text-[#a2bcb0]">Income minus budget envelopes and planned savings. {unallocated > 0 ? 'Assign this amount to a category or goal.' : unallocated < 0 ? 'Your plan assigns more than this month’s income.' : 'Every rupee has a job.'}</p></FeatureCard>
        <FeatureCard number={10} title="Roommate Splitter" description="Divide rent, canteen, or grocery costs." icon={Split} status="Calculator" tone="live"><div className="grid grid-cols-2 gap-2"><label className="text-xs text-[#a2bcb0]">Bill amount<Input type="number" min="0" value={splitTotal} onChange={(event) => setSplitTotal(Number(event.target.value))} className="mt-1 h-9" /></label><label className="text-xs text-[#a2bcb0]">People<Input type="number" min="1" value={splitPeople} onChange={(event) => setSplitPeople(Math.max(1, Number(event.target.value)))} className="mt-1 h-9" /></label></div><p className="mt-3 text-sm">Each person pays <strong>{currency.format(splitTotal / Math.max(1, splitPeople))}</strong></p></FeatureCard>
      </ToolkitSection>

      <ToolkitSection title="Campus life" subtitle="Stay ahead of travel, deals, fees, projects, and family reporting.">
        <FeatureCard number={11} title="Transit Tracker" description="Compare per-ride travel with a campus pass." icon={Train} status="Calculator" tone="live"><div className="grid grid-cols-3 gap-2"><label className="text-[11px] text-[#a2bcb0]">Rides<Input type="number" min="0" value={monthlyRides} onChange={(event) => setMonthlyRides(Number(event.target.value))} className="mt-1 h-9 px-2" /></label><label className="text-[11px] text-[#a2bcb0]">₹ / ride<Input type="number" min="0" value={rideCost} onChange={(event) => setRideCost(Number(event.target.value))} className="mt-1 h-9 px-2" /></label><label className="text-[11px] text-[#a2bcb0]">Pass ₹<Input type="number" min="0" value={passCost} onChange={(event) => setPassCost(Number(event.target.value))} className="mt-1 h-9 px-2" /></label></div><p className="mt-3 text-xs leading-5">{passCost < monthlyTransit ? `The pass saves about ${currency.format(monthlyTransit - passCost)} per month.` : `Pay-per-ride saves about ${currency.format(passCost - monthlyTransit)} per month.`}</p></FeatureCard>
        <FeatureCard number={12} title="Student Discounts" description="Keep a watchlist for verified student deals." icon={Gift} status="Feed required" tone="planned"><div className="flex flex-wrap gap-2">{['Technology', 'Software', 'Apparel'].map((item) => <span key={item} className="rounded-full bg-[#122b24] px-2.5 py-1 text-xs text-[#a2bcb0]">{item}</span>)}</div><p className="mt-3 text-xs leading-5 text-[#a2bcb0]">A verified, current offers feed must be connected before deal alerts can be shown.</p></FeatureCard>
        <FeatureCard number={13} title="College Fee Planner" description="Track tuition, hostel, and exam dues by semester." icon={GraduationCap} status="Available" tone="live"><p className="text-sm font-semibold">Next major due: 10 Oct</p><p className="mt-1 text-xs text-[#a2bcb0]">Tuition, forms, hostel renewal, and scholarships are organized together.</p><Button variant="outline" className="mt-4 w-full" onClick={() => go('college')}>Open fee planner</Button></FeatureCard>
        <FeatureCard number={14} title="Project Ledger" description="Isolate equipment, learning, and project costs." icon={BookOpen} status="Auto grouped" tone="live"><p className="text-2xl font-semibold">{formatMoney(projectSpent)}</p><p className="mt-2 text-xs leading-5 text-[#a2bcb0]">Grouped from Technology and AI / ML Learning transactions this month.</p></FeatureCard>
        <FeatureCard number={15} title="Downloadable Reports" description="Share a clean allowance summary with family." icon={Download} status="Print / PDF" tone="live"><p className="text-xs leading-5 text-[#a2bcb0]">Open your report, then use the browser’s Print dialog and choose “Save as PDF”.</p><Button variant="outline" className="mt-4 w-full" onClick={() => go('reports')}><Download />Open report</Button></FeatureCard>
      </ToolkitSection>

      <ToolkitSection title="Grow & monitor" subtitle="Build habits, handle global costs, and model long-term debt.">
        <FeatureCard number={16} title="Cash Flow Widget" description="A compact, glanceable spending snapshot." icon={MonitorSmartphone} status="Widget preview" tone="live"><div className="rounded-2xl bg-[#183f32] p-4 text-white"><p className="text-[11px] text-white/55">Campus Cash • this month</p><div className="mt-2 flex items-end justify-between"><p className="text-xl font-semibold">{formatMoney(totals.balance)}</p><span className="text-xs text-[#eac491]">{currency.format(dailyPace)}/day</span></div></div><p className="mt-2 text-[11px] text-[#a2bcb0]">Use your browser’s “Add to Home Screen” for quick access.</p></FeatureCard>
        <FeatureCard number={17} title="Gamified Streaks" description="Earn progress for consistent saving." icon={Trophy} status={`${activeSavingsMonths}-month streak`} tone="live"><div className="flex gap-2">{[1, 2, 3, 4, 5].map((step) => <span key={step} className={`grid size-9 place-items-center rounded-full text-xs font-bold ${step <= activeSavingsMonths ? 'bg-[#30291c] text-[#ecf4ed]' : 'bg-[#122b24] text-[#a2bcb0]'}`}>{step}</span>)}</div><p className="mt-3 text-xs text-[#a2bcb0]">Log savings in another month to extend your streak.</p></FeatureCard>
        <FeatureCard number={18} title="Credit Score Monitor" description="Connect regulated access to credit health." icon={CreditCard} status="Bureau required" tone="planned"><p className="text-xs leading-5 text-[#a2bcb0]">No score is estimated or fabricated. A licensed credit-bureau partner and explicit student consent are required.</p><Button disabled variant="outline" className="mt-4 w-full">Connect credit profile</Button></FeatureCard>
        <FeatureCard number={19} title="Multi-Currency Support" description="Convert global software and study costs." icon={IndianRupee} status="Manual rate" tone="live"><div className="grid grid-cols-2 gap-2"><label className="text-xs text-[#a2bcb0]">Foreign amount<Input type="number" min="0" step="0.01" value={foreignAmount} onChange={(event) => setForeignAmount(Number(event.target.value))} className="mt-1 h-9" /></label><label className="text-xs text-[#a2bcb0]">₹ per unit<Input type="number" min="0" step="0.01" value={inrPerUnit} onChange={(event) => setInrPerUnit(Number(event.target.value))} className="mt-1 h-9" /></label></div><p className="mt-3 text-sm">Estimated cost: <strong>{currency.format(foreignAmount * inrPerUnit)}</strong></p><p className="mt-1 text-[11px] text-[#a2bcb0]">Enter the rate shown by your bank or card; this is not a live FX quote.</p></FeatureCard>
        <FeatureCard number={20} title="Loan Payoff Calculator" description="Model an education-loan repayment timeline." icon={Calculator} status="Calculator" tone="live"><div className="grid grid-cols-3 gap-2"><label className="text-[11px] text-[#a2bcb0]">Loan ₹<Input type="number" min="0" value={loanPrincipal} onChange={(event) => setLoanPrincipal(Number(event.target.value))} className="mt-1 h-9 px-2" /></label><label className="text-[11px] text-[#a2bcb0]">Rate %<Input type="number" min="0" step="0.1" value={loanRate} onChange={(event) => setLoanRate(Number(event.target.value))} className="mt-1 h-9 px-2" /></label><label className="text-[11px] text-[#a2bcb0]">Months<Input type="number" min="1" value={loanMonths} onChange={(event) => setLoanMonths(Math.max(1, Number(event.target.value)))} className="mt-1 h-9 px-2" /></label></div><p className="mt-3 text-sm">Estimated EMI: <strong>{currency.format(emi)}</strong></p><p className="mt-1 text-[11px] text-[#a2bcb0]">Total repayment: {currency.format(emi * loanMonths)}. Estimates exclude fees and rate changes.</p></FeatureCard>
      </ToolkitSection>
    </div>
  );
}

function ToolkitSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section><div className="mb-4"><h2 className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-[#a2bcb0]">{subtitle}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{children}</div></section>;
}

function BankImportCard({ onImport }: { onImport: (rows: ImportRow[]) => Promise<boolean | undefined> }) {
 const [rows,setRows]=useState<ImportRow[]>([]),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const parse=async(file:File)=>{setRows([]);setStatus('');try{if(file.size>2_000_000)throw new Error('Choose a CSV smaller than 2 MB.');const table=readCsv(await file.text());const headers=(table.shift()||[]).map(h=>h.toLowerCase().replace(/[^a-z]/g,''));const output:ImportRow[]=[];let skipped=0;const seen=new Set<string>();
 for(const values of table){const get=(...names:string[])=>values[headers.findIndex(h=>names.includes(h))]||'';const debit=Number(get('debit','withdrawal').replaceAll(',','')),credit=Number(get('credit','deposit').replaceAll(',',''));const raw=Number(get('amount','amountinr').replace(/[₹$,]/g,''));const amount=Math.abs(raw||debit||credit);const explicit=get('type','transactiontype').toLowerCase();const type:TransactionType=explicit==='savings'?'savings':['income','credit','deposit'].includes(explicit)||(!explicit&&credit>0&&!debit)?'income':'expense';const occurredOn=get('date','occurredon','transactiondate');const description=get('description','name','merchant','narration');
 const key=JSON.stringify([description,amount,occurredOn,type,get('account')||'Bank account']);if(!Number.isFinite(amount)||amount<=0||!description||!validDate(occurredOn)||seen.has(key)){skipped++;continue;}seen.add(key);output.push({description,amount,occurredOn,type,category:get('category')||'Personal',account:get('account')||'Bank account',paymentMethod:get('paymentmethod','method')||'Bank transfer'});}
 if(output.length>500)throw new Error('Import at most 500 valid rows per file.');setRows(output);setStatus(`${output.length} ready; ${skipped} invalid or duplicate rows skipped. Dates must use YYYY-MM-DD.`);
 }catch(e){setStatus((e as Error).message);}};
 return <FeatureCard number={1} title="Bank statement import" description="Preview CSV transactions before saving. Existing duplicates are skipped." icon={PlugZap} status="Review before import" tone="live"><label className="block text-sm">CSV file<Input type="file" accept=".csv,text/csv" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void parse(f);}}/></label><p className="mt-2 text-sm" role="status">{status||'Columns: Date, Description, Amount, Type. Or use separate Debit and Credit columns.'}</p>{rows.length>0&&<><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-sm"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.occurredOn}</td><td>{r.description}</td><td>{r.type}</td><td>{currency.format(r.amount)}</td></tr>)}</tbody></table></div><Button disabled={busy} className="mt-3" onClick={async()=>{setBusy(true);try{if(await onImport(rows)){setRows([]);setStatus('Import completed. Existing duplicates were skipped.');}else setStatus('Import failed. Your preview is retained; retry when connected.');}finally{setBusy(false);}}}>{busy?'Importing…':`Import ${rows.length} reviewed rows`}</Button></>}</FeatureCard>;
}

function UploadIcon() { return <Upload className="mx-auto mb-1 size-4 text-[#ecf4ed]" />; }

function ReceiptScannerCard({ receiptName, setReceiptName, onAdd }: { receiptName: string; setReceiptName: (name: string) => void; onAdd: (receipt: ReceiptDraft) => void }) {
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const parseReceipt = (raw: string): ReceiptDraft => {
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const amountMatch = raw.match(/(?:grand\s+total|total|amount\s+due|net\s+amount)[^\d]{0,20}(\d[\d,]*(?:\.\d{1,2})?)/i) ?? raw.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*\.\d{1,2})/gi)?.at(-1)?.match(/(\d[\d,]*(?:\.\d{1,2})?)/);
    const amount = Number((amountMatch?.[1] ?? '0').replaceAll(',', '')) || 0;
    const dateMatch = raw.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    const occurredOn = dateMatch ? dateMatch[1].replaceAll('/', '-') : today;
    const lower = raw.toLowerCase();
    const category = /restaurant|cafe|food|canteen|mess|grocery/.test(lower) ? 'Food' : /uber|ola|metro|bus|transport|fuel/.test(lower) ? 'Travel' : /hostel|rent/.test(lower) ? 'Hostel' : /college|university|exam|tuition/.test(lower) ? 'College fees' : 'Personal';
    return { description: lines[0]?.slice(0, 80) || 'Receipt purchase', amount, occurredOn, category };
  };
  const clear = () => { setDraft(null); setText(''); setStatus(''); setReceiptName(''); };
  return <FeatureCard number={2} title="Local receipt OCR" description="Extract bill details on this device, review the filled form, then choose whether to add it." icon={Camera} status="Runs locally" tone="live"><label className="block cursor-pointer rounded-xl border border-dashed border-[#29473e] bg-[#122b24] p-3 text-center text-xs font-medium"><Camera className="mx-auto mb-1 size-4 text-[#ecf4ed]" />{receiptName || 'Choose receipt photo'}<input className="sr-only" type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setReceiptName(file.name); setStatus('Reading locally…'); setText(''); setDraft(null); try { const { createWorker } = await import('tesseract.js'); const worker = await createWorker('eng'); const result = await worker.recognize(file); const raw = result.data.text.trim(); setText(raw); setDraft(parseReceipt(raw)); await worker.terminate(); setStatus('Details filled. Review them before deciding.'); } catch { setStatus('OCR could not read this image. Try a sharper, well-lit photo.'); } }} /></label>{status && <p className="mt-2 text-[11px] leading-4 text-[#a2bcb0]">{status}</p>}{draft && <div className="mt-3 rounded-xl border border-[#29473e] bg-[#122b24] p-3"><p className="text-xs font-semibold text-[#ecf4ed]">Add this bill?</p><div className="mt-2 grid gap-2"><label className="text-[11px] text-[#a2bcb0]">Description<Input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1 h-8 text-xs" /></label><div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-[#a2bcb0]">Amount (₹)<Input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} className="mt-1 h-8 text-xs" /></label><label className="text-[11px] text-[#a2bcb0]">Date<Input type="date" value={draft.occurredOn} onChange={(event) => setDraft({ ...draft, occurredOn: event.target.value })} className="mt-1 h-8 text-xs" /></label></div><label className="text-[11px] text-[#a2bcb0]">Category<Input value={draft.category} list="category-options" onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1 h-8 text-xs" /></label></div><div className="mt-3 flex gap-2"><Button className="h-8 flex-1 bg-[#183f32] text-xs" disabled={!draft.amount || !draft.description} onClick={() => { onAdd(draft); clear(); }}>Yes, add bill</Button><Button variant="outline" className="h-8 flex-1 text-xs" onClick={clear}>No, discard</Button></div></div>}{text && !draft && <div className="mt-2 max-h-20 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#122b24] p-2 text-[11px] text-[#a2bcb0]">{text}</div>}<p className="mt-2 text-[10px] text-[#a2bcb0]">Nothing is uploaded to an external AI service.</p></FeatureCard>;
}

function AdminView() {
  const [state, setState] = useState<{ students: Array<{ user_id: string; email: string; display_name: string; updated_at: string }>; transactionCount: number; auditLogs: Array<{ id: string; actor_email: string; action: string; target: string; created_at: string }> } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/admin', { cache: 'no-store' }).then(async (response) => { if (!response.ok) throw new Error('Admin access denied.'); setState(await response.json()); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load admin data.')); }, []);
  if (error) return <EmptyState text={error} />;
  if (!state) return <div className="rounded-2xl border border-[#29473e] bg-[#10271f] p-8 text-sm text-[#a2bcb0]">Loading admin controls…</div>;
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><MiniStat label="Student accounts" value={String(state.students.length)} icon={Users} /><MiniStat label="Total transactions" value={String(state.transactionCount)} icon={ReceiptText} /><MiniStat label="Audit events" value={String(state.auditLogs.length)} icon={ShieldCheck} /></div><div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><Panel title="Student directory" subtitle="Identity metadata only — students’ financial details remain isolated"><div className="mt-5 space-y-3">{state.students.map((student) => <div key={student.user_id} className="flex items-center gap-3 rounded-xl border border-[#29473e] p-3"><div className="grid size-9 place-items-center rounded-full bg-[#183f32] text-xs font-bold text-white">{student.display_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{student.display_name}</p><p className="truncate text-xs text-[#a2bcb0]">{student.email}</p></div><span className="text-[10px] text-[#a2bcb0]">Active</span></div>)}</div></Panel><div className="space-y-5"><Panel title="Compliance controls" subtitle="Production safety baseline"><div className="mt-5 space-y-3 text-sm">{['ChatGPT identity authentication', 'Per-student data isolation', 'Admin access restricted by email', 'Audit trail for admin views', 'No plaintext passwords stored'].map((item) => <div key={item} className="flex items-center gap-2 rounded-lg bg-[#122b24] px-3 py-2 text-[#ecf4ed]"><CircleCheck className="size-4 text-[#ecf4ed]" />{item}</div>)}</div></Panel><Panel title="Institution backup" subtitle="Export all transaction records for controlled retention"><a href="/api/admin?format=csv" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#29473e] text-sm font-semibold hover:bg-[#122b24]"><Download className="size-4" />Download admin CSV backup</a></Panel></div></div><Panel title="Recent audit activity" subtitle="Most recent administrator events"><div className="mt-5 space-y-2">{state.auditLogs.slice(0, 10).map((log) => <div key={log.id} className="flex flex-col gap-1 border-b border-[#29473e] pb-3 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold">{log.action} <span className="font-normal text-[#a2bcb0]">on {log.target}</span></span><span className="text-[#a2bcb0]">{new Date(log.created_at).toLocaleString('en-IN')}</span></div>)}</div></Panel></div>;
}

function FeatureCard({ number, title, description, icon: Icon, status, tone, children }: { number: number; title: string; description: string; icon: typeof WalletCards; status: string; tone: 'live' | 'planned' | 'attention'; children: React.ReactNode }) {
  const statusTone = tone === 'live' ? 'bg-[#122b24] text-[#ecf4ed]' : tone === 'attention' ? 'bg-[#30291c] text-[#eac491]' : 'bg-[#232338] text-[#b8b5f1]';
  return <article className="flex min-h-[275px] flex-col rounded-2xl border border-[#29473e] bg-[#10271f] p-5 shadow-[0_10px_30px_rgba(24,62,54,0.04)]"><div className="flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#122b24] text-[#ecf4ed]"><Icon className="size-5" /></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone}`}>{status}</span></div><p className="mt-4 text-[11px] font-bold tracking-[0.14em] text-[#a2bcb0]">TOOL {String(number).padStart(2, '0')}</p><h3 className="mt-1 font-semibold">{title}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-[#a2bcb0]">{description}</p><div className="mt-4 flex-1">{children}</div></article>;
}

function SettingsView({ data, currentUser, onSaveFees, onReset, onDeleteData, saving }: { data: FinanceData; currentUser: CurrentUser | null; onSaveFees: (values: { semesterOne: number; semesterTwo: number; examLab: number; hostelYearly: number }) => void; onReset: () => void; onDeleteData: () => void; saving: boolean }) {
  const demoCount = data.transactions.filter((item) => Boolean(item.isDemo)).length;
  const fees = data.feeSettings ?? fallbackData.feeSettings!;
  const submitFees = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSaveFees({ semesterOne: Number(form.get('semesterOne')), semesterTwo: Number(form.get('semesterTwo')), examLab: Number(form.get('examLab')), hostelYearly: Number(form.get('hostelYearly')) }); };
  return <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]"><div className="space-y-5"><Panel title="Student account" subtitle="Your identity keeps this budget workspace separate"><div className="mt-5 flex items-center gap-4 rounded-xl border border-[#29473e] p-4"><div className="grid size-11 place-items-center rounded-full bg-[#183f32] text-white"><UserCircle className="size-5" /></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{currentUser?.displayName ?? 'Signed-in student'}</p><p className="truncate text-sm text-[#a2bcb0]">{currentUser?.email}</p></div><a href="/signout-with-chatgpt?return_to=%2F" target="_top" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#29473e] px-3 text-sm font-medium hover:bg-[#122b24]"><LogOut className="size-4" />Sign out</a></div></Panel><Panel title="Fee settings" subtitle="Change your own tuition, exam, and yearly hostel amounts anytime"><form onSubmit={submitFees} className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-medium">Semester 1 tuition<Input name="semesterOne" type="number" min="0" defaultValue={fees.semesterOnePaise / 100} className="h-10" /></label><label className="grid gap-1.5 text-sm font-medium">Semester 2 tuition<Input name="semesterTwo" type="number" min="0" defaultValue={fees.semesterTwoPaise / 100} className="h-10" /></label><label className="grid gap-1.5 text-sm font-medium">Exam & lab fees<Input name="examLab" type="number" min="0" defaultValue={fees.examLabPaise / 100} className="h-10" /></label><label className="grid gap-1.5 text-sm font-medium">Yearly hostel fee<Input name="hostelYearly" type="number" min="0" defaultValue={fees.hostelYearlyPaise / 100} className="h-10" /></label><Button disabled={saving} type="submit" className="bg-[#183f32]">{saving && <Loader2 className="animate-spin" />}Save fee settings</Button></form><p className="mt-3 text-xs leading-5 text-[#a2bcb0]">These values update the College Costs planner. Paid transactions already recorded remain in your history.</p></Panel><Panel title="Demo data" subtitle="Explore safely, then clear examples before real use"><div className="mt-5 flex flex-col gap-4 rounded-xl bg-[#30291c] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{demoCount} sample transactions are active</p><p className="mt-1 text-sm text-[#eac491]">Only your demo entries are removed. Other students are never affected.</p></div><Button disabled={saving || demoCount === 0} variant="outline" onClick={onReset}>{saving ? <Loader2 className="animate-spin" /> : <Trash2 />}Remove demo data</Button></div></Panel><Panel title="Categories" subtitle="Choose a suggestion or type any custom category while adding a transaction"><div className="mt-5 flex flex-wrap gap-2">{categories.map((item) => <span key={item} className="rounded-full border border-[#29473e] bg-[#122b24] px-3 py-1.5 text-sm text-[#a2bcb0]">{item}</span>)}</div></Panel></div><div className="space-y-5"><Panel title="Data & privacy" subtitle="Export your records or remove them whenever you need"><div className="mt-5 space-y-4">{[{ icon: ShieldCheck, title: 'Isolated by account', copy: 'Every database read and write is tied to the signed-in student on the server.' }, { icon: Download, title: 'Download full CSV backup', copy: 'Save your complete private transaction history for your records.' }].map((item) => <div key={item.title} className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#122b24] text-[#ecf4ed]"><item.icon className="size-4" /></div><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#a2bcb0]">{item.copy}</p></div></div>)}</div><a href="/api/finance?format=csv" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#29473e] text-sm font-semibold hover:bg-[#122b24]"><Download className="size-4" />Download CSV backup</a><Dialog><DialogTrigger render={<Button variant="ghost" className="mt-3 w-full text-[#f2a69a] hover:bg-[#30291c] hover:text-[#f2a69a]" />}><Trash2 />Delete my finance data</DialogTrigger><DialogContent className="max-w-sm rounded-3xl"><DialogHeader><DialogTitle>Delete your finance data?</DialogTitle><DialogDescription>This permanently removes your transactions, budgets, goals, and accounts from your private workspace. Your ChatGPT sign-in is not deleted.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline">Cancel</Button><Button disabled={saving} className="bg-[#b45245] hover:bg-[#9d4137]" onClick={onDeleteData}>{saving && <Loader2 className="animate-spin" />}Delete data</Button></DialogFooter></DialogContent></Dialog></Panel><Panel title="About" subtitle="Built from your college finance specification"><p className="mt-5 text-sm leading-6 text-[#a2bcb0]">Campus Cash brings transactions, budgets, savings, fees, accounts, subscriptions, purchase planning, and monthly insights into one private student workspace.</p></Panel></div></div>;
}

function MetricCard({ label, value, meta, icon: Icon, tone }: { label: string; value: string; meta: string; icon: typeof WalletCards; tone: string }) {
  const dark = tone.includes('text-white');
  return <article className={`rounded-2xl border border-[#29473e] p-5 shadow-[0_10px_30px_rgba(24,62,54,0.04)] ${tone}`}><div className="flex items-center justify-between"><p className={`text-sm ${dark ? 'text-white/65' : 'text-[#a2bcb0]'}`}>{label}</p><Icon className={`size-4 ${dark ? 'text-[#eac491]' : 'text-[#74d4ae]'}`} /></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className={`mt-1 text-xs ${dark ? 'text-white/55' : 'text-[#a2bcb0]'}`}>{meta}</p></article>;
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Target }) {
  return <article className="flex items-center gap-4 rounded-2xl border border-[#29473e] bg-[#10271f] p-5"><div className="grid size-11 place-items-center rounded-xl bg-[#122b24] text-[#ecf4ed]"><Icon className="size-5" /></div><div><p className="text-xs text-[#a2bcb0]">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div></article>;
}

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <article className={`spatial-panel rounded-2xl border border-[#29473e] bg-[#10271f] p-5 shadow-[0_10px_30px_rgba(24,62,54,0.04)] sm:p-6 ${className}`}><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-[#a2bcb0]">{subtitle}</p></div>{action}</div>{children}</article>;
}

function BudgetMeter({ name, spent, total, detailed = false }: { name: string; spent: number; total: number; detailed?: boolean }) {
  const percent = total ? Math.round((spent / total) * 100) : 0;
  const color = percent > 100 ? '#f2a69a' : percent >= 70 ? '#e7bb79' : '#71d3ac';
  return <div className={detailed ? 'rounded-xl border border-[#29473e] p-4' : ''}><div className="mb-2 flex items-end justify-between"><div><p className="text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-[#a2bcb0]">{formatMoney(spent)} of {formatMoney(total)}</p></div><span className="text-sm font-semibold tabular-nums" style={{ color }}>{percent}%</span></div><Progress value={Math.min(percent, 100)}><ProgressTrack className={detailed ? 'h-2' : ''}><ProgressIndicator style={{ backgroundColor: color }} /></ProgressTrack></Progress>{detailed && <p className="mt-3 text-xs text-[#a2bcb0]">{spent > total ? `${formatMoney(spent - total)} over limit` : `${formatMoney(total - spent)} remaining`}</p>}</div>;
}

function TransactionTable({ rows, compact = false, onDelete, onEdit }: { rows: Transaction[]; compact?: boolean; onDelete?: (id: string) => void; onEdit?: (id: string) => void }) {
  if (!rows.length) return <EmptyState text="No transactions match this view yet." />;
  return <Table><TableHeader><TableRow><TableHead>Transaction</TableHead><TableHead className="hidden sm:table-cell">Category</TableHead><TableHead className="hidden md:table-cell">Date</TableHead>{!compact && <TableHead className="hidden lg:table-cell">Account</TableHead>}<TableHead className="text-right">Amount</TableHead>{(onDelete || onEdit) && <TableHead><span className="sr-only">Actions</span></TableHead>}</TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell><div className="flex items-center gap-3"><div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.type === 'income' ? 'bg-[#122b24] text-[#ecf4ed]' : item.type === 'savings' ? 'bg-[#232338] text-[#b8b5f1]' : 'bg-[#30291c] text-[#eac491]'}`}>{item.type === 'income' ? <ArrowUpRight className="size-4" /> : item.type === 'savings' ? <PiggyBank className="size-4" /> : <ArrowDownRight className="size-4" />}</div><div><p className="font-medium">{item.description}</p><p className="mt-0.5 text-xs text-[#a2bcb0] sm:hidden">{item.category}</p></div></div></TableCell><TableCell className="hidden text-[#a2bcb0] sm:table-cell">{item.category}</TableCell><TableCell className="hidden text-[#a2bcb0] md:table-cell">{new Date(`${item.occurredOn}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</TableCell>{!compact && <TableCell className="hidden text-[#a2bcb0] lg:table-cell">{item.account}</TableCell>}<TableCell className={`text-right font-semibold tabular-nums ${item.type === 'income' ? 'text-[#ecf4ed]' : item.type === 'savings' ? 'text-[#b8b5f1]' : 'text-[#ecf4ed]'}`}>{item.type === 'income' ? '+' : item.type === 'expense' ? '−' : ''}{formatMoney(item.amountPaise)}</TableCell>{(onDelete || onEdit) && <TableCell className="w-20"><div className="flex justify-end gap-1">{onEdit && <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.description}`} onClick={() => onEdit(item.id)}><Pencil className="text-[#ecf4ed]" /></Button>}{onDelete && <Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.description}`} onClick={() => onDelete(item.id)}><Trash2 className="text-[#9b655e]" /></Button>}</div></TableCell>}</TableRow>)}</TableBody></Table>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="my-6 grid min-h-36 place-items-center rounded-xl border border-dashed border-[#29473e] bg-[#122b24] p-6 text-center"><div><ReceiptText className="mx-auto size-6 text-[#a2bcb0]" /><p className="mt-3 text-sm text-[#a2bcb0]">{text}</p></div></div>;
}
