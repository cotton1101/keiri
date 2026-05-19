import { trpc } from "@/lib/trpc";
import { formatCurrency, getMonthName } from "@/lib/utils-format";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  Sparkles,
  Activity,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "お疲れさまです";
  if (h < 12) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "お疲れさまです";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const { data: summary } = trpc.dashboard.summary.useQuery({ year, month });
  const { data: trend } = trpc.dashboard.trend.useQuery({ year });
  const { data: recentTxns } = trpc.dashboard.recentTransactions.useQuery();
  const { data: accounts } = trpc.accounts.list.useQuery();

  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const profit = income - expense;

  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: getMonthName(i + 1),
      income: 0,
      expense: 0,
    }));
    if (trend) {
      for (const t of trend) {
        const idx = t.month - 1;
        if (idx >= 0 && idx < 12) {
          if (t.type === "income") months[idx].income = t.total;
          if (t.type === "expense") months[idx].expense = t.total;
        }
      }
    }
    return months;
  }, [trend]);

  const accountMap = useMemo(() => {
    const map = new Map<number, string>();
    if (accounts) accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const formatAxis = (v: number) => {
    if (v >= 10000) return `${(v / 10000).toFixed(0)}万`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}千`;
    return String(v);
  };

  const profitRate = income > 0 ? Math.round((profit / income) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* ── Dark hero banner ── */}
      <div className="hero-banner slide-up">
        <div className="orb hero-orb-1" />
        <div className="orb hero-orb-2" />
        <div className="orb hero-orb-3" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="pulse-dot bg-emerald-400 text-emerald-400" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/50">
                {year}年{month}月のサマリー
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
              {getGreeting()}
              {user?.name ? `、${user.name}さん` : ""}
            </h1>
            <p className="text-sm text-white/45 mt-1.5">
              リアルタイムの経営データをお届けします
            </p>
          </div>

          {/* Inline KPI pills on the banner */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="metric-pill metric-pill-green">
              <ArrowUpRight className="h-3 w-3" />
              {formatCurrency(income)}
            </span>
            <span className="metric-pill metric-pill-red">
              <ArrowDownRight className="h-3 w-3" />
              {formatCurrency(expense)}
            </span>
            {income > 0 && (
              <span className="metric-pill metric-pill-purple">
                <Sparkles className="h-3 w-3" />
                {profitRate >= 0 ? "+" : ""}{profitRate}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Bento KPI grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-in">
        {/* Income */}
        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                収入
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums text-foreground">
                {formatCurrency(income)}
              </p>
            </div>
            <div className="icon-box icon-box-emerald">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Expense */}
        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                支出
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums text-foreground">
                {formatCurrency(expense)}
              </p>
            </div>
            <div className="icon-box icon-box-rose">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Profit */}
        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                利益
              </p>
              <p className={`text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums ${profit >= 0 ? "text-foreground" : "text-destructive"}`}>
                {formatCurrency(profit)}
              </p>
              {income > 0 && (
                <div className="flex items-center gap-2 mt-2.5">
                  <div
                    className="ring-progress"
                    style={{
                      "--ring-pct": `${Math.min(Math.abs(profitRate), 100)}%`,
                      "--ring-color": profitRate >= 0 ? "oklch(0.65 0.18 162)" : "oklch(0.65 0.18 25)",
                    } as React.CSSProperties}
                  >
                    <div className="ring-progress-inner">
                      {profitRate >= 0 ? "+" : ""}{profitRate}%
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">利益率</span>
                </div>
              )}
            </div>
            <div className="icon-box icon-box-violet">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 stagger-in">
        {/* Area Chart */}
        <div className="bento-card lg:col-span-3 p-0 overflow-hidden">
          <div className="bento-shine" />
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="icon-box icon-box-sky">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">収支トレンド</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                収入
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
                支出
              </span>
            </div>
          </div>
          <div className="h-[280px] px-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.18 162)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.65 0.18 162)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.16 25)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="oklch(0.68 0.16 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatAxis} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 8px 32px -6px rgba(0,0,0,0.14)",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                />
                <Area type="monotone" dataKey="income" name="収入" stroke="oklch(0.55 0.18 162)" strokeWidth={2.5} fill="url(#gIncome)" dot={false} />
                <Area type="monotone" dataKey="expense" name="支出" stroke="oklch(0.62 0.18 25)" strokeWidth={2} strokeDasharray="6 3" fill="url(#gExpense)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bento-card lg:col-span-2 flex flex-col">
          <div className="bento-shine" />
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="icon-box icon-box-amber">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">最近の取引</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-muted-foreground hover:text-foreground h-7 rounded-lg"
              onClick={() => setLocation("/transactions")}
            >
              すべて
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex-1 px-2 pb-3">
            {!recentTxns || recentTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Wallet className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  まだ取引がありません
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  最初の取引を記録しましょう
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5 rounded-lg h-8 text-xs"
                  onClick={() => setLocation("/transactions")}
                >
                  <Plus className="h-3 w-3" />
                  取引を追加
                </Button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentTxns.slice(0, 7).map((txn) => (
                  <div key={txn.id} className="txn-row group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                          txn.type === "income" ? "bg-emerald-500/8" : "bg-rose-500/8"
                        }`}
                      >
                        {txn.type === "income" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate leading-tight">
                          {txn.description || accountMap.get(txn.accountId) || "取引"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          {new Date(txn.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[13px] font-bold tabular-nums shrink-0 ${
                        txn.type === "income" ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-in">
        {[
          { label: "取引を追加", icon: Plus, path: "/transactions", color: "icon-box-violet" },
          { label: "レポート", icon: Activity, path: "/reports", color: "icon-box-sky" },
          { label: "請求書", icon: Receipt, path: "/invoices", color: "icon-box-amber" },
          { label: "確定申告", icon: Wallet, path: "/tax-filing", color: "icon-box-emerald" },
        ].map((action) => (
          <button
            key={action.path}
            onClick={() => setLocation(action.path)}
            className="bento-card p-4 flex items-center gap-3 text-left group"
          >
            <div className="bento-shine" />
            <div className={`icon-box ${action.color} h-9 w-9`}>
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
