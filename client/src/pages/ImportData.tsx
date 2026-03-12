import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { toTimestamp } from "@/lib/utils-format";

type ParsedRow = {
  type: "income" | "expense";
  accountName: string;
  amount: string;
  date: number;
  description: string;
  memo?: string;
};

const sources = [
  { value: "freee", label: "freee", desc: "freeeからエクスポートしたCSV" },
  { value: "yayoi", label: "弥生会計", desc: "弥生会計の仕訳データCSV" },
  { value: "moneyforward", label: "マネーフォワード", desc: "MFクラウドの仕訳CSV" },
  { value: "csv", label: "汎用CSV", desc: "日付,種別,科目名,金額,摘要 の形式" },
] as const;

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += line[i]; }
    }
    result.push(current.trim());
    return result;
  });
}

function detectAndParse(rows: string[][], source: string): ParsedRow[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.toLowerCase().replace(/[\s"]/g, ""));
  const dataRows = rows.slice(1);

  if (source === "freee") {
    const dateIdx = header.findIndex(h => h.includes("日付") || h.includes("date") || h.includes("取引日"));
    const typeIdx = header.findIndex(h => h.includes("収支") || h.includes("type"));
    const accountIdx = header.findIndex(h => h.includes("勘定科目") || h.includes("account") || h.includes("借方勘定"));
    const amountIdx = header.findIndex(h => h.includes("金額") || h.includes("amount"));
    const descIdx = header.findIndex(h => h.includes("摘要") || h.includes("description") || h.includes("備考"));
    return dataRows.map(r => {
      const t: "income" | "expense" = (r[typeIdx] ?? "").includes("収入") || (r[typeIdx] ?? "").includes("income") ? "income" : "expense";
      return {
        type: t,
        accountName: r[accountIdx] ?? "その他",
        amount: (r[amountIdx] ?? "0").replace(/[,¥￥]/g, ""),
        date: toTimestamp(r[dateIdx] ?? ""),
        description: r[descIdx] ?? "",
      };
    }).filter(r => r.date && Number(r.amount) > 0);
  }

  if (source === "yayoi") {
    const dateIdx = header.findIndex(h => h.includes("日付") || h.includes("伝票日付"));
    const debitIdx = header.findIndex(h => h.includes("借方勘定"));
    const creditIdx = header.findIndex(h => h.includes("貸方勘定"));
    const amountIdx = header.findIndex(h => h.includes("借方金額") || h.includes("金額"));
    const descIdx = header.findIndex(h => h.includes("摘要") || h.includes("適用"));
    return dataRows.map(r => {
      const t: "income" | "expense" = "expense";
      return {
        type: t,
        accountName: r[debitIdx] || r[creditIdx] || "その他",
        amount: (r[amountIdx] ?? "0").replace(/[,¥￥]/g, ""),
        date: toTimestamp(r[dateIdx] ?? ""),
        description: r[descIdx] ?? "",
      };
    }).filter(r => r.date && Number(r.amount) > 0);
  }

  if (source === "moneyforward") {
    const dateIdx = header.findIndex(h => h.includes("日付") || h.includes("計上日"));
    const accountIdx = header.findIndex(h => h.includes("勘定科目") || h.includes("借方勘定科目"));
    const amountIdx = header.findIndex(h => h.includes("金額") || h.includes("借方金額"));
    const descIdx = header.findIndex(h => h.includes("摘要") || h.includes("概要"));
    return dataRows.map(r => {
      const t: "income" | "expense" = "expense";
      return {
        type: t,
        accountName: r[accountIdx] ?? "その他",
        amount: (r[amountIdx] ?? "0").replace(/[,¥￥]/g, ""),
        date: toTimestamp(r[dateIdx] ?? ""),
        description: r[descIdx] ?? "",
      };
    }).filter(r => r.date && Number(r.amount) > 0);
  }

  // Generic CSV: date, type, accountName, amount, description
  return dataRows.map(r => {
    const t: "income" | "expense" = (r[1] ?? "").includes("収入") || (r[1] ?? "").toLowerCase().includes("income") ? "income" : "expense";
    return {
      type: t,
      accountName: r[2] ?? "その他",
      amount: (r[3] ?? "0").replace(/[,¥￥]/g, ""),
      date: toTimestamp(r[0] ?? ""),
      description: r[4] ?? "",
    };
  }).filter(r => r.date && Number(r.amount) > 0);
}

export default function ImportData() {
  const [source, setSource] = useState<string>("csv");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const importMut = trpc.transactions.import.useMutation({
    onSuccess: (res) => { utils.transactions.invalidate(); utils.dashboard.invalidate(); setImporting(false); setDone(true); toast.success(`${res.count}件の取引をインポートしました`); },
    onError: (e) => { setImporting(false); toast.error(e.message); },
  });

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const data = detectAndParse(rows, source);
      setParsed(data);
      if (data.length === 0) toast.error("データを解析できませんでした。CSV形式を確認してください。");
    };
    reader.readAsText(file, "UTF-8");
  }, [source]);

  const handleImport = () => {
    if (parsed.length === 0) return;
    setImporting(true);
    importMut.mutate({ source: source as any, data: parsed });
  };

  const reset = () => { setParsed([]); setFileName(""); setDone(false); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">データインポート</h1>
        <p className="text-muted-foreground text-sm mt-1">他の会計ソフトからデータを移行</p>
      </div>
      <div className="page-header-line" />

      {/* Source selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sources.map(s => (
          <Card key={s.value} className={`shadow-sm cursor-pointer transition-all card-hover ${source === s.value ? "ring-2 ring-primary" : ""}`} onClick={() => { setSource(s.value); reset(); }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${source === s.value ? "bg-primary/10" : "bg-muted"}`}>
                  <FileSpreadsheet className={`h-4 w-4 ${source === s.value ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload area */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          {done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-foreground">インポート完了</p>
              <p className="text-sm text-muted-foreground mt-1">{parsed.length}件の取引データを正常にインポートしました</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={reset}>別のファイルをインポート</Button>
            </div>
          ) : parsed.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1"><FileSpreadsheet className="h-3 w-3" />{fileName}</Badge>
                  <span className="text-sm text-muted-foreground">{parsed.length}件のデータを検出</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reset}>やり直す</Button>
                  <Button size="sm" onClick={handleImport} disabled={importing} className="glow-primary gap-1.5">
                    {importing ? "インポート中..." : <><ArrowRight className="h-4 w-4" />インポート実行</>}
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 border-b">
                    <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">日付</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">種別</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">科目</th>
                    <th className="text-right p-2.5 text-xs font-semibold text-muted-foreground">金額</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground">摘要</th>
                  </tr></thead>
                  <tbody>
                    {parsed.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="p-2.5 tabular-nums">{new Date(r.date).toLocaleDateString("ja-JP")}</td>
                        <td className="p-2.5"><span className={`text-xs font-medium ${r.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{r.type === "income" ? "収入" : "支出"}</span></td>
                        <td className="p-2.5">{r.accountName}</td>
                        <td className="p-2.5 text-right tabular-nums font-medium">¥{Number(r.amount).toLocaleString()}</td>
                        <td className="p-2.5 text-muted-foreground truncate max-w-[150px]">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 50 && <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20">他 {parsed.length - 50}件...</div>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => fileRef.current?.click()}>
                <Upload className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-base font-medium">CSVファイルをアップロード</p>
              <p className="text-sm text-muted-foreground mt-1">
                {sources.find(s => s.value === source)?.label}形式のCSVファイルを選択してください
              </p>
              <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />ファイルを選択
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-muted-foreground" />インポートのヒント</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>各会計ソフトからCSVをエクスポートする手順:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg"><p className="font-medium text-foreground text-xs mb-1">freee</p><p className="text-xs">取引一覧 → エクスポート → CSV形式</p></div>
              <div className="p-3 bg-muted/30 rounded-lg"><p className="font-medium text-foreground text-xs mb-1">弥生会計</p><p className="text-xs">仕訳日記帳 → ファイル → エクスポート</p></div>
              <div className="p-3 bg-muted/30 rounded-lg"><p className="font-medium text-foreground text-xs mb-1">マネーフォワード</p><p className="text-xs">仕訳帳 → エクスポート → CSV</p></div>
              <div className="p-3 bg-muted/30 rounded-lg"><p className="font-medium text-foreground text-xs mb-1">汎用CSV</p><p className="text-xs">日付,種別,科目名,金額,摘要 の列順</p></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
