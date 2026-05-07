import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingDown, TrendingUp, Wallet, Building, Heart, PiggyBank, Info, Briefcase, Receipt, ArrowDownToLine } from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const currentYear = new Date().getFullYear();

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

export default function TaxSimulator() {
  const [year, setYear] = useState(currentYear);
  const [filingType, setFilingType] = useState<"blue" | "white">("blue");
  const [workStyle, setWorkStyle] = useState<"sole_proprietor" | "side_business">("sole_proprietor");
  const [salaryInput, setSalaryInput] = useState("");
  const [withholdingInput, setWithholdingInput] = useState("");

  const salaryIncome = Math.max(0, Math.floor(Number(salaryInput) * 10000) || 0);
  const withholdingTax = Math.max(0, Math.floor(Number(withholdingInput)) || 0);
  const isSideBusiness = workStyle === "side_business";

  const { data, isLoading } = trpc.taxFiling.simulate.useQuery({
    year,
    filingType,
    workStyle,
    salaryIncome,
    withholdingTax,
  });

  const taxItems = useMemo(() => {
    if (!data) return [];
    const items = [
      { label: "所得税", value: data.incomeTax, icon: Wallet, color: "text-red-600", description: `税率 ${data.taxRate}%` },
      { label: "住民税（概算）", value: data.residentTax, icon: Building, color: "text-orange-600", description: "一律10%" },
      { label: "個人事業税（概算）", value: data.businessTax, icon: PiggyBank, color: "text-amber-600", description: "事業所得290万超の5%" },
    ];
    if (!isSideBusiness) {
      items.push({ label: "国民健康保険料（概算）", value: data.healthInsurance, icon: Heart, color: "text-pink-600", description: "所得割+均等割" });
    }
    return items;
  }, [data, isSideBusiness]);

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

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">対象年</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">申告種別</Label>
          <Select value={filingType} onValueChange={(v) => setFilingType(v as "blue" | "white")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blue">青色申告</SelectItem>
              <SelectItem value="white">白色申告</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">就業形態</Label>
          <Select value={workStyle} onValueChange={(v) => setWorkStyle(v as "sole_proprietor" | "side_business")}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sole_proprietor">専業 個人事業主</SelectItem>
              <SelectItem value="side_business">会社員 + 副業</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isSideBusiness && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">給与収入（年収・万円）</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="例: 500"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  className="w-36"
                  min={0}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">万円</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                源泉徴収税額（円）
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>給与明細・源泉徴収票に記載されている、すでに天引きされている所得税の年間合計額を入力してください。確定申告で精算されます。</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="例: 30000"
                  value={withholdingInput}
                  onChange={(e) => setWithholdingInput(e.target.value)}
                  className="w-40"
                  min={0}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">円</span>
              </div>
            </div>
          </>
        )}
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
          <div className={`grid gap-4 grid-cols-1 ${isSideBusiness ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            {isSideBusiness && (
              <Card className="border-l-4 border-l-indigo-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">給与収入</p>
                      <p className="text-2xl font-bold text-indigo-600">{formatYen(data.salaryIncome)}</p>
                      <p className="text-xs text-muted-foreground">給与所得: {formatYen(data.salaryNetIncome)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{isSideBusiness ? "副業収入" : "総収入"}</p>
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
                    <p className="text-sm text-muted-foreground">{isSideBusiness ? "副業経費" : "総経費"}</p>
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
                    <p>{isSideBusiness
                      ? "給与所得と事業所得を合算し、各種控除を差し引いた金額が課税所得になります"
                      : "事業所得から各種控除を差し引いた金額が課税所得になります"
                    }</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isSideBusiness && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm flex items-center gap-2">
                        給与収入
                      </span>
                      <span className="font-semibold">{formatYen(data.salaryIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm flex items-center gap-2">
                        給与所得控除
                        <Badge variant="secondary" className="text-xs">最大195万円</Badge>
                      </span>
                      <span className="font-semibold text-emerald-600">-{formatYen(data.salaryDeduction)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">給与所得</span>
                      <span className="font-semibold">{formatYen(data.salaryNetIncome)}</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                  </>
                )}
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

          {/* 副業会社員の社会保険の説明 */}
          {isSideBusiness && (
            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <Heart className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-800 space-y-1">
                    <p className="font-medium">社会保険について</p>
                    <p>会社員の場合、健康保険・厚生年金は会社の給与から天引きされるため、副業の事業所得に対して国民健康保険料はかかりません。社会保険料は給与明細をご確認ください。</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* 源泉徴収との精算 */}
          {data.withholdingTax > 0 && (
            <Card className={`border-2 ${data.refundAmount > 0 ? "border-emerald-300 bg-emerald-50/50" : "border-blue-300 bg-blue-50/50"}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className={`h-5 w-5 ${data.refundAmount > 0 ? "text-emerald-600" : "text-blue-600"}`} />
                  源泉徴収との精算（所得税）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm">確定申告での所得税額</span>
                  <span className="font-semibold">{formatYen(data.incomeTax)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm flex items-center gap-2">
                    源泉徴収済みの所得税
                    <Badge variant="secondary" className="text-xs">給与から天引き</Badge>
                  </span>
                  <span className="font-semibold text-emerald-600">-{formatYen(data.withholdingTax)}</span>
                </div>
                <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${data.refundAmount > 0 ? "bg-emerald-100" : "bg-blue-100"}`}>
                  <span className="font-medium flex items-center gap-2">
                    {data.refundAmount > 0 ? (
                      <><ArrowDownToLine className="h-4 w-4 text-emerald-600" />還付見込額</>
                    ) : (
                      <>追加納付額</>
                    )}
                  </span>
                  <span className={`text-2xl font-bold ${data.refundAmount > 0 ? "text-emerald-700" : "text-blue-700"}`}>
                    {data.refundAmount > 0 ? formatYen(data.refundAmount) : formatYen(Math.max(0, data.incomeTaxBalance))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 合計 */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold">年間税負担合計（概算）</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.withholdingTax > 0 ? "差引納付額の所得税" : "所得税"} + 住民税 + 個人事業税の合計{!isSideBusiness && "（国民健康保険料は含みません）"}
                  </p>
                  {isSideBusiness && data.withholdingTax === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ※ 給与から源泉徴収済みの所得税がある場合は、上の入力欄に金額を入れると精算後の額を表示します。
                    </p>
                  )}
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
                  <p>この計算は簡易的な概算です。実際の税額は、社会保険料控除、医療費控除、扶養控除、配偶者控除など各種控除の適用により異なります。
                  {isSideBusiness && "また、給与から既に源泉徴収されている税額との差額が、確定申告での追加納付額（または還付額）になります。"}
                  正確な税額は税理士にご相談ください。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
