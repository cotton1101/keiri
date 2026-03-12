import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useRef } from "react";

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

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const invoiceId = Number(params.id);
  const printRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: invoice, isLoading } = trpc.invoices.get.useQuery({ id: invoiceId });
  const { data: profile } = trpc.businessProfile.get.useQuery();

  const updateMut = trpc.invoices.update.useMutation({
    onSuccess: () => { utils.invoices.invalidate(); toast.success("ステータスを更新しました"); },
    onError: (e) => toast.error(e.message),
  });

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">請求書が見つかりません</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/invoices")}>一覧に戻る</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${statusColors[invoice.status] || ""}`}>{statusLabels[invoice.status]}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={invoice.status} onValueChange={(v: any) => updateMut.mutate({ id: invoiceId, status: v })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="sent">送付済</SelectItem>
              <SelectItem value="paid">入金済</SelectItem>
              <SelectItem value="overdue">期限超過</SelectItem>
              <SelectItem value="cancelled">取消</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            印刷 / PDF
          </Button>
        </div>
      </div>

      {/* Invoice Preview */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-8" ref={printRef}>
          <div className="space-y-8">
            {/* Invoice Header */}
            <div className="text-center border-b pb-6">
              <h2 className="text-3xl font-bold tracking-tight">請求書</h2>
              <p className="text-muted-foreground mt-2">INVOICE</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">請求先</h3>
                {invoice.client ? (
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{invoice.client.name} 御中</p>
                    {invoice.client.address && <p className="text-sm text-muted-foreground">{invoice.client.address}</p>}
                    {invoice.client.email && <p className="text-sm text-muted-foreground">{invoice.client.email}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">取引先未設定</p>
                )}
              </div>
              <div className="text-right">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">発行元</h3>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{profile?.businessName || "事業者名未設定"}</p>
                  {profile?.address && <p className="text-sm text-muted-foreground">{profile.address}</p>}
                  {profile?.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
                  {profile?.taxId && <p className="text-sm text-muted-foreground">登録番号: {profile.taxId}</p>}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
              <div>
                <p className="text-xs text-muted-foreground">請求書番号</p>
                <p className="text-sm font-medium mt-0.5">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">発行日</p>
                <p className="text-sm font-medium mt-0.5">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">支払期限</p>
                <p className="text-sm font-medium mt-0.5">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-3 text-sm font-semibold">品目</th>
                  <th className="text-right py-3 text-sm font-semibold w-24">数量</th>
                  <th className="text-right py-3 text-sm font-semibold w-32">単価</th>
                  <th className="text-right py-3 text-sm font-semibold w-32">金額</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 text-sm">{item.description}</td>
                    <td className="py-3 text-sm text-right tabular-nums">{item.quantity}</td>
                    <td className="py-3 text-sm text-right tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                    <td className="py-3 text-sm text-right font-medium tabular-nums">{formatCurrency(Number(item.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>小計</span>
                  <span className="tabular-nums">{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>消費税 ({invoice.taxRate}%)</span>
                  <span className="tabular-nums">{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t-2 pt-2">
                  <span>合計金額</span>
                  <span className="tabular-nums">{formatCurrency(Number(invoice.totalAmount))}</span>
                </div>
              </div>
            </div>

            {/* Bank Info */}
            {profile?.bankName && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-2">振込先</h3>
                <p className="text-sm text-muted-foreground">
                  {profile.bankName} {profile.bankBranch} {profile.bankAccountType} {profile.bankAccountNumber} {profile.bankAccountName}
                </p>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-2">備考</h3>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
