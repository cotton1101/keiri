import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Tag } from "lucide-react";
import { useState, useMemo } from "react";

type AccountForm = { name: string; type: "income" | "expense" | "asset" | "liability"; code: string; description: string; };
const emptyForm: AccountForm = { name: "", type: "expense", code: "", description: "" };

const typeConfig: Record<string, { label: string; bg: string }> = {
  income: { label: "収入", bg: "bg-emerald-500/10 text-emerald-700" },
  expense: { label: "支出", bg: "bg-rose-500/10 text-rose-600" },
  asset: { label: "資産", bg: "bg-blue-500/10 text-blue-700" },
  liability: { label: "負債", bg: "bg-amber-500/10 text-amber-700" },
};

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [filterType, setFilterType] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.accounts.list.useQuery();
  const createMut = trpc.accounts.create.useMutation({ onSuccess: () => { utils.accounts.invalidate(); toast.success("科目を追加しました"); setDialogOpen(false); } });
  const updateMut = trpc.accounts.update.useMutation({ onSuccess: () => { utils.accounts.invalidate(); toast.success("科目を更新しました"); setDialogOpen(false); } });
  const deleteMut = trpc.accounts.delete.useMutation({ onSuccess: () => { utils.accounts.invalidate(); toast.success("科目を削除しました"); } });

  const filtered = useMemo(() => {
    if (!accounts) return [];
    return filterType === "all" ? accounts : accounts.filter(a => a.type === filterType);
  }, [accounts, filterType]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    for (const a of filtered) { if (!g[a.type]) g[a.type] = []; g[a.type].push(a); }
    return g;
  }, [filtered]);

  function openCreate() { setEditId(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(a: any) { setEditId(a.id); setForm({ name: a.name, type: a.type, code: a.code || "", description: a.description || "" }); setDialogOpen(true); }
  function handleSave() {
    if (!form.name.trim()) { toast.error("科目名を入力してください"); return; }
    if (editId) updateMut.mutate({ id: editId, ...form }); else createMut.mutate(form);
  }
  function toggleActive(id: number, current: number) { updateMut.mutate({ id, isActive: current ? 0 : 1 }); }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">勘定科目</h1>
          <p className="text-muted-foreground text-sm mt-1">カテゴリ別の勘定科目管理</p>
        </div>
        <Button onClick={openCreate} className="glow-primary gap-1.5" size="sm"><Plus className="h-4 w-4" />科目を追加</Button>
      </div>
      <div className="page-header-line" />

      <div className="flex gap-2 flex-wrap">
        {["all", "income", "expense", "asset", "liability"].map(t => (
          <Button key={t} variant={filterType === t ? "default" : "outline"} size="sm" onClick={() => setFilterType(t)} className={`h-8 text-xs rounded-full ${filterType === t ? "" : ""}`}>
            {t === "all" ? "すべて" : typeConfig[t]?.label}
            {t !== "all" && accounts && <span className="ml-1.5 opacity-60">({accounts.filter(a => a.type === t).length})</span>}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[...Array(4)].map((_, i) => <div key={i} className="h-40 shimmer rounded-xl" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"><BookOpen className="h-6 w-6 text-muted-foreground" /></div>
            <p className="text-base font-medium">勘定科目がありません</p>
            <Button onClick={openCreate} variant="outline" size="sm" className="mt-4 gap-1"><Plus className="h-3.5 w-3.5" />科目を追加</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([type, items]) => (
            <Card key={type} className="shadow-sm overflow-hidden">
              <CardHeader className="pb-0 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">{typeConfig[type]?.label ?? type}</CardTitle>
                  <span className="text-xs text-muted-foreground">({items.length}件)</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-3">
                <div className="divide-y">
                  {items.map(a => (
                    <div key={a.id} className={`flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors ${!a.isActive ? "opacity-40" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeConfig[a.type]?.bg ?? "bg-muted"}`}>
                          <span className="text-[11px] font-bold font-mono">{a.code || "#"}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{a.name}</p>
                            {a.isDefault === 1 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">デフォルト</Badge>}
                          </div>
                          {a.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{a.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={!!a.isActive} onCheckedChange={() => toggleActive(a.id, a.isActive)} className="scale-90" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        {a.isDefault !== 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("この科目を削除しますか？")) deleteMut.mutate({ id: a.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="text-lg">{editId ? "科目を編集" : "科目を追加"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">種別</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">収入</SelectItem><SelectItem value="expense">支出</SelectItem>
                    <SelectItem value="asset">資産</SelectItem><SelectItem value="liability">負債</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-medium mb-1.5 block">科目コード</Label><Input placeholder="例: 100" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="h-10" /></div>
            </div>
            <div><Label className="text-xs font-medium mb-1.5 block">科目名</Label><Input placeholder="例: 旅費交通費" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10" /></div>
            <div><Label className="text-xs font-medium mb-1.5 block">説明（任意）</Label><Input placeholder="科目の説明" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-10" /></div>
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
