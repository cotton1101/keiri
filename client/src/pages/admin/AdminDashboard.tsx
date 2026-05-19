import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, FileText, ArrowLeftRight, TrendingUp, Shield, Receipt, Activity } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  const [, setLocation] = useLocation();

  const monthlyRevenue = (stats?.premiumUsers ?? 0) * 1280;
  const annualRevenue = monthlyRevenue * 12;
  const conversionRate = stats && stats.totalUsers > 0
    ? Math.round((stats.premiumUsers / stats.totalUsers) * 100)
    : 0;
  const avgTxnPerUser = stats && stats.totalUsers > 0
    ? Math.round(stats.totalTransactions / stats.totalUsers)
    : 0;

  const statCards = [
    { label: "総ユーザー数", value: stats?.totalUsers ?? 0, icon: Users, color: "from-blue-500 to-blue-600", path: "/admin/users" },
    { label: "プレミアムユーザー", value: stats?.premiumUsers ?? 0, icon: Crown, color: "from-amber-500 to-orange-500", path: "/admin/subscriptions" },
    { label: "無料ユーザー", value: stats?.freeUsers ?? 0, icon: Users, color: "from-slate-400 to-slate-500", path: "/admin/users" },
    { label: "総取引数", value: stats?.totalTransactions ?? 0, icon: ArrowLeftRight, color: "from-emerald-500 to-green-600", path: null },
    { label: "総請求書数", value: stats?.totalInvoices ?? 0, icon: FileText, color: "from-violet-500 to-purple-600", path: null },
    { label: "月間売上", value: `¥${monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: "from-pink-500 to-rose-600", path: "/admin/subscriptions" },
  ];

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">管理者ダッシュボード</h1>
            <p className="text-muted-foreground text-sm">サービス全体の統計・管理</p>
          </div>
        </div>
      </div>
      <div className="page-header-line" />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bento-card p-5 ${card.path ? "cursor-pointer" : ""}`}
            onClick={() => card.path && setLocation(card.path)}
          >
            <div className="bento-shine" />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-extrabold mt-2 tabular-nums">
                  {isLoading ? (
                    <span className="inline-block h-8 w-20 shimmer rounded" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics & Quick Actions */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="icon-box icon-box-violet h-8 w-8">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold">サービス指標</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2.5 border-b">
                <span className="text-sm text-muted-foreground">コンバージョン率</span>
                <span className="font-bold text-lg">{conversionRate}%</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b">
                <span className="text-sm text-muted-foreground">平均取引数/ユーザー</span>
                <span className="font-bold text-lg">{avgTxnPerUser}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b">
                <span className="text-sm text-muted-foreground">月間売上</span>
                <span className="font-bold text-lg text-emerald-600">¥{monthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-muted-foreground">年間推定売上</span>
                <span className="font-extrabold text-lg text-primary">¥{annualRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="icon-box icon-box-amber h-8 w-8">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold">クイックアクション</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setLocation("/admin/users")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border hover:bg-accent/50 transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">ユーザー管理</p>
                  <p className="text-xs text-muted-foreground">一覧表示・ロール変更・削除</p>
                </div>
              </button>
              <button
                onClick={() => setLocation("/admin/subscriptions")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border hover:bg-accent/50 transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Crown className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">課金・サブスク管理</p>
                  <p className="text-xs text-muted-foreground">プラン変更・Stripe連携状況</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
