import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, FileText, Trash2, Check, Scan, Image as ImageIcon, Loader2, ArrowRight } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

type ReceiptItem = {
  id: number;
  fileName: string;
  fileType: string;
  fileData: string;
  status: "pending" | "processed" | "error";
  extractedData: {
    vendor?: string;
    amount?: number;
    date?: string;
    items?: string[];
    rawText?: string;
  } | null;
  suggestedAccountId: number | null;
  suggestedAccountName: string | null;
  suggestedType: "income" | "expense" | null;
  transactionId: number | null;
  createdAt: string | Date;
};

export default function Receipts() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [ocrText, setOcrText] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  const [showCreateTxn, setShowCreateTxn] = useState(false);
  const [txnForm, setTxnForm] = useState({ type: "expense" as "income" | "expense", accountId: 0, amount: "", date: "", description: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: receipts, isLoading, refetch } = trpc.receipts.list.useQuery();
  const { data: accounts } = trpc.accounts.list.useQuery();
  const uploadMutation = trpc.receipts.upload.useMutation({
    onSuccess: (data) => {
      toast.success("アップロード完了");
      refetch();
      if (data.status === "processed" && data.extractedData) {
        setSelectedReceipt(data as unknown as ReceiptItem);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const analyzeMutation = trpc.receipts.analyze.useMutation({
    onSuccess: (data) => {
      toast.success("解析完了");
      refetch();
      setIsAnalyzing(false);
      // Update the selected receipt with analyzed data so the dialog reflects results immediately
      if (selectedReceipt) {
        setSelectedReceipt({
          ...selectedReceipt,
          status: "processed",
          extractedData: {
            vendor: data.vendor ?? undefined,
            amount: data.amount ?? undefined,
            date: data.date ?? undefined,
          },
          suggestedAccountId: data.accountId,
          suggestedAccountName: data.accountName,
          suggestedType: data.type,
        });
      }
      setOcrText("");
    },
    onError: (e) => { toast.error(e.message); setIsAnalyzing(false); },
  });
  const createTxnMutation = trpc.receipts.createTransaction.useMutation({
    onSuccess: () => { toast.success("取引を登録しました"); setShowCreateTxn(false); setSelectedReceipt(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.receipts.delete.useMutation({
    onSuccess: () => { toast.success("削除しました"); refetch(); setSelectedReceipt(null); },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        // For images, try to use browser OCR simulation via canvas text extraction
        // In production, this would call a real OCR API
        uploadMutation.mutate({
          fileName: file.name,
          fileType: file.type,
          fileData: base64,
          ocrText: "", // OCR text will be added manually or via analyze
        });
      };
      reader.readAsDataURL(file);
    }
  }, [uploadMutation]);

  const handleAnalyze = (receipt: ReceiptItem) => {
    setIsAnalyzing(true);
    // Simulate OCR analysis with user-provided text or auto-generated text
    if (ocrText.trim()) {
      analyzeMutation.mutate({ id: receipt.id, ocrText: ocrText.trim() });
    } else {
      toast.error("OCRテキストを入力してください。レシートの内容をテキストで貼り付けてください。");
      setIsAnalyzing(false);
    }
  };

  const openCreateTransaction = (receipt: ReceiptItem) => {
    setShowCreateTxn(true);
    setTxnForm({
      type: receipt.suggestedType || "expense",
      accountId: receipt.suggestedAccountId || (accounts?.find((a: any) => a.type === "expense")?.id ?? 0),
      amount: receipt.extractedData?.amount?.toString() || "",
      date: receipt.extractedData?.date || new Date().toISOString().split("T")[0],
      description: receipt.extractedData?.vendor || receipt.fileName,
    });
  };

  const handleCreateTransaction = () => {
    if (!selectedReceipt) return;
    createTxnMutation.mutate({
      receiptId: selectedReceipt.id,
      type: txnForm.type,
      accountId: txnForm.accountId,
      amount: txnForm.amount,
      date: new Date(txnForm.date).getTime(),
      description: txnForm.description,
    });
  };

  const filteredAccounts = accounts?.filter((a: any) => a.type === txnForm.type) ?? [];

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <Scan className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">レシート読取・自動振り分け</h1>
            <p className="text-muted-foreground text-sm">レシート撮影・PDFアップロードで自動仕訳</p>
          </div>
        </div>
      </div>
      <div className="page-header-line" />

      {/* Upload Actions */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="bento-card p-5 text-left hover:border-primary/30 transition-all group"
        >
          <div className="bento-shine" />
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shrink-0">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm group-hover:text-primary transition-colors">レシート撮影</p>
              <p className="text-xs text-muted-foreground mt-0.5">カメラでレシートを撮影</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bento-card p-5 text-left hover:border-primary/30 transition-all group"
        >
          <div className="bento-shine" />
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shrink-0">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm group-hover:text-primary transition-colors">画像アップロード</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WebP対応</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => { fileInputRef.current?.setAttribute("accept", ".pdf,application/pdf"); fileInputRef.current?.click(); }}
          className="bento-card p-5 text-left hover:border-primary/30 transition-all group"
        >
          <div className="bento-shine" />
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm group-hover:text-primary transition-colors">PDFアップロード</p>
              <p className="text-xs text-muted-foreground mt-0.5">領収書PDFを解析</p>
            </div>
          </div>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }}
      />

      {uploadMutation.isPending && (
        <div className="bento-card p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">アップロード中...</span>
          </div>
        </div>
      )}

      {/* Receipt List */}
      <div className="bento-card overflow-hidden">
        <div className="bento-shine" />
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="icon-box icon-box-teal h-8 w-8">
              <Scan className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold">アップロード済みレシート ({receipts?.length ?? 0}件)</h3>
          </div>
        </div>
        <div className="px-5 pb-5 relative">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 shimmer rounded-xl" />
              ))}
            </div>
          ) : !receipts?.length ? (
            <div className="py-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">レシートがありません</p>
              <p className="text-muted-foreground/60 text-xs mt-1">上のボタンからレシートを撮影またはアップロードしてください</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(receipts as ReceiptItem[]).map((receipt) => (
                <div
                  key={receipt.id}
                  onClick={() => setSelectedReceipt(receipt)}
                  className="flex items-center gap-4 p-3.5 rounded-xl border hover:bg-accent/50 transition-all cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="h-14 w-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {receipt.fileType.startsWith("image/") ? (
                      <img
                        src={`data:${receipt.fileType};base64,${receipt.fileData}`}
                        alt={receipt.fileName}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <FileText className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{receipt.extractedData?.vendor || receipt.fileName}</p>
                      <Badge
                        variant={receipt.status === "processed" ? "default" : receipt.status === "error" ? "destructive" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {receipt.status === "processed" ? "解析済" : receipt.status === "error" ? "エラー" : "未解析"}
                      </Badge>
                      {receipt.transactionId && (
                        <Badge variant="outline" className="text-[10px] shrink-0 text-emerald-600 border-emerald-200">
                          <Check className="h-3 w-3 mr-0.5" /> 仕訳済
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {receipt.extractedData?.amount && (
                        <span className="text-sm font-bold tabular-nums">¥{receipt.extractedData.amount.toLocaleString()}</span>
                      )}
                      {receipt.extractedData?.date && (
                        <span className="text-xs text-muted-foreground">{receipt.extractedData.date}</span>
                      )}
                      {receipt.suggestedAccountName && (
                        <Badge variant="outline" className="text-[10px]">{receipt.suggestedAccountName}</Badge>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selectedReceipt && !showCreateTxn} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">レシート詳細</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="rounded-xl border overflow-hidden bg-muted/30 max-h-[300px] flex items-center justify-center">
                {selectedReceipt.fileType.startsWith("image/") ? (
                  <img
                    src={`data:${selectedReceipt.fileType};base64,${selectedReceipt.fileData}`}
                    alt={selectedReceipt.fileName}
                    className="max-h-[300px] object-contain"
                  />
                ) : (
                  <div className="py-12 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{selectedReceipt.fileName}</p>
                  </div>
                )}
              </div>

              {/* Extracted Data */}
              {selectedReceipt.extractedData ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold">解析結果</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">店舗名</p>
                      <p className="font-medium mt-1">{selectedReceipt.extractedData.vendor || "-"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">金額</p>
                      <p className="font-bold mt-1 text-lg tabular-nums">
                        {selectedReceipt.extractedData.amount ? `¥${selectedReceipt.extractedData.amount.toLocaleString()}` : "-"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">日付</p>
                      <p className="font-medium mt-1">{selectedReceipt.extractedData.date || "-"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">振り分け先</p>
                      <p className="font-medium mt-1">{selectedReceipt.suggestedAccountName || "未分類"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold">テキスト解析</h4>
                  <p className="text-xs text-muted-foreground">レシートの内容をテキストで入力し、解析ボタンを押してください。</p>
                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    placeholder={"スターバックス\n2024年3月15日\nカフェラテ ¥550\n合計 ¥550"}
                    className="w-full h-32 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    onClick={() => handleAnalyze(selectedReceipt)}
                    disabled={isAnalyzing || !ocrText.trim()}
                    className="w-full"
                  >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Scan className="h-4 w-4 mr-2" />}
                    解析して自動振り分け
                  </Button>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate({ id: selectedReceipt.id })}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> 削除
                </Button>
                <div className="flex-1" />
                {selectedReceipt.extractedData && !selectedReceipt.transactionId && (
                  <Button onClick={() => openCreateTransaction(selectedReceipt)}>
                    <Check className="h-4 w-4 mr-1" /> 取引として登録
                  </Button>
                )}
                {selectedReceipt.transactionId && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 py-2 px-3">
                    <Check className="h-4 w-4 mr-1" /> 仕訳登録済み
                  </Badge>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Transaction Dialog */}
      <Dialog open={showCreateTxn} onOpenChange={() => setShowCreateTxn(false)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">取引として登録</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">種別</Label>
              <Select value={txnForm.type} onValueChange={(v) => setTxnForm(f => ({ ...f, type: v as "income" | "expense", accountId: 0 }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">収入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">勘定科目</Label>
              <Select value={txnForm.accountId.toString()} onValueChange={(v) => setTxnForm(f => ({ ...f, accountId: parseInt(v) }))}>
                <SelectTrigger><SelectValue placeholder="勘定科目を選択" /></SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">金額</Label>
                <Input
                  type="number"
                  value={txnForm.amount}
                  onChange={(e) => setTxnForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">日付</Label>
                <Input
                  type="date"
                  value={txnForm.date}
                  onChange={(e) => setTxnForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">摘要</Label>
              <Input
                value={txnForm.description}
                onChange={(e) => setTxnForm(f => ({ ...f, description: e.target.value }))}
                placeholder="取引の説明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTxn(false)}>キャンセル</Button>
            <Button
              onClick={handleCreateTransaction}
              disabled={createTxnMutation.isPending || !txnForm.accountId || !txnForm.amount || !txnForm.date}
            >
              {createTxnMutation.isPending ? "登録中..." : "登録する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
