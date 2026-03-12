import { trpc } from "@/lib/trpc";
import { formatCurrency, getMonthName } from "@/lib/utils-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart as PieChartIcon, FileSpreadsheet } from "lucide-react";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["oklch(0.55 0.22 265)", "oklch(0.60 0.18 200)", "oklch(0.65 0.20 160)", "oklch(0.68 0.16 45)", "oklch(0.55 0.18 330)", "oklch(0.62 0.14 100)", "oklch(0.58 0.16 280)", "oklch(0.70 0.12 350)"];

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
    for (const t of trend) { if (months[t.month]) { if (t.type === "income") months[t.month].income = t.total; if (t.type === "expense") months[t.month].expense = t.total; } }
    return Object.entries(months).map(([m, v]) => ({ name: getMonthName(Number(m)), 収入: v.income, 支出: v.expense, 利益: v.income - v.expense }));
  }, [trend]);

  const incomeBreakdown = useMemo(() => (breakdown || []).filter(b => b.type === "income"), [breakdown]);
  const expenseBreakdown = useMemo(() => (breakdown || []).filter(b => b.type === "expense"), [breakdown]);

  const yearlyPL = useMemo(() => {
    if (!yearBreakdown) return { totalIncome: 0, totalExpense: 0, items: [] as any[] };
    let totalIncome = 0, totalExpense = 0;
    const items = yearBreakdown.map(b => { if (b.type === "income") totalIncome += b.total; else totalExpense += b.total; return b; });
    return { totalIncome, totalExpense, items };
  }, [yearBreakdown]);

  const formatAxis = (v: number) => { if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}万`; if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}千`; return String(v); };
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">レポート</h1>
          <p className="text-muted-foreground text-sm mt-1">月次・年次の収支分析</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[110px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[90px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}月</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="page-header-line" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10">
          <TabsTrigger value="pl" className="gap-1.5 text-sm"><FileSpreadsheet className="h-3.5 w-3.5" />損益計算書</TabsTrigger>
          <TabsTrigger value="trend" className="gap-1.5 text-sm"><BarChart3 className="h-3.5 w-3.5" />収支推移</TabsTrigger>
          <TabsTrigger value="breakdown" className="gap-1.5 text-sm"><PieChartIcon className="h-3.5 w-3.5" />科目別集計</TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{year}年 損益計算書</CardTitle></CardHeader>
            <CardContent>
              {yearlyPL.items.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">データがありません</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500" />収入の部</h3>
                    <div className="space-y-0.5">
                      {yearlyPL.items.filter(i => i.type === "income").map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <span className="text-sm">{item.accountName}</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-2.5 px-4 border-t font-semibold mt-1">
                        <span className="text-sm">収入合計</span>
                        <span className="text-sm text-emerald-600 tabular-nums">{formatCurrency(yearlyPL.totalIncome)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-rose-600 mb-3 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-rose-500" />支出の部</h3>
                    <div className="space-y-0.5">
                      {yearlyPL.items.filter(i => i.type === "expense").map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <span className="text-sm">{item.accountName}</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-2.5 px-4 border-t font-semibold mt-1">
                        <span className="text-sm">支出合計</span>
                        <span className="text-sm text-rose-600 tabular-nums">{formatCurrency(yearlyPL.totalExpense)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t-2 pt-4">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-xl">
                      <span className="text-base font-bold">当期純利益</span>
                      <span className={`text-xl font-bold tabular-nums ${yearlyPL.totalIncome - yearlyPL.totalExpense >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatCurrency(yearlyPL.totalIncome - yearlyPL.totalExpense)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <div className="grid gap-5">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{year}年 月次収支推移</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatAxis} axisLine={false} tickLine={false} width={50} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)", fontSize: "13px" }} />
                      <Bar dataKey="収入" fill="oklch(0.65 0.20 160)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="支出" fill="oklch(0.65 0.18 25)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm" style={{ background: "oklch(0.65 0.20 160)" }} /><span className="text-xs text-muted-foreground">収入</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm" style={{ background: "oklch(0.65 0.18 25)" }} /><span className="text-xs text-muted-foreground">支出</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{year}年 利益推移</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatAxis} axisLine={false} tickLine={false} width={50} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "10px", border: "1px solid var(--border)", fontSize: "13px" }} />
                      <Line type="monotone" dataKey="利益" stroke="oklch(0.50 0.22 265)" strokeWidth={2.5} dot={{ r: 4, fill: "oklch(0.50 0.22 265)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[{ title: `${month}月 収入内訳`, data: incomeBreakdown }, { title: `${month}月 支出内訳`, data: expenseBreakdown }].map(({ title, data }) => (
              <Card key={title} className="shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{title}</CardTitle></CardHeader>
                <CardContent>
                  {data.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">データがありません</div>
                  ) : (
                    <>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={data} dataKey="total" nameKey="accountName" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "10px", border: "1px solid var(--border)", fontSize: "13px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-3">
                        {data.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} /><span className="truncate">{item.accountName}</span></div>
                            <span className="font-medium tabular-nums shrink-0">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
