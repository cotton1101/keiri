import { trpc } from "@/lib/trpc";
import { formatCurrency, fromTimestamp, toTimestamp } from "@/lib/utils-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, Filter, Search, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type TxForm = { type: "income" | "expense"; accountId: number; amount: string; date: string; description: string; memo: string; };
const emptyForm: TxForm = { type: "expense", accountId: 0, amount: "", date: fromTimestamp(Date.now()), description: "", memo: "" };

export default function Transactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TxForm>(emptyForm);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const utils = trpc.useUtils();
  const { data: accountsList } = trpc.accounts.list.useQuery();
  const { data: txData, isLoading } = trpc.transactions.list.useQuery({
    type: filterType === "all" ? undefined : filterType,
    accountId: filterAccount !== "all" ? Number(filterAccount) : undefined,
    limit, offset: page * limit,
  });

  const { data: limitInfo } = trpc.subscription.limitInfo.useQuery();
  const [, navigate] = useLocation();
  const isAtLimit = limitInfo?.plan === "free" && limitInfo.transactionRemaining !== null && limitInfo.transactionRemaining <= 0;

  const createMut = trpc.transactions.create.useMutation({
    onSuccess: () => { utils.transactions.invalidate(); utils.dashboard.invalidate(); utils.subscription.limitInfo.invalidate(); toast.success("取引を登録しました"); setDialogOpen(false); },
    onError: (err) => { if (err.message.includes("無料プラン")) { toast.error(err.message, { action: { label: "アップグレード", onClick: () => navigate("/plans") } }); } else { toast.error(err.message); } },
  });
  const updateMut = trpc.transactions.update.useMutation({ onSuccess: () => { utils.transactions.invalidate(); utils.dashboard.invalidate(); toast.success("取引を更新しました"); setDialogOpen(false); } });
  const deleteMut = trpc.transactions.delete.useMutation({ onSuccess: () => { utils.transactions.invalidate(); utils.dashboard.invalidate(); toast.success("取引を削除しました"); } });

  const accountMap = useMemo(() => { const m = new Map<number, string>(); accountsList?.forEach(a => m.set(a.id, a.name)); return m; }, [accountsList]);

  const filteredItems = useMemo(() => {
    if (!txData?.items) return [];
    if (!searchQuery) return txData.items;
    const q = searchQuery.toLowerCase();
    return txData.items.filter(tx => tx.description.toLowerCase().includes(q) || (accountMap.get(tx.accountId) ?? "").toLowerCase().includes(q));
  }, [txData?.items, searchQuery, accountMap]);

  const total = txData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  function openCreate() {
    if (isAtLimit) { toast.error("無料プランの取引上限（15件）に達しています", { action: { label: "アップグレード", onClick: () => navigate("/plans") } }); return; }
    setEditingId(null); setForm({ ...emptyForm, accountId: accountsList?.[0]?.id ?? 0 }); setDialogOpen(true);
  }
  function openEdit(tx: any) { setEditingId(tx.id); setForm({ type: tx.type, accountId: tx.accountId, amount: String(tx.amount), date: fromTimestamp(tx.date), description: tx.description, memo: tx.memo || "" }); setDialogOpen(true); }
  function handleSubmit() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error("金額を入力してください"); return; }
    if (!form.accountId) { toast.error("勘定科目を選択してください"); return; }
    const data = { type: form.type, accountId: form.accountId, amount: form.amount, date: toTimestamp(form.date), description: form.description, memo: form.memo || undefined };
    if (editingId) updateMut.mutate({ id: editingId, ...data }); else createMut.mutate(data);
  }

  const relevantAccounts = accountsList?.filter(a => a.isActive && a.type === form.type) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">取引管理</h1>
          <p className="text-muted-foreground text-sm mt-1">収入・支出の記録と管理</p>
        </div>
        <Button onClick={openCreate} className="glow-primary gap-1.5" size="sm"><Plus className="h-4 w-4" />新規取引</Button>
      </div>
      <div className="page-header-line" />

      {/* 無料プラン制限バナー */}
      {limitInfo?.plan === "free" && (
        <Card className={`shadow-sm ${isAtLimit ? "border-destructive bg-destructive/5" : "border-amber-200 bg-amber-50/50"}`}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${isAtLimit ? "text-destructive" : "text-amber-600"}`} />
              <div>
                <p className="text-sm font-medium">
                  {isAtLimit ? "取引上限に達しました" : `取引残り ${limitInfo.transactionRemaining} 件`}
                </p>
                <p className="text-xs text-muted-foreground">
                  無料プラン: {limitInfo.transactionCount}/15件 使用済み
                </p>
              </div>
            </div>
            <Button size="sm" variant={isAtLimit ? "default" : "outline"} onClick={() => navigate("/plans")} className={isAtLimit ? "glow-primary" : ""}>
              アップグレード
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(0); }}>
                <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="income">収入</SelectItem>
                  <SelectItem value="expense">支出</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={filterAccount} onValueChange={v => { setFilterAccount(v); setPage(0); }}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="勘定科目" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全科目</SelectItem>
                {accountsList?.filter(a => a.isActive).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="摘要で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"><ArrowUpRight className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-base font-medium">取引がありません</p>
            <p className="text-sm text-muted-foreground mt-1">最初の取引を追加してみましょう</p>
            <Button onClick={openCreate} variant="outline" size="sm" className="mt-4 gap-1"><Plus className="h-3.5 w-3.5" />取引を追加</Button>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 pl-4">日付</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">種別</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">勘定科目</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">摘要</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-3">金額</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-3 pr-4">操作</th>
                </tr></thead>
                <tbody>
                  {filteredItems.map(tx => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 pl-4 text-sm tabular-nums">{new Date(tx.date).toLocaleDateString("ja-JP")}</td>
                      <td className="p-3"><span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tx.type === "income" ? "badge-success" : "badge-danger"}`}>{tx.type === "income" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{tx.type === "income" ? "収入" : "支出"}</span></td>
                      <td className="p-3 text-sm">{accountMap.get(tx.accountId) ?? "-"}</td>
                      <td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">{tx.description || "-"}</td>
                      <td className={`p-3 text-right text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}</td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("この取引を削除しますか？")) deleteMut.mutate({ id: tx.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y">
              {filteredItems.map(tx => (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>{tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-rose-600" />}</div>
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{tx.description || accountMap.get(tx.accountId) || "取引"}</p><p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("ja-JP")} · {accountMap.get(tx.accountId)}</p></div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground">{total}件中 {page * limit + 1}-{Math.min((page + 1) * limit, total)}件</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 text-xs">前へ</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 text-xs">次へ</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle className="text-lg">{editingId ? "取引を編集" : "新規取引"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">種別</Label>
                <Select value={form.type} onValueChange={(v: "income" | "expense") => setForm({ ...form, type: v, accountId: 0 })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">収入</SelectItem><SelectItem value="expense">支出</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-medium mb-1.5 block">日付</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-10" /></div>
            </div>
            <div><Label className="text-xs font-medium mb-1.5 block">勘定科目</Label>
              <Select value={form.accountId ? String(form.accountId) : ""} onValueChange={v => setForm({ ...form, accountId: Number(v) })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="科目を選択" /></SelectTrigger>
                <SelectContent>{relevantAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-medium mb-1.5 block">金額</Label><Input type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-10 text-lg font-semibold" /></div>
            <div><Label className="text-xs font-medium mb-1.5 block">摘要</Label><Input placeholder="例: クライアントA 報酬" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-10" /></div>
            <div><Label className="text-xs font-medium mb-1.5 block">メモ</Label><Textarea placeholder="補足メモ（任意）" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="glow-primary">{createMut.isPending || updateMut.isPending ? "保存中..." : editingId ? "更新" : "登録"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
