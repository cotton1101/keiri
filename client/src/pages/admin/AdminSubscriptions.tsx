import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function AdminSubscriptions() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.admin.subscriptions.list.useQuery({
    limit,
    offset: page * limit,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Crown className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">サブスクリプション管理</h1>
        </div>
        <p className="text-muted-foreground text-sm">ユーザーのプラン契約状況を確認できます</p>
        <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-3" />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">総契約数</p>
            <p className="text-3xl font-bold mt-1">{data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">プレミアム</p>
            <p className="text-3xl font-bold mt-1 text-amber-600">
              {data?.items.filter(s => s.plan === "premium").length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">月間売上</p>
            <p className="text-3xl font-bold mt-1 text-primary">
              ¥{((data?.items.filter(s => s.plan === "premium").length ?? 0) * 1980).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">契約一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ユーザーID</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ユーザー名</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">プラン</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">開始日</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">終了日</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="py-3 pr-4"><div className="h-4 bg-muted animate-pulse rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      サブスクリプションデータがありません
                    </td>
                  </tr>
                ) : (
                  data?.items.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 text-sm font-mono text-muted-foreground">#{sub.userId}</td>
                      <td className="py-3 pr-4 text-sm font-medium">{sub.userName || "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={sub.plan === "premium" ? "default" : "secondary"}
                          className={sub.plan === "premium" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" : ""}
                        >
                          {sub.plan === "premium" ? "プレミアム" : "無料"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString("ja-JP") : "-"}
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {sub.endDate ? new Date(sub.endDate).toLocaleDateString("ja-JP") : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}
