import { trpc } from "@/lib/trpc";
import { formatCurrency, getMonthName } from "@/lib/utils-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Home() {
  const [, setLocation] = useLocation();
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {year}年{month}月の収支概要
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setLocation("/transactions")}
            size="sm"
            className="glow-primary gap-1.5"
          >
            <Plus className="h-4 w-4" />
            取引を追加
          </Button>
        </div>
      </div>

      <div className="page-header-line" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-income border-0 shadow-sm card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">今月の収入</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(income)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-expense border-0 shadow-sm card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">今月の支出</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(expense)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-profit border-0 shadow-sm card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">今月の利益</p>
                <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? "text-foreground" : "text-destructive"}`}>
                  {formatCurrency(profit)}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">月次収支推移</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatAxis} axisLine={false} tickLine={false} width={45} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="income" name="収入" fill="oklch(0.65 0.20 160)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="支出" fill="oklch(0.65 0.18 25)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm" style={{ background: "oklch(0.65 0.20 160)" }} />
                <span className="text-xs text-muted-foreground">収入</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm" style={{ background: "oklch(0.65 0.18 25)" }} />
                <span className="text-xs text-muted-foreground">支出</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">最近の取引</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setLocation("/transactions")}
              >
                すべて表示
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!recentTxns || recentTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">取引データがありません</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() => setLocation("/transactions")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  最初の取引を追加
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTxns.slice(0, 8).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          txn.type === "income"
                            ? "bg-emerald-500/10"
                            : "bg-rose-500/10"
                        }`}
                      >
                        {txn.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-rose-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {txn.description || accountMap.get(txn.accountId) || "取引"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums shrink-0 ${
                        txn.type === "income" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {txn.type === "income" ? "+" : "-"}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
