import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Sparkles, Zap } from "lucide-react";

export default function Plans() {
  const utils = trpc.useUtils();
  const { data: subscription, isLoading } = trpc.subscription.get.useQuery();

  const updateMut = trpc.subscription.update.useMutation({
    onSuccess: () => { utils.subscription.invalidate(); toast.success("プランを変更しました"); },
    onError: (e) => toast.error(e.message),
  });

  const currentPlan = subscription?.plan || "free";

  const plans = [
    {
      id: "free" as const,
      name: "フリープラン",
      price: "0",
      period: "永久無料",
      description: "個人事業主の基本的な経理管理に",
      icon: Sparkles,
      features: [
        "月間50件までの取引登録",
        "基本的な勘定科目管理",
        "月次収支レポート",
        "請求書作成（月5件まで）",
        "ダッシュボード閲覧",
      ],
      limitations: [
        "年次レポートは非対応",
        "PDF出力は非対応",
        "メールサポートなし",
      ],
    },
    {
      id: "premium" as const,
      name: "プレミアムプラン",
      price: "1,980",
      period: "月額（税込）",
      description: "本格的な経理管理を求める方に",
      icon: Zap,
      features: [
        "取引登録 無制限",
        "高度な勘定科目カスタマイズ",
        "月次・年次レポート",
        "損益計算書の自動生成",
        "請求書作成 無制限",
        "PDF出力対応",
        "科目別集計・分析",
        "優先メールサポート",
        "データエクスポート",
      ],
      limitations: [],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight">料金プラン</h1>
        <p className="text-muted-foreground text-sm mt-2">
          あなたのビジネスに最適なプランをお選びください
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPremium = plan.id === "premium";

          return (
            <Card
              key={plan.id}
              className={`relative card-hover ${isPremium ? "border-primary shadow-lg shadow-primary/5" : ""}`}
            >
              {isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs">
                    おすすめ
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className={`h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isPremium ? "bg-primary/10" : "bg-muted"}`}>
                  <plan.icon className={`h-6 w-6 ${isPremium ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm text-muted-foreground">¥</span>
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.period}</p>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPremium ? "bg-primary/10" : "bg-emerald-500/10"}`}>
                        <Check className={`h-3 w-3 ${isPremium ? "text-primary" : "text-emerald-600"}`} />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation, i) => (
                    <div key={i} className="flex items-start gap-3 opacity-50">
                      <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-muted">
                        <span className="text-xs text-muted-foreground">-</span>
                      </div>
                      <span className="text-sm line-through">{limitation}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full ${isPremium && !isCurrent ? "" : ""}`}
                  variant={isCurrent ? "outline" : isPremium ? "default" : "outline"}
                  disabled={isCurrent || updateMut.isPending}
                  onClick={() => {
                    if (!isCurrent) {
                      toast.info("プラン変更機能は近日公開予定です");
                    }
                  }}
                >
                  {isCurrent ? "現在のプラン" : isPremium ? "プレミアムにアップグレード" : "フリープランに変更"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Table */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-base text-center">プラン比較表</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 text-sm font-medium">機能</th>
                <th className="text-center py-3 text-sm font-medium w-32">フリー</th>
                <th className="text-center py-3 text-sm font-medium w-32">プレミアム</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["取引登録", "月50件", "無制限"],
                ["勘定科目管理", "基本", "カスタム対応"],
                ["ダッシュボード", "○", "○"],
                ["月次レポート", "○", "○"],
                ["年次レポート", "×", "○"],
                ["損益計算書", "×", "○"],
                ["請求書作成", "月5件", "無制限"],
                ["PDF出力", "×", "○"],
                ["科目別集計", "×", "○"],
                ["データエクスポート", "×", "○"],
                ["メールサポート", "×", "優先対応"],
              ].map(([feature, free, premium], i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 text-sm">{feature}</td>
                  <td className="py-3 text-sm text-center text-muted-foreground">{free}</td>
                  <td className="py-3 text-sm text-center font-medium">{premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
