import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getMonthName } from "@/lib/utils-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function Home() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const { data: summary, isLoading: summaryLoading } = trpc.dashboard.summary.useQuery({ year, month });
  const { data: trend, isLoading: trendLoading } = trpc.dashboard.trend.useQuery({ year });
  const { data: recentTx, isLoading: recentLoading } = trpc.dashboard.recentTransactions.useQuery();
  const { data: accountsList } = trpc.accounts.list.useQuery();

  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const profit = income - expense;

  const chartData = useMemo(() => {
    if (!trend) return [];
    const months: Record<number, { income: number; expense: number }> = {};
    for (let m = 1; m <= 12; m++) months[m] = { income: 0, expense: 0 };
    for (const t of trend) {
      if (months[t.month]) {
        if (t.type === "income") months[t.month].income = t.total;
        if (t.type === "expense") months[t.month].expense = t.total;
      }
    }
    return Object.entries(months).map(([m, v]) => ({
      name: getMonthName(Number(m)),
      収入: v.income,
      支出: v.expense,
    }));
  }, [trend]);

  const accountMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (accountsList) {
      for (const a of accountsList) map[a.id] = a.name;
    }
    return map;
  }, [accountsList]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {year}年{month}月の収支概要
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover border-0 stat-income">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">今月の収入</p>
                <p className="text-2xl font-bold tracking-tight">
                  {summaryLoading ? "..." : formatCurrency(income)}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 stat-expense">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">今月の支出</p>
                <p className="text-2xl font-bold tracking-tight">
                  {summaryLoading ? "..." : formatCurrency(expense)}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 stat-profit">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">今月の利益</p>
                <p className={`text-2xl font-bold tracking-tight ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {summaryLoading ? "..." : formatCurrency(profit)}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-3 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              月次収支推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                読み込み中...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "13px" }} />
                  <Bar dataKey="収入" fill="oklch(0.65 0.18 160)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="支出" fill="oklch(0.65 0.18 25)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">最近の取引</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !recentTx || recentTx.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                取引データがありません
              </div>
            ) : (
              <div className="space-y-1">
                {recentTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          tx.type === "income"
                            ? "bg-emerald-500/10"
                            : "bg-red-500/10"
                        }`}
                      >
                        {tx.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {tx.description || accountMap[tx.accountId] || "取引"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === "income"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(tx.amount))}
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
