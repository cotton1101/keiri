import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, ArrowUpRight, ArrowDownRight, Calculator, Building2, Info } from "lucide-react";
import { useState } from "react";

const INDUSTRY_LABELS: Record<number, string> = {
  1: "第1種（卸売業）90%",
  2: "第2種（小売業）80%",
  3: "第3種（製造業等）70%",
  4: "第4種（その他）60%",
  5: "第5種（サービス業等）50%",
  6: "第6種（不動産業）40%",
};

export default function ConsumptionTax() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [method, setMethod] = useState<"standard" | "simplified">("standard");
  const [industry, setIndustry] = useState(5);

  const { data: profile } = trpc.businessProfile.get.useQuery();
  const { data, isLoading } = trpc.consumptionTax.calculate.useQuery(
    { fiscalYear: year, method, industryType: industry },
  );

  // Load from profile if available
  const effectiveMethod = profile?.consumptionTaxMethod === "exempt" ? method : (profile?.consumptionTaxMethod as "standard" | "simplified") ?? method;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6 max-w-[1000px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">消費税</h1>
          <p className="text-muted-foreground text-sm mt-1">消費税の集計・申告データ</p>
        </div>
      </div>
      <div className="page-header-line" />

      {/* Controls */}
      <div className="bento-card p-5">
        <div className="bento-shine" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">対象年度</Label>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">課税方式</Label>
            <Select value={method} onValueChange={(v: "standard" | "simplified") => setMethod(v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">本則課税</SelectItem>
                <SelectItem value="simplified">簡易課税</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {method === "simplified" && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">事業区分</Label>
              <Select value={String(industry)} onValueChange={v => setIndustry(Number(v))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INDUSTRY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Info banner */}
      {profile?.consumptionTaxMethod === "exempt" && (
        <div className="bento-card p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">免税事業者に設定されています</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              設定画面で課税事業者に変更するとインボイス制度に対応できます。ここではシミュレーションとして表示しています。
            </p>
          </div>
        </div>
      )}

      {/* Invoice registration */}
      {profile?.taxId && (
        <div className="bento-card p-4 flex items-center gap-3">
          <div className="bento-shine" />
          <div className="icon-box icon-box-violet h-9 w-9">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="relative">
            <p className="text-xs text-muted-foreground">インボイス登録番号</p>
            <p className="text-sm font-bold font-mono">{profile.taxId}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 shimmer rounded-xl" />)}
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-in">
            <div className="bento-card p-5">
              <div className="bento-shine" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">売上消費税</p>
                  <p className="text-2xl font-extrabold mt-2 tabular-nums">{formatCurrency(data.totalSalesTax)}</p>
                  <p className="text-xs text-muted-foreground mt-1">課税売上 {formatCurrency(data.totalSalesAmount)}</p>
                </div>
                <div className="icon-box icon-box-emerald">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bento-card p-5">
              <div className="bento-shine" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {method === "simplified" ? "みなし仕入税額" : "仕入消費税"}
                  </p>
                  <p className="text-2xl font-extrabold mt-2 tabular-nums">
                    {formatCurrency(method === "simplified" ? data.deemedPurchaseTax : data.totalPurchaseTax)}
                  </p>
                  {method === "simplified" ? (
                    <p className="text-xs text-muted-foreground mt-1">みなし仕入率 {INDUSTRY_LABELS[industry]?.match(/\d+%/)?.[0]}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">課税仕入 {formatCurrency(data.totalPurchaseAmount)}</p>
                  )}
                </div>
                <div className="icon-box icon-box-rose">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bento-card p-5">
              <div className="bento-shine" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {data.isRefund ? "還付額" : "納付税額"}
                  </p>
                  <p className={`text-2xl font-extrabold mt-2 tabular-nums ${data.isRefund ? "text-emerald-600" : ""}`}>
                    {data.isRefund ? "△ " : ""}{formatCurrency(data.taxPayable)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.isRefund ? "還付を受けられます" : "納付が必要です"}
                  </p>
                </div>
                <div className="icon-box icon-box-violet">
                  <Calculator className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bento-card overflow-hidden">
            <div className="bento-shine" />
            <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
              <div className="icon-box icon-box-amber h-8 w-8">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold">税率別内訳</h3>
            </div>
            <div className="px-5 pb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 text-xs font-semibold text-muted-foreground">区分</th>
                    <th className="text-right py-2.5 text-xs font-semibold text-muted-foreground">税抜金額</th>
                    <th className="text-right py-2.5 text-xs font-semibold text-muted-foreground">消費税額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2.5 font-medium">売上（10%）</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.salesAmount10)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold">{formatCurrency(data.salesTax10)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2.5 font-medium">売上（8%軽減）</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.salesAmount8)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold">{formatCurrency(data.salesTax8)}</td>
                  </tr>
                  <tr className="border-b bg-muted/30">
                    <td className="py-2.5 font-medium">売上 免税・非課税</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.salesExempt)}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">-</td>
                  </tr>
                  {method === "standard" && (
                    <>
                      <tr className="border-b">
                        <td className="py-2.5 font-medium">仕入（10%）</td>
                        <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.purchaseAmount10)}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">{formatCurrency(data.purchaseTax10)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2.5 font-medium">仕入（8%軽減）</td>
                        <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.purchaseAmount8)}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">{formatCurrency(data.purchaseTax8)}</td>
                      </tr>
                      <tr className="bg-muted/30">
                        <td className="py-2.5 font-medium">仕入 免税・非課税</td>
                        <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.purchaseExempt)}</td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">-</td>
                      </tr>
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td className="py-3 font-bold">{data.isRefund ? "還付税額" : "納付税額"}</td>
                    <td />
                    <td className={`py-3 text-right text-lg font-extrabold tabular-nums ${data.isRefund ? "text-emerald-600" : ""}`}>
                      {data.isRefund ? "△ " : ""}{formatCurrency(data.taxPayable)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Calculation method explanation */}
          <div className="bento-card p-5">
            <div className="bento-shine" />
            <div className="relative">
              <h3 className="text-sm font-bold mb-3">計算方法</h3>
              {method === "standard" ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>本則課税では、売上にかかる消費税額から仕入にかかる消費税額を差し引いて納付税額を算出します。</p>
                  <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                    納付税額 = 売上消費税({formatCurrency(data.totalSalesTax)}) − 仕入消費税({formatCurrency(data.totalPurchaseTax)}) = <span className="font-bold text-foreground">{formatCurrency(data.taxPayable)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>簡易課税では、売上にかかる消費税額にみなし仕入率を乗じて仕入税額を算出します。実際の仕入税額は使用しません。</p>
                  <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                    みなし仕入税額 = 売上消費税({formatCurrency(data.totalSalesTax)}) × みなし仕入率({INDUSTRY_LABELS[industry]?.match(/\d+%/)?.[0]}) = {formatCurrency(data.deemedPurchaseTax)}<br />
                    納付税額 = {formatCurrency(data.totalSalesTax)} − {formatCurrency(data.deemedPurchaseTax)} = <span className="font-bold text-foreground">{formatCurrency(data.taxPayable)}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                ※ この計算は概算です。正確な申告には税理士にご相談ください。対象取引数: {data.transactionCount}件
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
