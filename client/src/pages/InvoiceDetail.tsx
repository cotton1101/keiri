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
import { ArrowLeft, Printer, Mail, Send, History } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useRef, useState } from "react";

const statusLabels: Record<string, string> = { draft: "下書き", sent: "送付済", paid: "入金済", overdue: "期限超過", cancelled: "取消" };
const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", sent: "bg-blue-500/10 text-blue-700 border-0",
  paid: "bg-emerald-500/10 text-emerald-700 border-0", overdue: "bg-rose-500/10 text-rose-600 border-0", cancelled: "bg-muted text-muted-foreground",
};

type EmailForm = { toEmail: string; toName: string; subject: string; body: string; };

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const invoiceId = Number(params.id);
  const printRef = useRef<HTMLDivElement>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailForm>({ toEmail: "", toName: "", subject: "", body: "" });

  const utils = trpc.useUtils();
  const { data: invoice, isLoading } = trpc.invoices.get.useQuery({ id: invoiceId });
  const { data: profile } = trpc.businessProfile.get.useQuery();
  const { data: emailLogs } = trpc.email.logs.useQuery();
  const updateMut = trpc.invoices.update.useMutation({ onSuccess: () => { utils.invoices.invalidate(); toast.success("ステータスを更新しました"); } });
  const sendEmailMut = trpc.email.send.useMutation({
    onSuccess: () => {
      utils.email.logs.invalidate();
      utils.invoices.invalidate();
      toast.success("メールを送信しました");
      setEmailOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  function openEmailDialog() {
    const clientName = invoice?.client?.name || "";
    const clientEmail = invoice?.client?.email || "";
    const businessName = profile?.businessName || "事業者";
    setEmailForm({
      toEmail: clientEmail,
      toName: clientName,
      subject: `【請求書】${invoice?.invoiceNumber} - ${businessName}`,
      body: `${clientName} 御中\n\nいつもお世話になっております。\n${businessName}です。\n\n下記の通り請求書をお送りいたします。\n\n請求書番号: ${invoice?.invoiceNumber}\n合計金額: ${formatCurrency(Number(invoice?.totalAmount || 0))}\n支払期限: ${formatDate(invoice?.dueDate || 0)}\n\nご確認のほど、よろしくお願いいたします。\n\n${businessName}`,
    });
    setEmailOpen(true);
  }

  function handleSendEmail() {
    if (!emailForm.toEmail) { toast.error("送信先メールアドレスを入力してください"); return; }
    if (!emailForm.subject) { toast.error("件名を入力してください"); return; }
    sendEmailMut.mutate({
      invoiceId,
      toEmail: emailForm.toEmail,
      toName: emailForm.toName,
      subject: emailForm.subject,
      body: emailForm.body,
      documentType: "invoice",
    });
  }

  const invoiceEmailLogs = emailLogs?.filter(l => l.invoiceId === invoiceId) || [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!invoice) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-muted-foreground">請求書が見つかりません</p>
      <Button variant="outline" className="mt-4" onClick={() => setLocation("/invoices")}>一覧に戻る</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocation("/invoices")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
            <Badge className={`text-xs mt-1 ${statusColors[invoice.status] || ""}`}>{statusLabels[invoice.status]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={invoice.status} onValueChange={(v: any) => updateMut.mutate({ id: invoiceId, status: v })}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">下書き</SelectItem><SelectItem value="sent">送付済</SelectItem>
              <SelectItem value="paid">入金済</SelectItem><SelectItem value="overdue">期限超過</SelectItem>
              <SelectItem value="cancelled">取消</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openEmailDialog}>
            <Mail className="h-3.5 w-3.5" />メール送信
          </Button>
          {invoiceEmailLogs.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setHistoryOpen(true)}>
              <History className="h-3.5 w-3.5" />送信履歴 ({invoiceEmailLogs.length})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />印刷 / PDF</Button>
        </div>
      </div>

      <Card className="shadow-sm print:shadow-none print:border-0">
        <CardContent className="p-8 md:p-10" ref={printRef}>
          <div className="space-y-8">
            <div className="text-center border-b pb-6">
              <h2 className="text-3xl font-bold tracking-tight">請求書</h2>
              <p className="text-xs text-muted-foreground mt-1 tracking-[0.3em] uppercase">Invoice</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">請求先</p>
                {invoice.client ? (
                  <div className="space-y-0.5">
                    <p className="text-lg font-bold">{invoice.client.name} <span className="text-base font-normal">御中</span></p>
                    {invoice.client.address && <p className="text-sm text-muted-foreground">{invoice.client.address}</p>}
                    {invoice.client.email && <p className="text-sm text-muted-foreground">{invoice.client.email}</p>}
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
                ["請求書番号", invoice.invoiceNumber],
                ["発行日", formatDate(invoice.issueDate)],
                ["支払期限", formatDate(invoice.dueDate)],
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
                {invoice.items?.map((item, i) => (
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
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">小計</span><span className="tabular-nums">{formatCurrency(Number(invoice.subtotal))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">消費税 ({invoice.taxRate}%)</span><span className="tabular-nums">{formatCurrency(Number(invoice.taxAmount))}</span></div>
                <div className="flex justify-between text-lg font-bold border-t-2 pt-2 mt-1"><span>合計金額</span><span className="tabular-nums text-primary">{formatCurrency(Number(invoice.totalAmount))}</span></div>
              </div>
            </div>

            {profile?.bankName && (
              <div className="border-t pt-6">
                <p className="text-xs font-semibold text-muted-foreground mb-2">振込先</p>
                <p className="text-sm">{profile.bankName} {profile.bankBranch} {profile.bankAccountType} {profile.bankAccountNumber}</p>
                <p className="text-sm text-muted-foreground">口座名義: {profile.bankAccountName}</p>
              </div>
            )}

            {invoice.notes && (
              <div className="border-t pt-6">
                <p className="text-xs font-semibold text-muted-foreground mb-2">備考</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Send Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />請求書をメール送信</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">送信先名</Label>
                <Input value={emailForm.toName} onChange={e => setEmailForm(f => ({ ...f, toName: e.target.value }))} placeholder="株式会社○○" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">送信先メール <span className="text-destructive">*</span></Label>
                <Input type="email" value={emailForm.toEmail} onChange={e => setEmailForm(f => ({ ...f, toEmail: e.target.value }))} placeholder="info@example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">件名 <span className="text-destructive">*</span></Label>
              <Input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">本文</Label>
              <Textarea rows={8} value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} />
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
            {invoiceEmailLogs.map((log) => (
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
            {invoiceEmailLogs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">送信履歴はありません</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
