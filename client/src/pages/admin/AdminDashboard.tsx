import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, FileText, ArrowLeftRight, TrendingUp, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  const [, setLocation] = useLocation();

  const statCards = [
    { label: "総ユーザー数", value: stats?.totalUsers ?? 0, icon: Users, color: "from-blue-500 to-blue-600", path: "/admin/users" },
    { label: "プレミアムユーザー", value: stats?.premiumUsers ?? 0, icon: Crown, color: "from-amber-500 to-orange-500", path: "/admin/subscriptions" },
    { label: "無料ユーザー", value: stats?.freeUsers ?? 0, icon: Users, color: "from-slate-400 to-slate-500", path: "/admin/subscriptions" },
    { label: "総取引数", value: stats?.totalTransactions ?? 0, icon: ArrowLeftRight, color: "from-emerald-500 to-green-600", path: null },
    { label: "総請求書数", value: stats?.totalInvoices ?? 0, icon: FileText, color: "from-violet-500 to-purple-600", path: null },
    { label: "月間推定売上", value: `¥${((stats?.premiumUsers ?? 0) * 1980).toLocaleString()}`, icon: TrendingUp, color: "from-pink-500 to-rose-600", path: null },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">管理者ダッシュボード</h1>
        </div>
        <p className="text-muted-foreground text-sm">サービス全体の統計情報を確認できます</p>
        <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-3" />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className={`overflow-hidden transition-all hover:shadow-lg ${card.path ? "cursor-pointer hover:-translate-y-0.5" : ""}`}
            onClick={() => card.path && setLocation(card.path)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-3xl font-bold tracking-tight mt-2">
                    {isLoading ? (
                      <span className="inline-block h-8 w-20 bg-muted animate-pulse rounded" />
                    ) : (
                      card.value
                    )}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setLocation("/admin/users")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
            >
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-sm">ユーザー管理</p>
                <p className="text-xs text-muted-foreground">ユーザーの一覧表示、ロール変更</p>
              </div>
            </button>
            <button
              onClick={() => setLocation("/admin/subscriptions")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
            >
              <Crown className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-sm">サブスクリプション管理</p>
                <p className="text-xs text-muted-foreground">プラン別ユーザー数、契約状況の確認</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">サービス情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">プレミアム月額</span>
                <span className="font-semibold">¥1,980</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">コンバージョン率</span>
                <span className="font-semibold">
                  {stats && stats.totalUsers > 0
                    ? `${Math.round((stats.premiumUsers / stats.totalUsers) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">平均取引数/ユーザー</span>
                <span className="font-semibold">
                  {stats && stats.totalUsers > 0
                    ? Math.round(stats.totalTransactions / stats.totalUsers)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">年間推定売上</span>
                <span className="font-bold text-primary">
                  ¥{((stats?.premiumUsers ?? 0) * 1980 * 12).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
