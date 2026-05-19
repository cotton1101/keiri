import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Search, Shield, ChevronLeft, ChevronRight, Trash2, Crown } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const limit = 20;

  const searchTerm = useMemo(() => search, [search]);

  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({
    limit,
    offset: page * limit,
    search: searchTerm || undefined,
  });

  const updateRole = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => { toast.success("ロールを更新しました"); refetch(); utils.admin.stats.invalidate(); },
    onError: () => toast.error("ロール更新に失敗しました"),
  });

  const deleteUser = trpc.admin.users2.delete.useMutation({
    onSuccess: () => { toast.success("ユーザーを削除しました"); setDeleteTarget(null); refetch(); utils.admin.stats.invalidate(); },
    onError: () => toast.error("削除に失敗しました"),
  });

  const updatePlan = trpc.admin.subscriptions.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("プランを変更しました");
      // Force refetch the users list so plan change is immediately visible
      refetch();
      utils.admin.stats.invalidate();
      utils.admin.subscriptions.invalidate();
    },
    onError: () => toast.error("プラン変更に失敗しました"),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
            <p className="text-muted-foreground text-sm">登録ユーザーの一覧・ロール管理・プラン変更</p>
          </div>
        </div>
      </div>
      <div className="page-header-line" />

      <div className="bento-card overflow-hidden">
        <div className="bento-shine" />
        <div className="px-5 pt-5 pb-4 relative">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <h3 className="text-sm font-bold">ユーザー一覧 ({data?.total ?? 0}件)</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="名前・メールで検索..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-10 h-9"
              />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 relative">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">名前</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">メール</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ロール</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">プラン</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">登録日</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">最終ログイン</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-3 pr-4"><div className="h-4 shimmer rounded w-16" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      ユーザーが見つかりません
                    </td>
                  </tr>
                ) : (
                  data?.items.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 font-mono text-muted-foreground">#{user.id}</td>
                      <td className="py-3 pr-4 font-medium">{user.name || "-"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{user.email || "-"}</td>
                      <td className="py-3 pr-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateRole.mutate({ userId: user.id, role: value as "user" | "admin" })}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">ユーザー</SelectItem>
                            <SelectItem value="admin">管理者</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pr-4">
                        <Select
                          value={(user as any).plan || "free"}
                          onValueChange={(value) => {
                            updatePlan.mutate({ userId: user.id, plan: value as "free" | "premium" });
                          }}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <Crown className={`h-3 w-3 mr-1 ${(user as any).plan === "premium" ? "text-amber-500" : "text-muted-foreground"}`} />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">無料プラン</SelectItem>
                            <SelectItem value="premium">プレミアム</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(user.lastSignedIn).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: user.id, name: user.name || user.email || `#${user.id}` })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg">ユーザーを削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span> を削除しますか？
            このユーザーの全データ（取引、請求書、設定等）も完全に削除されます。この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteUser.mutate({ userId: deleteTarget.id })}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
