import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Printer, Mail, Send, History, FileCheck2, Pencil, Plus, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { fromTimestamp, toTimestamp } from "@/lib/utils-format";

const quoteStatusLabels: Record<string, string> = {
  draft: "下書き", sent: "送付済", paid: "承認済", overdue: "期限切れ", cancelled: "却下",
};
const quoteStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-700 border-0",
  paid: "bg-emerald-500/10 text-emerald-700 border-0",
  overdue: "bg-amber-500/10 text-amber-700 border-0",
  cancelled: "bg-rose-500/10 text-rose-600 border-0",
};

type EmailForm = { toEmail: string; toName: string; subject: string; body: string };
type EditForm = {
  clientId: number | null; quoteNumber: string; issueDate: string; dueDate: string; taxRate: string; notes: string;
  items: { description: string; quantity: string; unitPrice: string; amount: string }[];
};

export default function QuoteDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const quoteId = Number(params.id);
  const [emailOpen, setEmailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailForm>({ toEmail: "", toName: "", subject: "", body: "" });
  const [editForm, setEditForm] = useState<EditForm>({
    clientId: null, quoteNumber: "", issueDate: "", dueDate: "", taxRate: "10", notes: "",
    items: [{ description: "", quantity: "1", unitPrice: "", amount: "0" }],
  });
  const { data: clientsList } = trpc.clients.list.useQuery();

  const utils = trpc.useUtils();
  const { data: quote, isLoading } = trpc.quotes.get.useQuery({ id: quoteId });

  useEffect(() => {
    if (typeof window === "undefined" || !quote) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("print") === "1") {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [quote]);
  const { data: profile } = trpc.businessProfile.get.useQuery();
  const { data: emailLogs } = trpc.email.logs.useQuery();
  const updateMut = trpc.quotes.update.useMutation({ onSuccess: () => { utils.quotes.invalidate(); toast.success("ステータスを更新しました"); } });
  const editMut = trpc.quotes.update.useMutation({
    onSuccess: () => { utils.quotes.invalidate(); toast.success("見積書を更新しました"); setEditOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const convertMut = trpc.quotes.convertToInvoice.useMutation({
    onSuccess: (res) => {
      utils.quotes.invalidate(); utils.invoices.invalidate();
      toast.success(`請求書 ${res.invoiceNumber} を作成しました`, {
        action: { label: "請求書を開く", onClick: () => setLocation(`/invoices/${res.invoiceId}`) },
      });
    },
    onError: (err) => toast.error(err.message),
  });
  const sendEmailMut = trpc.email.send.useMutation({
    onSuccess: () => {
      utils.email.logs.invalidate();
      toast.success("メールを送信しました");
      setEmailOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const editSubtotal = useMemo(() => editForm.items.reduce((s, i) => s + Number(i.amount || 0), 0), [editForm.items]);
  const editDiscountTotal = useMemo(() => editForm.items.filter((i) => Number(i.amount || 0) < 0).reduce((s, i) => s + Number(i.amount || 0), 0), [editForm.items]);
  const editTaxAmount = useMemo(() => Math.round(editSubtotal * Number(editForm.taxRate || 0) / 100), [editSubtotal, editForm.taxRate]);

  function openEdit() {
    if (!quote) return;
    setEditForm({
      clientId: quote.clientId ?? null,
      quoteNumber: quote.invoiceNumber,
      issueDate: fromTimestamp(quote.issueDate),
      dueDate: fromTimestamp(quote.dueDate),
      taxRate: String(quote.taxRate),
      notes: quote.notes ?? "",
      items: (quote.items ?? []).length > 0
        ? quote.items.map((it: any) => ({ description: it.description, quantity: String(it.quantity), unitPrice: String(it.unitPrice), amount: String(it.amount) }))
        : [{ description: "", quantity: "1", unitPrice: "", amount: "0" }],
    });
    setEditOpen(true);
  }
  function editUpdateItem(index: number, field: keyof EditForm["items"][number], value: string) {
    const newItems = [...editForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unitPrice) || 0;
      newItems[index].amount = String(Math.round(qty * price));
    }
    setEditForm({ ...editForm, items: newItems });
  }
  function handleSaveEdit() {
    if (!editForm.quoteNumber.startsWith("Q-")) { toast.error("見積書番号は 'Q-' で始めてください"); return; }
    const validItems = editForm.items.filter((i) => i.description && Number(i.unitPrice) !== 0);
    if (validItems.length === 0) { toast.error("明細を1つ以上入力してください"); return; }
    const sub = validItems.reduce((s, i) => s + Number(i.amount), 0);
    const tax = Math.round(sub * Number(editForm.taxRate) / 100);
    editMut.mutate({
      id: quoteId,
      clientId: editForm.clientId,
      quoteNumber: editForm.quoteNumber,
      issueDate: toTimestamp(editForm.issueDate),
      dueDate: toTimestamp(editForm.dueDate),
      subtotal: String(sub), taxRate: editForm.taxRate, taxAmount: String(tax), totalAmount: String(sub + tax),
      notes: editForm.notes || undefined,
      items: validItems,
    });
  }

  function openEmailDialog() {
    const clientName = quote?.client?.name || "";
    const clientEmail = quote?.client?.email || "";
    const businessName = profile?.businessName || "事業者";
    setEmailForm({
      toEmail: clientEmail,
      toName: clientName,
      subject: `【見積書】${quote?.invoiceNumber} - ${businessName}`,
      body: `${clientName} 御中\n\nいつもお世話になっております。\n${businessName}です。\n\n下記の通りお見積もりをお送りいたします。\n\n見積書番号: ${quote?.invoiceNumber}\n合計金額: ${formatCurrency(Number(quote?.totalAmount || 0))}\n有効期限: ${formatDate(quote?.dueDate || 0)}\n\nご検討のほど、よろしくお願いいたします。\n\n${businessName}`,
    });
    setEmailOpen(true);
  }

  function handleSendEmail() {
    if (!emailForm.toEmail) { toast.error("送信先メールアドレスを入力してください"); return; }
    if (!emailForm.subject) { toast.error("件名を入力してください"); return; }
    sendEmailMut.mutate({
      toEmail: emailForm.toEmail,
      toName: emailForm.toName,
      subject: emailForm.subject,
      body: emailForm.body,
      documentType: "quote",
    });
  }

  const quoteEmailLogs = emailLogs?.filter((l) => l.documentType === "quote" && l.subject.includes(quote?.invoiceNumber || "___never___")) || [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!quote) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-muted-foreground">見積書が見つかりません</p>
      <Button variant="outline" className="mt-4" onClick={() => setLocation("/quotes")}>一覧に戻る</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocation("/quotes")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{quote.invoiceNumber}</h1>
            <Badge className={`text-xs mt-1 ${quoteStatusColors[quote.status] || ""}`}>{quoteStatusLabels[quote.status]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={quote.status} onValueChange={(v: any) => updateMut.mutate({ id: quoteId, status: v })}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="sent">送付済</SelectItem>
              <SelectItem value="paid">承認済</SelectItem>
              <SelectItem value="overdue">期限切れ</SelectItem>
              <SelectItem value="cancelled">却下</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5" />編集
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openEmailDialog}>
            <Mail className="h-3.5 w-3.5" />メール送信
          </Button>
          {quoteEmailLogs.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setHistoryOpen(true)}>
              <History className="h-3.5 w-3.5" />送信履歴 ({quoteEmailLogs.length})
            </Button>
          )}
          <Button
            variant="outline" size="sm" className="gap-1.5"
            disabled={convertMut.isPending}
            onClick={() => { if (confirm(`見積書「${quote.invoiceNumber}」を請求書化しますか？\n（見積書はそのまま残り、新しい請求書が作成されます）`)) convertMut.mutate({ id: quoteId }); }}
          ><FileCheck2 className="h-3.5 w-3.5" />請求書化</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />印刷 / PDF</Button>
        </div>
      </div>

      <Card className="shadow-sm print:shadow-none print:border-0">
        <CardContent className="p-8 md:p-10">
          <div className="space-y-8">
            <div className="text-center border-b pb-6">
              <h2 className="text-3xl font-bold tracking-tight">見積書</h2>
              <p className="text-xs text-muted-foreground mt-1 tracking-[0.3em] uppercase">Quote</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">お見積先</p>
                {quote.client ? (
                  <div className="space-y-0.5">
                    <p className="text-lg font-bold">{quote.client.name} <span className="text-base font-normal">御中</span></p>
                    {quote.client.address && <p className="text-sm text-muted-foreground">{quote.client.address}</p>}
                    {quote.client.email && <p className="text-sm text-muted-foreground">{quote.client.email}</p>}
                  </div>
                ) : <p className="text-sm text-muted-foreground">取引先未設定</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">発行元</p>
                <div className="space-y-0.5">
                  <p className="text-lg font-bold">{profile?.businessName || "事業者名未設定"}</p>
                  {profile?.address && <p className="text-sm text-muted-foreground">{profile.address}</p>}
                  {profile?.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
                  {profile?.taxId && <p className="text-xs text-muted-foreground mt-1">登録番号: {profile.taxId}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-muted/30 rounded-xl p-4">
              {[
                ["見積書番号", quote.invoiceNumber],
                ["発行日", formatDate(quote.issueDate)],
                ["有効期限", formatDate(quote.dueDate)],
              ].map(([label, val], i) => (
                <div key={i}><p className="text-[10px] text-muted-foreground font-medium">{label}</p><p className="text-sm font-semibold mt-0.5">{val}</p></div>
              ))}
            </div>

            <table className="w-full">
              <thead><tr className="border-b-2 border-foreground/10">
                <th className="text-left py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">品目</th>
                <th className="text-right py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">数量</th>
                <th className="text-right py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">単価</th>
                <th className="text-right py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">金額</th>
              </tr></thead>
              <tbody>
                {quote.items?.map((item: { description: string; quantity: number | string; unitPrice: string | number; amount: string | number }, i: number) => (
                  <tr key={i} className="border-b border-foreground/5">
                    <td className="py-3 text-sm">{item.description}</td>
                    <td className="py-3 text-sm text-right tabular-nums">{item.quantity}</td>
                    <td className="py-3 text-sm text-right tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                    <td className="py-3 text-sm text-right font-medium tabular-nums">{formatCurrency(Number(item.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">小計</span><span className="tabular-nums">{formatCurrency(Number(quote.subtotal))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">消費税 ({quote.taxRate}%)</span><span className="tabular-nums">{formatCurrency(Number(quote.taxAmount))}</span></div>
                <div className="flex justify-between text-lg font-bold border-t-2 pt-2 mt-1"><span>合計金額</span><span className="tabular-nums text-primary">{formatCurrency(Number(quote.totalAmount))}</span></div>
              </div>
            </div>

            {quote.notes && (
              <div className="border-t pt-6">
                <p className="text-xs font-semibold text-muted-foreground mb-2">備考</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            <div className="border-t pt-6 text-xs text-muted-foreground">
              <p>※ 本見積書の有効期限は {formatDate(quote.dueDate)} までです。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Quote Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg flex items-center gap-2"><Pencil className="h-4 w-4" />見積書を編集</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">見積書番号</Label>
                <Input value={editForm.quoteNumber} onChange={(e) => setEditForm({ ...editForm, quoteNumber: e.target.value })} className="h-10" placeholder="Q-0001" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">取引先</Label>
                <Select value={editForm.clientId ? String(editForm.clientId) : "none"} onValueChange={(v) => setEditForm({ ...editForm, clientId: v === "none" ? null : Number(v) })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="取引先を選択" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未選択</SelectItem>
                    {clientsList?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">発行日</Label><Input type="date" value={editForm.issueDate} onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">有効期限</Label><Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">税率 (%)</Label><Input type="number" value={editForm.taxRate} onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })} className="h-10" /></div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">明細</Label>
              <div className="space-y-2">
                {editForm.items.map((item, i) => (
                  <div key={i} className={`grid grid-cols-12 gap-2 items-end ${Number(item.amount) < 0 ? "bg-emerald-50/40 rounded px-1" : ""}`}>
                    <div className="col-span-5"><Input placeholder="品目・サービス名" value={item.description} onChange={(e) => editUpdateItem(i, "description", e.target.value)} className="h-9 text-sm" /></div>
                    <div className="col-span-2"><Input type="number" placeholder="数量" value={item.quantity} onChange={(e) => editUpdateItem(i, "quantity", e.target.value)} className="h-9 text-sm" /></div>
                    <div className="col-span-3"><Input type="number" placeholder="単価" value={item.unitPrice} onChange={(e) => editUpdateItem(i, "unitPrice", e.target.value)} className="h-9 text-sm" /></div>
                    <div className={`col-span-1 text-right text-sm font-medium py-2 tabular-nums ${Number(item.amount) < 0 ? "text-emerald-600" : ""}`}>{formatCurrency(Number(item.amount))}</div>
                    <div className="col-span-1">
                      {editForm.items.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditForm({ ...editForm, items: editForm.items.filter((_, j) => j !== i) })}><X className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditForm({ ...editForm, items: [...editForm.items, { description: "", quantity: "1", unitPrice: "", amount: "0" }] })} className="gap-1 text-xs"><Plus className="h-3 w-3" />明細を追加</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditForm({ ...editForm, items: [...editForm.items, { description: "値引き", quantity: "1", unitPrice: "-0", amount: "0" }] })} className="gap-1 text-xs">値引きを追加</Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">💡 値引きはマイナス値の明細行として扱われます（例: 単価 -5000）。</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">小計</span><span className="font-medium tabular-nums">{formatCurrency(editSubtotal)}</span></div>
              {editDiscountTotal < 0 && (
                <div className="flex justify-between text-sm text-emerald-600"><span>うち値引き計</span><span className="font-medium tabular-nums">{formatCurrency(editDiscountTotal)}</span></div>
              )}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">消費税 ({editForm.taxRate}%)</span><span className="font-medium tabular-nums">{formatCurrency(editTaxAmount)}</span></div>
              <div className="flex justify-between text-base font-bold border-t pt-2"><span>合計</span><span className="tabular-nums">{formatCurrency(editSubtotal + editTaxAmount)}</span></div>
            </div>

            <div><Label className="text-xs font-medium mb-1.5 block">備考</Label><Textarea placeholder="備考・特記事項" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button onClick={handleSaveEdit} disabled={editMut.isPending} className="glow-primary">{editMut.isPending ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Send Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />見積書をメール送信</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">送信先名</Label>
                <Input value={emailForm.toName} onChange={(e) => setEmailForm((f) => ({ ...f, toName: e.target.value }))} placeholder="株式会社○○" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">送信先メール <span className="text-destructive">*</span></Label>
                <Input type="email" value={emailForm.toEmail} onChange={(e) => setEmailForm((f) => ({ ...f, toEmail: e.target.value }))} placeholder="info@example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">件名 <span className="text-destructive">*</span></Label>
              <Input value={emailForm.subject} onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">本文</Label>
              <Textarea rows={8} value={emailForm.body} onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>キャンセル</Button>
            <Button onClick={handleSendEmail} disabled={sendEmailMut.isPending} className="gap-1.5">
              <Send className="h-4 w-4" />{sendEmailMut.isPending ? "送信中..." : "送信する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" />送信履歴</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto py-2">
            {quoteEmailLogs.map((log) => (
              <Card key={log.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.subject}</p>
                      <p className="text-xs text-muted-foreground">宛先: {log.toName ? `${log.toName} <${log.toEmail}>` : log.toEmail}</p>
                      <p className="text-xs text-muted-foreground">{log.sentAt ? new Date(log.sentAt).toLocaleString("ja-JP") : "送信中"}</p>
                    </div>
                    <Badge className={`shrink-0 text-xs ${log.status === "sent" ? "bg-emerald-500/10 text-emerald-700 border-0" : log.status === "failed" ? "bg-rose-500/10 text-rose-600 border-0" : "bg-amber-500/10 text-amber-700 border-0"}`}>
                      {log.status === "sent" ? "送信済" : log.status === "failed" ? "失敗" : "送信中"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {quoteEmailLogs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">送信履歴はありません</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
