import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileCheck, Calculator, TrendingUp, TrendingDown, Wallet, Sparkles, Plus, Trash2, Eye, Printer,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function TaxFiling() {
  const now = new Date();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [genYear, setGenYear] = useState(now.getFullYear() - 1);
  const [genType, setGenType] = useState<"blue" | "white">("blue");

  const utils = trpc.useUtils();
  const { data: filings, isLoading } = trpc.taxFiling.list.useQuery();
  const { data: detail } = trpc.taxFiling.get.useQuery({ id: detailId! }, { enabled: !!detailId });
  const { data: profile } = trpc.businessProfile.get.useQuery();
  const generateMut = trpc.taxFiling.generate.useMutation({
    onSuccess: (res) => { utils.taxFiling.invalidate(); toast.success("確定申告データを生成しました"); setGenerateDialogOpen(false); setDetailId(res.id); },
  });
  const deleteMut = trpc.taxFiling.delete.useMutation({ onSuccess: () => { utils.taxFiling.invalidate(); toast.success("削除しました"); setDetailId(null); } });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 - i);

  const breakdown = useMemo(() => {
    if (!detail?.breakdownData) return { income: [], expense: [] };
    try {
      const data = JSON.parse(detail.breakdownData as string);
      return {
        income: data.filter((d: any) => d.type === "income"),
        expense: data.filter((d: any) => d.type === "expense"),
      };
    } catch { return { income: [], expense: [] }; }
  }, [detail]);

  const handlePrint = () => { window.print(); };

  if (detailId && detail) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setDetailId(null)} className="mb-2 -ml-2 text-muted-foreground">&larr; 一覧に戻る</Button>
            <h1 className="text-2xl font-bold tracking-tight">{detail.fiscalYear}年 確定申告書</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={detail.filingType === "blue" ? "border-blue-500 text-blue-600" : "border-gray-400 text-gray-600"}>
                {detail.filingType === "blue" ? "青色申告" : "白色申告"}
              </Badge>
              <Badge variant={detail.status === "completed" ? "default" : "secondary"}>
                {detail.status === "completed" ? "完了" : "下書き"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5"><Printer className="h-4 w-4" />印刷</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => { if (confirm("削除しますか？")) deleteMut.mutate({ id: detail.id }); }}><Trash2 className="h-4 w-4" />削除</Button>
          </div>
        </div>
        <div className="page-header-line print:hidden" />

        {/* Print header */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-bold">{detail.fiscalYear}年分 {detail.filingType === "blue" ? "青色申告決算書" : "収支内訳書"}</h1>
          {profile && <p className="text-sm mt-2">{profile.businessName} / {profile.representativeName}</p>}
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "総収入", value: detail.totalIncome, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "総支出", value: detail.totalExpense, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-500/10" },
            { label: "所得金額", value: detail.netIncome, icon: Wallet, color: "text-violet-600", bg: "bg-violet-500/10" },
            { label: detail.filingType === "blue" ? "青色申告特別控除" : "課税所得", value: detail.filingType === "blue" ? detail.specialDeduction : detail.taxableIncome, icon: Sparkles, color: "text-blue-600", bg: "bg-blue-500/10" },
          ].map((kpi, i) => (
            <Card key={i} className="shadow-sm border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
                    <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{formatCurrency(kpi.value)}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {detail.filingType === "blue" && (
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">青色申告特別控除</p>
                  <p className="text-xs text-blue-600 mt-1">所得金額から最大65万円が控除されます。課税所得: {formatCurrency(detail.taxableIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500" />収入の部</CardTitle></CardHeader>
            <CardContent>
              {breakdown.income.length === 0 ? <p className="text-sm text-muted-foreground py-4">収入データなし</p> : (
                <div className="space-y-0.5">
                  {breakdown.income.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-sm">{item.accountName}</span>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2.5 px-3 border-t font-semibold mt-1">
                    <span className="text-sm">合計</span>
                    <span className="text-sm text-emerald-600 tabular-nums">{formatCurrency(detail.totalIncome)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-rose-500" />支出の部</CardTitle></CardHeader>
            <CardContent>
              {breakdown.expense.length === 0 ? <p className="text-sm text-muted-foreground py-4">支出データなし</p> : (
                <div className="space-y-0.5">
                  {breakdown.expense.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-sm">{item.accountName}</span>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2.5 px-3 border-t font-semibold mt-1">
                    <span className="text-sm">合計</span>
                    <span className="text-sm text-rose-600 tabular-nums">{formatCurrency(detail.totalExpense)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">確定申告</h1>
          <p className="text-muted-foreground text-sm mt-1">青色申告・白色申告の書類作成</p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)} className="glow-primary gap-1.5" size="sm"><Plus className="h-4 w-4" />申告書を作成</Button>
      </div>
      <div className="page-header-line" />

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><FileCheck className="h-5 w-5 text-blue-600" /></div>
              <div>
                <h3 className="text-sm font-semibold text-blue-800">青色申告</h3>
                <p className="text-xs text-blue-600/80 mt-1 leading-relaxed">複式簿記による記帳で最大65万円の特別控除。赤字の繰越控除（3年間）や家族への給与の経費算入が可能です。</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200/50 bg-gradient-to-br from-gray-50/50 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-500/10 flex items-center justify-center shrink-0"><Calculator className="h-5 w-5 text-gray-600" /></div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">白色申告</h3>
                <p className="text-xs text-gray-600/80 mt-1 leading-relaxed">簡易な記帳で手軽に申告。特別控除はありませんが、手続きがシンプルで初めての方にも安心です。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filing list */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">申告履歴</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
          ) : !filings || filings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"><FileCheck className="h-6 w-6 text-muted-foreground" /></div>
              <p className="text-base font-medium">確定申告データがありません</p>
              <p className="text-sm text-muted-foreground mt-1">取引データを元に申告書を作成しましょう</p>
              <Button onClick={() => setGenerateDialogOpen(true)} variant="outline" size="sm" className="mt-4 gap-1"><Plus className="h-3.5 w-3.5" />申告書を作成</Button>
            </div>
          ) : (
            <div className="divide-y">
              {filings.map(f => (
                <div key={f.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${f.filingType === "blue" ? "bg-blue-500/10" : "bg-gray-500/10"}`}>
                      <span className={`text-sm font-bold ${f.filingType === "blue" ? "text-blue-600" : "text-gray-600"}`}>{f.fiscalYear}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{f.fiscalYear}年分 確定申告</p>
                        <Badge variant="outline" className={`text-[10px] ${f.filingType === "blue" ? "border-blue-400 text-blue-600" : "border-gray-400 text-gray-600"}`}>
                          {f.filingType === "blue" ? "青色" : "白色"}
                        </Badge>
                        <Badge variant={f.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                          {f.status === "completed" ? "完了" : "下書き"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">所得: {formatCurrency(f.netIncome)} / 課税所得: {formatCurrency(f.taxableIncome)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setDetailId(f.id)}><Eye className="h-3.5 w-3.5" />詳細</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("削除しますか？")) deleteMut.mutate({ id: f.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-lg">確定申告書を作成</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">対象年度</Label>
              <Select value={String(genYear)} onValueChange={v => setGenYear(Number(v))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">申告種別</Label>
              <Select value={genType} onValueChange={v => setGenType(v as "blue" | "white")}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">青色申告（最大65万円控除）</SelectItem>
                  <SelectItem value="white">白色申告（簡易記帳）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              登録済みの取引データを元に、{genYear}年分の{genType === "blue" ? "青色申告決算書" : "収支内訳書"}を自動生成します。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>キャンセル</Button>
            <Button onClick={() => generateMut.mutate({ fiscalYear: genYear, filingType: genType })} disabled={generateMut.isPending} className="glow-primary">
              {generateMut.isPending ? "生成中..." : "生成する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
