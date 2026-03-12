import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useState, useMemo } from "react";

type AccountForm = {
  name: string;
  type: "income" | "expense" | "asset" | "liability";
  code: string;
  description: string;
};

const emptyForm: AccountForm = { name: "", type: "expense", code: "", description: "" };

const typeLabels: Record<string, string> = {
  income: "収入",
  expense: "経費",
  asset: "資産",
  liability: "負債",
};

const typeColors: Record<string, string> = {
  income: "bg-emerald-500/10 text-emerald-700",
  expense: "bg-red-500/10 text-red-600",
  asset: "bg-blue-500/10 text-blue-700",
  liability: "bg-amber-500/10 text-amber-700",
};

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [activeTab, setActiveTab] = useState("expense");

  const utils = trpc.useUtils();
  const { data: accountsList, isLoading } = trpc.accounts.list.useQuery();

  const createMut = trpc.accounts.create.useMutation({
    onSuccess: () => { utils.accounts.invalidate(); toast.success("勘定科目を追加しました"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.accounts.update.useMutation({
    onSuccess: () => { utils.accounts.invalidate(); toast.success("勘定科目を更新しました"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.accounts.delete.useMutation({
    onSuccess: () => { utils.accounts.invalidate(); toast.success("勘定科目を削除しました"); },
    onError: (e) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const groups: Record<string, typeof accountsList> = { income: [], expense: [], asset: [], liability: [] };
    if (accountsList) {
      for (const a of accountsList) {
        if (groups[a.type]) groups[a.type]!.push(a);
      }
    }
    return groups;
  }, [accountsList]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, type: activeTab as any });
    setDialogOpen(true);
  }

  function openEdit(account: any) {
    setEditingId(account.id);
    setForm({ name: account.name, type: account.type, code: account.code || "", description: account.description || "" });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("科目名を入力してください"); return; }
    if (editingId) {
      updateMut.mutate({ id: editingId, ...form });
    } else {
      createMut.mutate(form);
    }
  }

  const currentAccounts = grouped[activeTab] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">勘定科目</h1>
          <p className="text-muted-foreground text-sm mt-1">カテゴリ別の勘定科目管理</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          科目を追加
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="expense">経費 ({grouped.expense?.length || 0})</TabsTrigger>
          <TabsTrigger value="income">収入 ({grouped.income?.length || 0})</TabsTrigger>
          <TabsTrigger value="asset">資産 ({grouped.asset?.length || 0})</TabsTrigger>
          <TabsTrigger value="liability">負債 ({grouped.liability?.length || 0})</TabsTrigger>
        </TabsList>

        {["expense", "income", "asset", "liability"].map((type) => (
          <TabsContent key={type} value={type}>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>
                ) : (grouped[type] || []).length === 0 ? (
                  <div className="p-12 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">勘定科目がありません</p>
                    <Button variant="outline" className="mt-4" onClick={openCreate}>科目を追加する</Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {(grouped[type] || []).map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center">
                            <span className="text-xs font-mono font-medium text-primary">{account.code || "--"}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{account.name}</p>
                              {account.isDefault === 1 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">デフォルト</Badge>
                              )}
                            </div>
                            {account.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{account.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {account.isDefault !== 1 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("この勘定科目を削除しますか？")) deleteMut.mutate({ id: account.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "勘定科目を編集" : "勘定科目を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">種別</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">収入</SelectItem>
                  <SelectItem value="expense">経費</SelectItem>
                  <SelectItem value="asset">資産</SelectItem>
                  <SelectItem value="liability">負債</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-sm mb-1.5 block">科目名</Label>
                <Input placeholder="例: 旅費交通費" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">コード</Label>
                <Input placeholder="例: 230" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">説明（任意）</Label>
              <Input placeholder="科目の説明" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editingId ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
