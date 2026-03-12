import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, TrendingUp, Wallet, Building, Heart, PiggyBank, Info } from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const currentYear = new Date().getFullYear();

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

export default function TaxSimulator() {
  const [year, setYear] = useState(currentYear);
  const [filingType, setFilingType] = useState<"blue" | "white">("blue");

  const { data, isLoading } = trpc.taxFiling.simulate.useQuery({ year, filingType });

  const taxItems = useMemo(() => {
    if (!data) return [];
    return [
      { label: "所得税", value: data.incomeTax, icon: Wallet, color: "text-red-600", description: `税率 ${data.taxRate}%` },
      { label: "住民税（概算）", value: data.residentTax, icon: Building, color: "text-orange-600", description: "一律10%" },
      { label: "個人事業税（概算）", value: data.businessTax, icon: PiggyBank, color: "text-amber-600", description: "事業所得290万超の5%" },
      { label: "国民健康保険料（概算）", value: data.healthInsurance, icon: Heart, color: "text-pink-600", description: "所得割+均等割" },
    ];
  }, [data]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">税金シミュレーション</h1>
        </div>
        <p className="text-muted-foreground text-sm">現在の取引データに基づいて、税金の概算額をリアルタイムで確認できます</p>
        <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-3" />
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filingType} onValueChange={(v) => setFilingType(v as "blue" | "white")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blue">青色申告</SelectItem>
            <SelectItem value="white">白色申告</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* 収支サマリー */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">総収入</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatYen(data.totalIncome)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">総経費</p>
                    <p className="text-2xl font-bold text-red-600">{formatYen(data.totalExpense)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">事業所得</p>
                    <p className="text-2xl font-bold text-blue-600">{formatYen(data.netIncome)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 控除計算 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                所得控除の計算
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>事業所得から各種控除を差し引いた金額が課税所得になります</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">事業所得</span>
                  <span className="font-semibold">{formatYen(data.netIncome)}</span>
                </div>
                {data.specialDeduction > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm flex items-center gap-2">
                      青色申告特別控除
                      <Badge variant="secondary" className="text-xs">最大65万円</Badge>
                    </span>
                    <span className="font-semibold text-emerald-600">-{formatYen(data.specialDeduction)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm flex items-center gap-2">
                    基礎控除
                    <Badge variant="secondary" className="text-xs">48万円</Badge>
                  </span>
                  <span className="font-semibold text-emerald-600">-{formatYen(data.basicDeduction)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-muted/50 rounded-lg px-3">
                  <span className="font-medium">課税所得</span>
                  <span className="text-xl font-bold text-primary">{formatYen(data.taxableIncome)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 税金の内訳 */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {taxItems.map((item) => (
              <Card key={item.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <p className={`text-xl font-bold ${item.color}`}>{formatYen(item.value)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 合計 */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold">年間税負担合計（概算）</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    所得税 + 住民税 + 個人事業税の合計（国民健康保険料は含みません）
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-primary">{formatYen(data.totalTax)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    実効税率: <span className="font-semibold text-primary">{data.effectiveRate}%</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 注意事項 */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 space-y-1">
                  <p className="font-medium">概算値についてのご注意</p>
                  <p>この計算は簡易的な概算です。実際の税額は、社会保険料控除、医療費控除、扶養控除など各種控除の適用により異なります。正確な税額は税理士にご相談ください。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
