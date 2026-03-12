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
import { Plus, FileText, Trash2, Eye, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = { draft: "下書き", sent: "送付済", paid: "入金済", overdue: "期限超過", cancelled: "取消" };
const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", sent: "bg-blue-500/10 text-blue-700 border-0",
  paid: "bg-emerald-500/10 text-emerald-700 border-0", overdue: "bg-rose-500/10 text-rose-600 border-0", cancelled: "bg-muted text-muted-foreground",
};

type InvoiceForm = {
  clientId: number | null; invoiceNumber: string; issueDate: string; dueDate: string; taxRate: string; notes: string;
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

  const createMut = trpc.invoices.create.useMutation({ onSuccess: () => { utils.invoices.invalidate(); toast.success("請求書を作成しました"); setDialogOpen(false); } });
  const deleteMut = trpc.invoices.delete.useMutation({ onSuccess: () => { utils.invoices.invalidate(); toast.success("削除しました"); } });

  const filteredInvoices = useMemo(() => {
    if (!invoicesList) return [];
    if (!searchQuery) return invoicesList;
    const q = searchQuery.toLowerCase();
    return invoicesList.filter(inv => inv.invoiceNumber.toLowerCase().includes(q));
  }, [invoicesList, searchQuery]);

  const subtotal = useMemo(() => form.items.reduce((s, i) => s + Number(i.amount), 0), [form.items]);
  const taxAmount = useMemo(() => Math.round(subtotal * Number(form.taxRate) / 100), [subtotal, form.taxRate]);

  function openCreate() {
    setForm({
      clientId: null, invoiceNumber: nextNumber || "INV-0001",
      issueDate: fromTimestamp(Date.now()), dueDate: fromTimestamp(Date.now() + 30 * 86400000),
      taxRate: "10", notes: "", items: [{ description: "", quantity: "1", unitPrice: "", amount: "0" }],
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

  function handleSubmit() {
    const validItems = form.items.filter(i => i.description && Number(i.unitPrice) > 0);
    if (validItems.length === 0) { toast.error("明細を1つ以上入力してください"); return; }
    const sub = validItems.reduce((sum, i) => sum + Number(i.amount), 0);
    const tax = Math.round(sub * Number(form.taxRate) / 100);
    createMut.mutate({
      clientId: form.clientId, invoiceNumber: form.invoiceNumber,
      issueDate: toTimestamp(form.issueDate), dueDate: toTimestamp(form.dueDate),
      subtotal: String(sub), taxRate: form.taxRate, taxAmount: String(tax), totalAmount: String(sub + tax),
      notes: form.notes || undefined, items: validItems,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">請求書</h1>
          <p className="text-muted-foreground text-sm mt-1">請求書の作成と管理</p>
        </div>
        <Button onClick={openCreate} className="glow-primary gap-1.5" size="sm"><Plus className="h-4 w-4" />新規請求書</Button>
      </div>
      <div className="page-header-line" />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="請求書番号で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"><FileText className="h-6 w-6 text-muted-foreground" /></div>
              <p className="text-base font-medium">請求書がありません</p>
              <Button onClick={openCreate} variant="outline" size="sm" className="mt-4 gap-1"><Plus className="h-3.5 w-3.5" />請求書を作成</Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.issueDate)} 〜 {formatDate(inv.dueDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(Number(inv.totalAmount))}</span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/invoices/${inv.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("削除しますか？")) deleteMut.mutate({ id: inv.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg">新規請求書</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">請求書番号</Label><Input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">取引先</Label>
                <Select value={form.clientId ? String(form.clientId) : "none"} onValueChange={v => setForm({ ...form, clientId: v === "none" ? null : Number(v) })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="取引先を選択" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">未選択</SelectItem>{clientsList?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">発行日</Label><Input type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">支払期限</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">税率 (%)</Label><Input type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} className="h-10" /></div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">明細</Label>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5"><Input placeholder="品目・サービス名" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} className="h-9 text-sm" /></div>
                    <div className="col-span-2"><Input type="number" placeholder="数量" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} className="h-9 text-sm" /></div>
                    <div className="col-span-3"><Input type="number" placeholder="単価" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", e.target.value)} className="h-9 text-sm" /></div>
                    <div className="col-span-1 text-right text-sm font-medium py-2 tabular-nums">{formatCurrency(Number(item.amount))}</div>
                    <div className="col-span-1">
                      {form.items.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}><X className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { description: "", quantity: "1", unitPrice: "", amount: "0" }] })} className="gap-1 text-xs"><Plus className="h-3 w-3" />明細を追加</Button>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">小計</span><span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">消費税 ({form.taxRate}%)</span><span className="font-medium tabular-nums">{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between text-base font-bold border-t pt-2"><span>合計</span><span className="tabular-nums">{formatCurrency(subtotal + taxAmount)}</span></div>
            </div>

            <div><Label className="text-xs font-medium mb-1.5 block">備考</Label><Textarea placeholder="備考・特記事項" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending} className="glow-primary">{createMut.isPending ? "作成中..." : "作成"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
