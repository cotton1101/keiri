import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const [debouncedSearch] = useState(() => search);
  const searchTerm = useMemo(() => search, [search]);

  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({
    limit,
    offset: page * limit,
    search: searchTerm || undefined,
  });

  const updateRole = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("ロールを更新しました");
      refetch();
    },
    onError: () => toast.error("ロール更新に失敗しました"),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
        </div>
        <p className="text-muted-foreground text-sm">登録ユーザーの一覧表示とロール管理</p>
        <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-3" />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-lg">ユーザー一覧 ({data?.total ?? 0}件)</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="名前・メールで検索..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">名前</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">メール</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ロール</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">登録日</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">最終ログイン</th>
                  <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="py-3 pr-4"><div className="h-4 bg-muted animate-pulse rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      ユーザーが見つかりません
                    </td>
                  </tr>
                ) : (
                  data?.items.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 text-sm font-mono text-muted-foreground">#{user.id}</td>
                      <td className="py-3 pr-4 text-sm font-medium">{user.name || "-"}</td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">{user.email || "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {user.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                          {user.role === "admin" ? "管理者" : "ユーザー"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {new Date(user.lastSignedIn).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3">
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
