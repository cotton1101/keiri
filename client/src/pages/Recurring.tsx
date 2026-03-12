import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, CalendarClock } from "lucide-react";
import { useState, useMemo } from "react";

type RecurringForm = {
  type: "income" | "expense";
  accountId: number | null;
  amount: string;
  description: string;
  frequency: "monthly" | "yearly";
  dayOfMonth: number;
};

const emptyForm: RecurringForm = { type: "expense", accountId: null, amount: "", description: "", frequency: "monthly", dayOfMonth: 1 };

export default function Recurring() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RecurringForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.recurring.list.useQuery();
  const { data: accounts } = trpc.accounts.list.useQuery();
  const createMut = trpc.recurring.create.useMutation({ onSuccess: () => { utils.recurring.invalidate(); toast.success("固定費を追加しました"); setDialogOpen(false); } });
  const updateMut = trpc.recurring.update.useMutation({ onSuccess: () => { utils.recurring.invalidate(); toast.success("更新しました"); setDialogOpen(false); } });
  const deleteMut = trpc.recurring.delete.useMutation({ onSuccess: () => { utils.recurring.invalidate(); toast.success("削除しました"); } });

  const filteredAccounts = useMemo(() => (accounts || []).filter(a => a.type === form.type && a.isActive), [accounts, form.type]);

  const monthlyTotal = useMemo(() => {
    if (!items) return { income: 0, expense: 0 };
    let income = 0, expense = 0;
    for (const item of items) {
      if (!item.isActive) continue;
      const amt = Number(item.amount);
      const monthly = item.frequency === "yearly" ? amt / 12 : amt;
      if (item.type === "income") income += monthly; else expense += monthly;
    }
    return { income, expense };
  }, [items]);

  function openCreate() { setEditId(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(item: any) {
    setEditId(item.id);
    setForm({ type: item.type, accountId: item.accountId, amount: item.amount, description: item.description, frequency: item.frequency, dayOfMonth: item.dayOfMonth });
    setDialogOpen(true);
  }
  function handleSave() {
    if (!form.description.trim()) { toast.error("説明を入力してください"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("金額を入力してください"); return; }
    if (!form.accountId) { toast.error("勘定科目を選択してください"); return; }
    if (editId) updateMut.mutate({ id: editId, ...form, accountId: form.accountId! });
    else createMut.mutate({ ...form, accountId: form.accountId! });
  }
  function toggleActive(id: number, current: number) { updateMut.mutate({ id, isActive: current ? 0 : 1 }); }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">固定費・定期取引</h1>
          <p className="text-muted-foreground text-sm mt-1">毎月・毎年の定期的な収支を管理</p>
        </div>
        <Button onClick={openCreate} className="glow-primary gap-1.5" size="sm"><Plus className="h-4 w-4" />固定費を追加</Button>
      </div>
      <div className="page-header-line" />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium">月額固定収入</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(monthlyTotal.income)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium">月額固定支出</p>
            <p className="text-xl font-bold text-rose-600 mt-1">{formatCurrency(monthlyTotal.expense)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium">月額差引</p>
            <p className={`text-xl font-bold mt-1 ${monthlyTotal.income - monthlyTotal.expense >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(monthlyTotal.income - monthlyTotal.expense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">定期取引一覧</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"><CalendarClock className="h-6 w-6 text-muted-foreground" /></div>
              <p className="text-base font-medium">固定費がありません</p>
              <p className="text-sm text-muted-foreground mt-1">家賃やサブスクなどの定期的な支出を登録しましょう</p>
              <Button onClick={openCreate} variant="outline" size="sm" className="mt-4 gap-1"><Plus className="h-3.5 w-3.5" />固定費を追加</Button>
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => (
                <div key={item.id} className={`flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors ${!item.isActive ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                      <RefreshCw className={`h-4 w-4 ${item.type === "income" ? "text-emerald-600" : "text-rose-600"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{item.frequency === "monthly" ? "毎月" : "毎年"}</Badge>
                        <Badge variant="secondary" className="text-[10px] shrink-0">毎月{item.dayOfMonth}日</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-semibold tabular-nums ${item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                    </span>
                    <Switch checked={!!item.isActive} onCheckedChange={() => toggleActive(item.id, item.isActive)} className="scale-90" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("削除しますか？")) deleteMut.mutate({ id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle className="text-lg">{editId ? "固定費を編集" : "固定費を追加"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">種別</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any, accountId: null }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">収入</SelectItem><SelectItem value="expense">支出</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-medium mb-1.5 block">頻度</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">毎月</SelectItem><SelectItem value="yearly">毎年</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-medium mb-1.5 block">勘定科目</Label>
              <Select value={form.accountId ? String(form.accountId) : ""} onValueChange={v => setForm(f => ({ ...f, accountId: Number(v) }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="選択してください" /></SelectTrigger>
                <SelectContent>{filteredAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-medium mb-1.5 block">説明</Label><Input placeholder="例: 事務所家賃" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">金額</Label><Input type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">引落日（日）</Label><Input type="number" min={1} max={31} value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))} className="h-10" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="glow-primary">{editId ? "更新" : "追加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
