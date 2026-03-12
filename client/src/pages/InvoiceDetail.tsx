import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useRef } from "react";

const statusLabels: Record<string, string> = { draft: "下書き", sent: "送付済", paid: "入金済", overdue: "期限超過", cancelled: "取消" };
const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", sent: "bg-blue-500/10 text-blue-700 border-0",
  paid: "bg-emerald-500/10 text-emerald-700 border-0", overdue: "bg-rose-500/10 text-rose-600 border-0", cancelled: "bg-muted text-muted-foreground",
};

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const invoiceId = Number(params.id);
  const printRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: invoice, isLoading } = trpc.invoices.get.useQuery({ id: invoiceId });
  const { data: profile } = trpc.businessProfile.get.useQuery();
  const updateMut = trpc.invoices.update.useMutation({ onSuccess: () => { utils.invoices.invalidate(); toast.success("ステータスを更新しました"); } });

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
    </div>
  );
}
