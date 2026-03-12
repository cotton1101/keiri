import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, fromTimestamp, toTimestamp } from "@/lib/utils-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
} from "lucide-react";
import { useState, useMemo } from "react";

type TxForm = {
  type: "income" | "expense";
  accountId: number;
  amount: string;
  date: string;
  description: string;
  memo: string;
};

const emptyForm: TxForm = {
  type: "expense",
  accountId: 0,
  amount: "",
  date: fromTimestamp(Date.now()),
  description: "",
  memo: "",
};

export default function Transactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TxForm>(emptyForm);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const utils = trpc.useUtils();
  const { data: accountsList } = trpc.accounts.list.useQuery();
  const { data: txData, isLoading } = trpc.transactions.list.useQuery({
    type: filterType === "all" ? undefined : filterType,
    limit,
    offset: page * limit,
  });

  const createMut = trpc.transactions.create.useMutation({
    onSuccess: () => { utils.transactions.invalidate(); utils.dashboard.invalidate(); toast.success("取引を登録しました"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.transactions.update.useMutation({
    onSuccess: () => { utils.transactions.invalidate(); utils.dashboard.invalidate(); toast.success("取引を更新しました"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.transactions.delete.useMutation({
    onSuccess: () => { utils.transactions.invalidate(); utils.dashboard.invalidate(); toast.success("取引を削除しました"); },
    onError: (e) => toast.error(e.message),
  });

  const accountMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (accountsList) for (const a of accountsList) map[a.id] = a.name;
    return map;
  }, [accountsList]);

  const filteredItems = useMemo(() => {
    if (!txData?.items) return [];
    if (!searchQuery) return txData.items;
    const q = searchQuery.toLowerCase();
    return txData.items.filter(
      (tx) =>
        tx.description.toLowerCase().includes(q) ||
        (accountMap[tx.accountId] || "").toLowerCase().includes(q)
    );
  }, [txData?.items, searchQuery, accountMap]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, accountId: accountsList?.[0]?.id ?? 0 });
    setDialogOpen(true);
  }

  function openEdit(tx: any) {
    setEditingId(tx.id);
    setForm({
      type: tx.type,
      accountId: tx.accountId,
      amount: String(tx.amount),
      date: fromTimestamp(tx.date),
      description: tx.description,
      memo: tx.memo || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error("金額を入力してください"); return; }
    if (!form.accountId) { toast.error("勘定科目を選択してください"); return; }
    const data = {
      type: form.type,
      accountId: form.accountId,
      amount: form.amount,
      date: toTimestamp(form.date),
      description: form.description,
      memo: form.memo || undefined,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...data });
    } else {
      createMut.mutate(data);
    }
  }

  const incomeAccounts = accountsList?.filter((a) => a.type === "income") ?? [];
  const expenseAccounts = accountsList?.filter((a) => a.type === "expense") ?? [];
  const relevantAccounts = form.type === "income" ? incomeAccounts : expenseAccounts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">取引管理</h1>
          <p className="text-muted-foreground text-sm mt-1">収入・支出の記録と管理</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          新規取引
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="取引を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="income">収入のみ</SelectItem>
                <SelectItem value="expense">支出のみ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-sm">取引データがありません</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                最初の取引を登録する
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">日付</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">種別</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">勘定科目</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">摘要</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">金額</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="p-3 text-sm">{formatDate(tx.date)}</td>
                        <td className="p-3">
                          <Badge variant={tx.type === "income" ? "default" : "destructive"} className={`text-xs ${tx.type === "income" ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-0" : "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0"}`}>
                            {tx.type === "income" ? "収入" : "支出"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{accountMap[tx.accountId] || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground">{tx.description || "-"}</td>
                        <td className={`p-3 text-sm text-right font-semibold tabular-nums ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("この取引を削除しますか？")) deleteMut.mutate({ id: tx.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="md:hidden divide-y">
                {filteredItems.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || accountMap[tx.accountId] || "取引"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)} · {accountMap[tx.accountId]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {txData && txData.total > limit && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {txData.total}件中 {page * limit + 1}-{Math.min((page + 1) * limit, txData.total)}件
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>前へ</Button>
                    <Button variant="outline" size="sm" disabled={(page + 1) * limit >= txData.total} onClick={() => setPage(page + 1)}>次へ</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "取引を編集" : "新規取引"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">種別</Label>
                <Select value={form.type} onValueChange={(v: "income" | "expense") => setForm({ ...form, type: v, accountId: 0 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">収入</SelectItem>
                    <SelectItem value="expense">支出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">日付</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">勘定科目</Label>
              <Select value={form.accountId ? String(form.accountId) : ""} onValueChange={(v) => setForm({ ...form, accountId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="科目を選択" /></SelectTrigger>
                <SelectContent>
                  {relevantAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">金額</Label>
              <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">摘要</Label>
              <Input placeholder="取引の説明" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">メモ</Label>
              <Textarea placeholder="補足メモ（任意）" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editingId ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
