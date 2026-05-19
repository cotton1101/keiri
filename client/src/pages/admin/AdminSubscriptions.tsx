import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, ChevronLeft, ChevronRight, TrendingUp, Users, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSubscriptions() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.admin.subscriptions.list.useQuery({
    limit,
    offset: page * limit,
  });
  const { data: stats } = trpc.admin.stats.useQuery();

  const updatePlan = trpc.admin.subscriptions.updatePlan.useMutation({
    onSuccess: () => { toast.success("プランを変更しました"); refetch(); utils.admin.stats.invalidate(); },
    onError: () => toast.error("プラン変更に失敗しました"),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const premiumCount = stats?.premiumUsers ?? 0;
  const monthlyRevenue = premiumCount * 1280;

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">課金・サブスクリプション管理</h1>
            <p className="text-muted-foreground text-sm">ユーザーのプラン契約状況の確認と変更</p>
          </div>
        </div>
      </div>
      <div className="page-header-line" />

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 stagger-in">
        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">総契約数</p>
              <p className="text-2xl font-extrabold mt-2 tabular-nums">{data?.total ?? 0}</p>
            </div>
            <div className="icon-box icon-box-sky">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">プレミアム</p>
              <p className="text-2xl font-extrabold mt-2 tabular-nums text-amber-600">{premiumCount}</p>
            </div>
            <div className="icon-box icon-box-amber">
              <Crown className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="bento-card p-5">
          <div className="bento-shine" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">月間売上</p>
              <p className="text-2xl font-extrabold mt-2 tabular-nums text-emerald-600">¥{monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">年間 ¥{(monthlyRevenue * 12).toLocaleString()}</p>
            </div>
            <div className="icon-box icon-box-emerald">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Table */}
      <div className="bento-card overflow-hidden">
        <div className="bento-shine" />
        <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
          <div className="icon-box icon-box-violet h-8 w-8">
            <CreditCard className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold">契約一覧</h3>
        </div>
        <div className="px-5 pb-5 relative">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ユーザー</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">メール</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">プラン</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stripeステータス</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">開始日</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-3 pr-4"><div className="h-4 shimmer rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      サブスクリプションデータがありません
                    </td>
                  </tr>
                ) : (
                  data?.items.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{(sub.userName || "?").charAt(0)}</span>
                          </div>
                          <span className="font-medium">{sub.userName || `#${sub.userId}`}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{sub.userEmail || "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={sub.plan === "premium" ? "default" : "secondary"}
                          className={sub.plan === "premium" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" : ""}
                        >
                          {sub.plan === "premium" ? "プレミアム" : "無料"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {sub.stripeStatus ? (
                          <Badge variant={sub.stripeStatus === "active" ? "default" : "secondary"} className="text-xs">
                            {sub.stripeStatus === "active" ? "有効" :
                             sub.stripeStatus === "canceled" ? "解約済" :
                             sub.stripeStatus === "past_due" ? "支払い遅延" :
                             sub.stripeStatus}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString("ja-JP") : "-"}
                      </td>
                      <td className="py-3">
                        <Select
                          value={sub.plan}
                          onValueChange={(value) => updatePlan.mutate({ userId: sub.userId, plan: value as "free" | "premium" })}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">無料プラン</SelectItem>
                            <SelectItem value="premium">プレミアム</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                {page * limit + 1} - {Math.min((page + 1) * limit, data?.total ?? 0)} / {data?.total ?? 0}件
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
