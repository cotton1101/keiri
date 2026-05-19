import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Users, Plus, Pencil, Trash2, Save } from "lucide-react";
import { useState, useEffect } from "react";

type ProfileForm = {
  businessName: string; representativeName: string; postalCode: string; address: string;
  phone: string; email: string; taxId: string; bankName: string; bankBranch: string;
  bankAccountType: string; bankAccountNumber: string; bankAccountName: string;
  fiscalYearStart: number; filingType: "blue" | "white";
  consumptionTaxMethod: "standard" | "simplified" | "exempt"; simplifiedTaxIndustry: number;
};

type ClientForm = { name: string; contactPerson: string; email: string; phone: string; postalCode: string; address: string; memo: string; };

const emptyProfile: ProfileForm = {
  businessName: "", representativeName: "", postalCode: "", address: "",
  phone: "", email: "", taxId: "", bankName: "", bankBranch: "",
  bankAccountType: "普通", bankAccountNumber: "", bankAccountName: "", fiscalYearStart: 1, filingType: "blue",
  consumptionTaxMethod: "exempt", simplifiedTaxIndustry: 5,
};
const emptyClient: ClientForm = { name: "", contactPerson: "", email: "", phone: "", postalCode: "", address: "", memo: "" };

export default function SettingsPage() {
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);

  const utils = trpc.useUtils();
  const { data: profile, isLoading: profileLoading } = trpc.businessProfile.get.useQuery();
  const { data: clientsList } = trpc.clients.list.useQuery();

  const profileMut = trpc.businessProfile.upsert.useMutation({ onSuccess: () => { utils.businessProfile.invalidate(); toast.success("事業者情報を保存しました"); } });
  const createClientMut = trpc.clients.create.useMutation({ onSuccess: () => { utils.clients.invalidate(); toast.success("取引先を追加しました"); setClientDialogOpen(false); } });
  const updateClientMut = trpc.clients.update.useMutation({ onSuccess: () => { utils.clients.invalidate(); toast.success("更新しました"); setClientDialogOpen(false); } });
  const deleteClientMut = trpc.clients.delete.useMutation({ onSuccess: () => { utils.clients.invalidate(); toast.success("削除しました"); } });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        businessName: profile.businessName || "", representativeName: profile.representativeName || "",
        postalCode: profile.postalCode || "", address: profile.address || "",
        phone: profile.phone || "", email: profile.email || "", taxId: profile.taxId || "",
        bankName: profile.bankName || "", bankBranch: profile.bankBranch || "",
        bankAccountType: profile.bankAccountType || "普通", bankAccountNumber: profile.bankAccountNumber || "",
        bankAccountName: profile.bankAccountName || "", fiscalYearStart: profile.fiscalYearStart || 1,
        filingType: (profile.filingType as "blue" | "white") || "blue",
        consumptionTaxMethod: (profile.consumptionTaxMethod as "standard" | "simplified" | "exempt") || "exempt",
        simplifiedTaxIndustry: profile.simplifiedTaxIndustry || 5,
      });
    }
  }, [profile]);

  function openCreateClient() { setEditingClientId(null); setClientForm(emptyClient); setClientDialogOpen(true); }
  function openEditClient(c: any) {
    setEditingClientId(c.id);
    setClientForm({ name: c.name, contactPerson: c.contactPerson || "", email: c.email || "", phone: c.phone || "", postalCode: c.postalCode || "", address: c.address || "", memo: c.memo || "" });
    setClientDialogOpen(true);
  }
  function handleSaveClient() {
    if (!clientForm.name.trim()) { toast.error("取引先名を入力してください"); return; }
    if (editingClientId) updateClientMut.mutate({ id: editingClientId, ...clientForm });
    else createClientMut.mutate(clientForm);
  }

  const pf = profileForm;
  const setPf = (key: keyof ProfileForm, val: string | number) => setProfileForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground text-sm mt-1">事業者情報と各種設定</p>
      </div>
      <div className="page-header-line" />

      <Tabs defaultValue="business">
        <TabsList className="h-10">
          <TabsTrigger value="business" className="gap-1.5 text-sm"><Building2 className="h-3.5 w-3.5" />事業者情報</TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-sm"><Users className="h-3.5 w-3.5" />取引先管理</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <div className="space-y-5">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">基本情報</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {profileLoading ? <div className="py-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 shimmer rounded-lg" />)}</div> : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label className="text-xs font-medium mb-1.5 block">事業者名（屋号）</Label><Input value={pf.businessName} onChange={e => setPf("businessName", e.target.value)} placeholder="例: 山田デザイン事務所" className="h-10" /></div>
                      <div><Label className="text-xs font-medium mb-1.5 block">代表者名</Label><Input value={pf.representativeName} onChange={e => setPf("representativeName", e.target.value)} placeholder="例: 山田太郎" className="h-10" /></div>
                      <div><Label className="text-xs font-medium mb-1.5 block">郵便番号</Label><Input value={pf.postalCode} onChange={e => setPf("postalCode", e.target.value)} placeholder="例: 100-0001" className="h-10" /></div>
                      <div><Label className="text-xs font-medium mb-1.5 block">電話番号</Label><Input value={pf.phone} onChange={e => setPf("phone", e.target.value)} placeholder="例: 03-1234-5678" className="h-10" /></div>
                    </div>
                    <div><Label className="text-xs font-medium mb-1.5 block">住所</Label><Input value={pf.address} onChange={e => setPf("address", e.target.value)} placeholder="例: 東京都千代田区..." className="h-10" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label className="text-xs font-medium mb-1.5 block">メールアドレス</Label><Input type="email" value={pf.email} onChange={e => setPf("email", e.target.value)} placeholder="例: info@example.com" className="h-10" /></div>
                      <div><Label className="text-xs font-medium mb-1.5 block">インボイス登録番号</Label><Input value={pf.taxId} onChange={e => setPf("taxId", e.target.value)} placeholder="例: T1234567890123" className="h-10" /></div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">振込先情報</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label className="text-xs font-medium mb-1.5 block">銀行名</Label><Input value={pf.bankName} onChange={e => setPf("bankName", e.target.value)} placeholder="例: 三菱UFJ銀行" className="h-10" /></div>
                  <div><Label className="text-xs font-medium mb-1.5 block">支店名</Label><Input value={pf.bankBranch} onChange={e => setPf("bankBranch", e.target.value)} placeholder="例: 東京支店" className="h-10" /></div>
                  <div><Label className="text-xs font-medium mb-1.5 block">口座種別</Label>
                    <Select value={pf.bankAccountType} onValueChange={v => setPf("bankAccountType", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="普通">普通</SelectItem><SelectItem value="当座">当座</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-xs font-medium mb-1.5 block">口座番号</Label><Input value={pf.bankAccountNumber} onChange={e => setPf("bankAccountNumber", e.target.value)} placeholder="例: 1234567" className="h-10" /></div>
                  <div><Label className="text-xs font-medium mb-1.5 block">口座名義</Label><Input value={pf.bankAccountName} onChange={e => setPf("bankAccountName", e.target.value)} placeholder="例: ヤマダタロウ" className="h-10" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">会計設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-xs font-medium mb-1.5 block">会計年度開始月</Label>
                    <Select value={String(pf.fiscalYearStart)} onValueChange={v => setPf("fiscalYearStart", Number(v))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}月</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs font-medium mb-1.5 block">申告種別</Label>
                    <Select value={pf.filingType} onValueChange={v => setPf("filingType", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="blue">青色申告</SelectItem><SelectItem value="white">白色申告</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">消費税設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-xs font-medium mb-1.5 block">消費税の課税方式</Label>
                    <Select value={pf.consumptionTaxMethod} onValueChange={v => setPf("consumptionTaxMethod", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exempt">免税事業者</SelectItem>
                        <SelectItem value="standard">本則課税</SelectItem>
                        <SelectItem value="simplified">簡易課税</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {pf.consumptionTaxMethod === "exempt" ? "課税売上高1,000万円以下の場合は免税事業者となります" :
                       pf.consumptionTaxMethod === "standard" ? "実際の仕入税額を控除する方式です" :
                       "みなし仕入率を使って簡易的に計算する方式です（課税売上高5,000万円以下）"}
                    </p>
                  </div>
                  {pf.consumptionTaxMethod === "simplified" && (
                    <div><Label className="text-xs font-medium mb-1.5 block">事業区分（簡易課税）</Label>
                      <Select value={String(pf.simplifiedTaxIndustry)} onValueChange={v => setPf("simplifiedTaxIndustry", Number(v))}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">第1種（卸売業）90%</SelectItem>
                          <SelectItem value="2">第2種（小売業）80%</SelectItem>
                          <SelectItem value="3">第3種（製造業等）70%</SelectItem>
                          <SelectItem value="4">第4種（その他）60%</SelectItem>
                          <SelectItem value="5">第5種（サービス業等）50%</SelectItem>
                          <SelectItem value="6">第6種（不動産業）40%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => profileMut.mutate(profileForm)} disabled={profileMut.isPending} className="glow-primary gap-1.5">
                <Save className="h-4 w-4" />{profileMut.isPending ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">取引先一覧</CardTitle>
                <Button size="sm" onClick={openCreateClient} className="glow-primary gap-1"><Plus className="h-3.5 w-3.5" />取引先を追加</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!clientsList || clientsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4"><Users className="h-6 w-6 text-muted-foreground" /></div>
                  <p className="text-base font-medium">取引先がありません</p>
                  <Button onClick={openCreateClient} variant="outline" size="sm" className="mt-4 gap-1"><Plus className="h-3.5 w-3.5" />取引先を追加</Button>
                </div>
              ) : (
                <div className="divide-y">
                  {clientsList.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">{c.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {[c.contactPerson, c.email, c.phone].filter(Boolean).join(" / ") || "詳細未登録"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditClient(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("削除しますか？")) deleteClientMut.mutate({ id: c.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle className="text-lg">{editingClientId ? "取引先を編集" : "取引先を追加"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs font-medium mb-1.5 block">取引先名</Label><Input placeholder="例: 株式会社ABC" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">担当者名</Label><Input placeholder="例: 佐藤花子" value={clientForm.contactPerson} onChange={e => setClientForm({ ...clientForm, contactPerson: e.target.value })} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">メール</Label><Input type="email" placeholder="例: info@abc.co.jp" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className="h-10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium mb-1.5 block">電話番号</Label><Input placeholder="例: 03-1234-5678" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="h-10" /></div>
              <div><Label className="text-xs font-medium mb-1.5 block">郵便番号</Label><Input placeholder="例: 100-0001" value={clientForm.postalCode} onChange={e => setClientForm({ ...clientForm, postalCode: e.target.value })} className="h-10" /></div>
            </div>
            <div><Label className="text-xs font-medium mb-1.5 block">住所</Label><Input placeholder="例: 東京都..." value={clientForm.address} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} className="h-10" /></div>
            <div><Label className="text-xs font-medium mb-1.5 block">メモ</Label><Textarea placeholder="備考" value={clientForm.memo} onChange={e => setClientForm({ ...clientForm, memo: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSaveClient} disabled={createClientMut.isPending || updateClientMut.isPending} className="glow-primary">{editingClientId ? "更新" : "追加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
