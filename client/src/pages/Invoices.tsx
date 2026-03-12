import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, fromTimestamp, toTimestamp } from "@/lib/utils-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Eye, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  draft: "下書き", sent: "送付済", paid: "入金済", overdue: "期限超過", cancelled: "取消",
};
const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-700 border-0",
  paid: "bg-emerald-500/10 text-emerald-700 border-0",
  overdue: "bg-red-500/10 text-red-600 border-0",
  cancelled: "bg-muted text-muted-foreground",
};

type InvoiceForm = {
  clientId: number | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  items: { description: string; quantity: string; unitPrice: string; amount: string }[];
};

export default function Invoices() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();
  const { data: invoicesList, isLoading } = trpc.invoices.list.useQuery();
  const { data: clientsList } = trpc.clients.list.useQuery();
  const { data: nextNumber } = trpc.invoices.nextNumber.useQuery();

  const [form, setForm] = useState<InvoiceForm>({
    clientId: null, invoiceNumber: "", issueDate: fromTimestamp(Date.now()),
    dueDate: fromTimestamp(Date.now() + 30 * 86400000), taxRate: "10",
    notes: "", items: [{ description: "", quantity: "1", unitPrice: "", amount: "0" }],
  });

  const createMut = trpc.invoices.create.useMutation({
    onSuccess: () => { utils.invoices.invalidate(); toast.success("請求書を作成しました"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.invoices.delete.useMutation({
    onSuccess: () => { utils.invoices.invalidate(); toast.success("請求書を削除しました"); },
    onError: (e) => toast.error(e.message),
  });

  const filteredInvoices = useMemo(() => {
    if (!invoicesList) return [];
    if (!searchQuery) return invoicesList;
    const q = searchQuery.toLowerCase();
    return invoicesList.filter(inv => inv.invoiceNumber.toLowerCase().includes(q));
  }, [invoicesList, searchQuery]);

  function openCreate() {
    setForm({
      clientId: null, invoiceNumber: nextNumber || "INV-0001",
      issueDate: fromTimestamp(Date.now()), dueDate: fromTimestamp(Date.now() + 30 * 86400000),
      taxRate: "10", notes: "",
      items: [{ description: "", quantity: "1", unitPrice: "", amount: "0" }],
    });
    setDialogOpen(true);
  }

  function updateItem(index: number, field: string, value: string) {
    const newItems = [...form.items];
    (newItems[index] as any)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unitPrice) || 0;
      newItems[index].amount = String(Math.round(qty * price));
    }
    setForm({ ...form, items: newItems });
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { description: "", quantity: "1", unitPrice: "", amount: "0" }] });
  }

  function removeItem(index: number) {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }

  function handleSubmit() {
    const validItems = form.items.filter(i => i.description && Number(i.unitPrice) > 0);
    if (validItems.length === 0) { toast.error("明細を1つ以上入力してください"); return; }
    const subtotal = validItems.reduce((sum, i) => sum + Number(i.amount), 0);
    const taxAmount = Math.round(subtotal * Number(form.taxRate) / 100);
    const totalAmount = subtotal + taxAmount;
    createMut.mutate({
      clientId: form.clientId, invoiceNumber: form.invoiceNumber,
      issueDate: toTimestamp(form.issueDate), dueDate: toTimestamp(form.dueDate),
      subtotal: String(subtotal), taxRate: form.taxRate,
      taxAmount: String(taxAmount), totalAmount: String(totalAmount),
      notes: form.notes || undefined,
      items: validItems,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">請求書</h1>
          <p className="text-muted-foreground text-sm mt-1">請求書の作成と管理</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          新規請求書
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="請求書番号で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">請求書がありません</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>最初の請求書を作成する</Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">請求書番号</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ステータス</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">発行日</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">支払期限</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">合計金額</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="p-3 text-sm font-medium">{inv.invoiceNumber}</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</Badge>
                        </td>
                        <td className="p-3 text-sm">{formatDate(inv.issueDate)}</td>
                        <td className="p-3 text-sm">{formatDate(inv.dueDate)}</td>
                        <td className="p-3 text-sm text-right font-semibold tabular-nums">{formatCurrency(Number(inv.totalAmount))}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("この請求書を削除しますか？")) deleteMut.mutate({ id: inv.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y">
                {filteredInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(inv.issueDate)}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(Number(inv.totalAmount))}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新規請求書</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">請求書番号</Label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">取引先</Label>
                <Select value={form.clientId ? String(form.clientId) : "none"} onValueChange={(v) => setForm({ ...form, clientId: v === "none" ? null : Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="取引先を選択" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未選択</SelectItem>
                    {clientsList?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">発行日</Label>
                <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">支払期限</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">税率 (%)</Label>
                <Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
              </div>
            </div>

            {/* Items */}
            <div>
              <Label className="text-sm mb-2 block font-semibold">明細</Label>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {i === 0 && <Label className="text-xs text-muted-foreground mb-1 block">品目</Label>}
                      <Input placeholder="品目名" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      {i === 0 && <Label className="text-xs text-muted-foreground mb-1 block">数量</Label>}
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      {i === 0 && <Label className="text-xs text-muted-foreground mb-1 block">単価</Label>}
                      <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      {i === 0 && <Label className="text-xs text-muted-foreground mb-1 block">金額</Label>}
                      <Input value={formatCurrency(Number(item.amount))} disabled className="bg-muted/50" />
                    </div>
                    <div className="col-span-1">
                      {form.items.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />明細を追加
              </Button>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              {(() => {
                const subtotal = form.items.reduce((s, i) => s + Number(i.amount), 0);
                const tax = Math.round(subtotal * Number(form.taxRate) / 100);
                return (
                  <>
                    <div className="flex justify-between text-sm"><span>小計</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-sm"><span>消費税 ({form.taxRate}%)</span><span className="tabular-nums">{formatCurrency(tax)}</span></div>
                    <div className="flex justify-between text-base font-bold border-t pt-2"><span>合計</span><span className="tabular-nums">{formatCurrency(subtotal + tax)}</span></div>
                  </>
                );
              })()}
            </div>

            <div>
              <Label className="text-sm mb-1.5 block">備考</Label>
              <Input placeholder="備考（任意）" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
