import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Sparkles, Zap, X, Shield, Clock, BarChart3, FileText, Download, Headphones } from "lucide-react";

export default function Plans() {
  const utils = trpc.useUtils();
  const { data: subscription } = trpc.subscription.get.useQuery();
  const updateMut = trpc.subscription.update.useMutation({ onSuccess: () => { utils.subscription.invalidate(); toast.success("プランを変更しました"); } });
  const currentPlan = subscription?.plan || "free";

  const plans = [
    {
      id: "free" as const, name: "フリー", price: "0", period: "永久無料",
      desc: "まずは無料で始めたい方に", icon: Sparkles, color: "emerald",
      features: [
        { text: "月間50件までの取引登録", included: true },
        { text: "基本的な勘定科目管理", included: true },
        { text: "月次収支レポート", included: true },
        { text: "ダッシュボード閲覧", included: true },
        { text: "請求書作成（月5件まで）", included: true },
        { text: "年次レポート・損益計算書", included: false },
        { text: "確定申告書類作成", included: false },
        { text: "データインポート", included: false },
        { text: "PDF出力", included: false },
      ],
    },
    {
      id: "premium" as const, name: "プレミアム", price: "980", period: "/月（税込）",
      desc: "本格的な経理管理を求める方に", icon: Zap, color: "violet",
      features: [
        { text: "取引登録 無制限", included: true },
        { text: "高度な勘定科目カスタマイズ", included: true },
        { text: "月次・年次レポート", included: true },
        { text: "損益計算書の自動生成", included: true },
        { text: "請求書作成 無制限", included: true },
        { text: "確定申告書類作成（青色・白色）", included: true },
        { text: "他社データインポート", included: true },
        { text: "固定費・定期取引管理", included: true },
        { text: "PDF出力・データエクスポート", included: true },
        { text: "優先メールサポート", included: true },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="outline" className="mb-4 text-xs px-3 py-1">シンプルな料金体系</Badge>
        <h1 className="text-3xl font-bold tracking-tight">あなたに合ったプランを</h1>
        <p className="text-muted-foreground mt-2">業界最安値クラスの月額980円で、確定申告まで完結。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const isPremium = plan.id === "premium";
          return (
            <Card key={plan.id} className={`relative shadow-sm transition-all ${isPremium ? "ring-2 ring-primary shadow-lg shadow-primary/5" : "hover:shadow-md"}`}>
              {isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-sm">一番人気</Badge>
                </div>
              )}
              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isPremium ? "bg-primary/10" : "bg-emerald-500/10"}`}>
                    <plan.icon className={`h-5 w-5 ${isPremium ? "text-primary" : "text-emerald-600"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-sm text-muted-foreground">¥</span>
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pb-6">
                <Button
                  className={`w-full h-11 font-semibold ${isPremium && !isCurrent ? "glow-primary" : ""}`}
                  variant={isCurrent ? "outline" : isPremium ? "default" : "outline"}
                  disabled={isCurrent || updateMut.isPending}
                  onClick={() => { if (!isCurrent) toast.info("プラン変更機能は近日公開予定です"); }}
                >
                  {isCurrent ? "現在のプラン" : isPremium ? "プレミアムにアップグレード" : "フリープランに変更"}
                </Button>
                <div className="space-y-2.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className={`flex items-start gap-2.5 ${!f.included ? "opacity-40" : ""}`}>
                      {f.included ? (
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPremium ? "bg-primary/10" : "bg-emerald-500/10"}`}>
                          <Check className={`h-3 w-3 ${isPremium ? "text-primary" : "text-emerald-600"}`} />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-muted"><X className="h-3 w-3 text-muted-foreground" /></div>
                      )}
                      <span className={`text-sm ${f.included ? "" : "line-through"}`}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Table */}
      <Card className="max-w-4xl mx-auto shadow-sm">
        <CardHeader className="pb-0"><CardTitle className="text-base font-semibold text-center">プラン比較表</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b">
                <th className="text-left py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">機能</th>
                <th className="text-center py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">フリー</th>
                <th className="text-center py-3 text-xs font-semibold text-primary uppercase tracking-wider w-28">プレミアム</th>
              </tr></thead>
              <tbody>
                {[
                  ["取引登録", "月50件", "無制限"], ["勘定科目管理", "基本", "カスタム対応"],
                  ["ダッシュボード", "check", "check"], ["月次レポート", "check", "check"],
                  ["年次レポート", "x", "check"], ["損益計算書", "x", "check"],
                  ["確定申告（青色・白色）", "x", "check"], ["請求書作成", "月5件", "無制限"],
                  ["データインポート", "x", "check"], ["固定費管理", "x", "check"],
                  ["PDF出力", "x", "check"], ["データエクスポート", "x", "check"],
                  ["メールサポート", "x", "優先対応"],
                ].map(([feature, free, premium], i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 text-sm">{feature}</td>
                    <td className="py-3 text-center">{free === "check" ? <Check className="h-4 w-4 text-emerald-600 mx-auto" /> : free === "x" ? <X className="h-4 w-4 text-muted-foreground/40 mx-auto" /> : <span className="text-sm text-muted-foreground">{free}</span>}</td>
                    <td className="py-3 text-center">{premium === "check" ? <Check className="h-4 w-4 text-primary mx-auto" /> : premium === "x" ? <X className="h-4 w-4 text-muted-foreground/40 mx-auto" /> : <span className="text-sm font-medium">{premium}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trust indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {[
          { icon: Shield, title: "安心のセキュリティ", desc: "SSL暗号化通信でデータを保護" },
          { icon: Clock, title: "いつでも解約OK", desc: "契約期間の縛りなし" },
          { icon: Headphones, title: "充実のサポート", desc: "プレミアムは優先対応" },
        ].map((item, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><item.icon className="h-4 w-4 text-muted-foreground" /></div>
              <div><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
