import { trpc } from "@/lib/trpc";
import { formatCurrency, getMonthName } from "@/lib/utils-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart as PieChartIcon, FileSpreadsheet } from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";

const COLORS = [
  "oklch(0.65 0.18 265)", "oklch(0.55 0.15 280)", "oklch(0.72 0.12 160)",
  "oklch(0.68 0.16 45)", "oklch(0.60 0.14 330)", "oklch(0.58 0.16 200)",
  "oklch(0.70 0.14 100)", "oklch(0.62 0.12 350)",
];

export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState("pl");

  const { data: trend } = trpc.dashboard.trend.useQuery({ year });
  const { data: breakdown } = trpc.dashboard.accountBreakdown.useQuery({ year, month });
  const { data: yearBreakdown } = trpc.dashboard.accountBreakdown.useQuery({ year });

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
      利益: v.income - v.expense,
    }));
  }, [trend]);

  const incomeBreakdown = useMemo(() => (breakdown || []).filter(b => b.type === "income"), [breakdown]);
  const expenseBreakdown = useMemo(() => (breakdown || []).filter(b => b.type === "expense"), [breakdown]);

  const yearlyPL = useMemo(() => {
    if (!yearBreakdown) return { totalIncome: 0, totalExpense: 0, items: [] as any[] };
    let totalIncome = 0, totalExpense = 0;
    const items = yearBreakdown.map(b => {
      if (b.type === "income") totalIncome += b.total;
      else totalExpense += b.total;
      return b;
    });
    return { totalIncome, totalExpense, items };
  }, [yearBreakdown]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">レポート</h1>
          <p className="text-muted-foreground text-sm mt-1">月次・年次の収支分析</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}月</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pl" className="gap-2"><FileSpreadsheet className="h-4 w-4" />損益計算書</TabsTrigger>
          <TabsTrigger value="trend" className="gap-2"><BarChart3 className="h-4 w-4" />収支推移</TabsTrigger>
          <TabsTrigger value="breakdown" className="gap-2"><PieChartIcon className="h-4 w-4" />科目別集計</TabsTrigger>
        </TabsList>

        {/* P&L Statement */}
        <TabsContent value="pl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{year}年 損益計算書</CardTitle>
            </CardHeader>
            <CardContent>
              {yearlyPL.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">データがありません</div>
              ) : (
                <div className="space-y-6">
                  {/* Income Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      収入の部
                    </h3>
                    <div className="space-y-1">
                      {yearlyPL.items.filter(i => i.type === "income").map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30">
                          <span className="text-sm">{item.accountName}</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-2 px-3 border-t font-semibold">
                        <span className="text-sm">収入合計</span>
                        <span className="text-sm text-emerald-600 tabular-nums">{formatCurrency(yearlyPL.totalIncome)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expense Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      支出の部
                    </h3>
                    <div className="space-y-1">
                      {yearlyPL.items.filter(i => i.type === "expense").map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30">
                          <span className="text-sm">{item.accountName}</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-2 px-3 border-t font-semibold">
                        <span className="text-sm">支出合計</span>
                        <span className="text-sm text-red-500 tabular-nums">{formatCurrency(yearlyPL.totalExpense)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className="border-t-2 pt-4">
                    <div className="flex items-center justify-between px-3">
                      <span className="text-base font-bold">当期純利益</span>
                      <span className={`text-lg font-bold tabular-nums ${yearlyPL.totalIncome - yearlyPL.totalExpense >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {formatCurrency(yearlyPL.totalIncome - yearlyPL.totalExpense)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Chart */}
        <TabsContent value="trend">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{year}年 月次収支推移</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{year}年 利益推移</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="利益" stroke="oklch(0.45 0.18 265)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Breakdown */}
        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{month}月 収入内訳</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">データがありません</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={incomeBreakdown} dataKey="total" nameKey="accountName" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                          {incomeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {incomeBreakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                            <span>{item.accountName}</span>
                          </div>
                          <span className="font-medium tabular-nums">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{month}月 支出内訳</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">データがありません</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={expenseBreakdown} dataKey="total" nameKey="accountName" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                          {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {expenseBreakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                            <span>{item.accountName}</span>
                          </div>
                          <span className="font-medium tabular-nums">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
