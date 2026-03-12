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
import { Building2, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

type ProfileForm = {
  businessName: string;
  representativeName: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountName: string;
  fiscalYearStart: number;
};

type ClientForm = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  postalCode: string;
  address: string;
  memo: string;
};

const emptyProfile: ProfileForm = {
  businessName: "", representativeName: "", postalCode: "", address: "",
  phone: "", email: "", taxId: "", bankName: "", bankBranch: "",
  bankAccountType: "普通", bankAccountNumber: "", bankAccountName: "", fiscalYearStart: 1,
};

const emptyClient: ClientForm = {
  name: "", contactPerson: "", email: "", phone: "", postalCode: "", address: "", memo: "",
};

export default function SettingsPage() {
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);

  const utils = trpc.useUtils();
  const { data: profile, isLoading: profileLoading } = trpc.businessProfile.get.useQuery();
  const { data: clientsList, isLoading: clientsLoading } = trpc.clients.list.useQuery();

  const profileMut = trpc.businessProfile.upsert.useMutation({
    onSuccess: () => { utils.businessProfile.invalidate(); toast.success("事業者情報を保存しました"); },
    onError: (e) => toast.error(e.message),
  });
  const createClientMut = trpc.clients.create.useMutation({
    onSuccess: () => { utils.clients.invalidate(); toast.success("取引先を追加しました"); setClientDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateClientMut = trpc.clients.update.useMutation({
    onSuccess: () => { utils.clients.invalidate(); toast.success("取引先を更新しました"); setClientDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteClientMut = trpc.clients.delete.useMutation({
    onSuccess: () => { utils.clients.invalidate(); toast.success("取引先を削除しました"); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        businessName: profile.businessName || "",
        representativeName: profile.representativeName || "",
        postalCode: profile.postalCode || "",
        address: profile.address || "",
        phone: profile.phone || "",
        email: profile.email || "",
        taxId: profile.taxId || "",
        bankName: profile.bankName || "",
        bankBranch: profile.bankBranch || "",
        bankAccountType: profile.bankAccountType || "普通",
        bankAccountNumber: profile.bankAccountNumber || "",
        bankAccountName: profile.bankAccountName || "",
        fiscalYearStart: profile.fiscalYearStart || 1,
      });
    }
  }, [profile]);

  function handleSaveProfile() {
    profileMut.mutate(profileForm);
  }

  function openCreateClient() {
    setEditingClientId(null);
    setClientForm(emptyClient);
    setClientDialogOpen(true);
  }

  function openEditClient(client: any) {
    setEditingClientId(client.id);
    setClientForm({
      name: client.name, contactPerson: client.contactPerson || "",
      email: client.email || "", phone: client.phone || "",
      postalCode: client.postalCode || "", address: client.address || "",
      memo: client.memo || "",
    });
    setClientDialogOpen(true);
  }

  function handleSaveClient() {
    if (!clientForm.name.trim()) { toast.error("取引先名を入力してください"); return; }
    if (editingClientId) {
      updateClientMut.mutate({ id: editingClientId, ...clientForm });
    } else {
      createClientMut.mutate(clientForm);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="text-muted-foreground text-sm mt-1">事業者情報と各種設定</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business" className="gap-2"><Building2 className="h-4 w-4" />事業者情報</TabsTrigger>
          <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" />取引先管理</TabsTrigger>
        </TabsList>

        {/* Business Profile */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">事業者情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">読み込み中...</div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">基本情報</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1.5 block">事業者名（屋号）</Label>
                        <Input value={profileForm.businessName} onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })} placeholder="例: 山田デザイン事務所" />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">代表者名</Label>
                        <Input value={profileForm.representativeName} onChange={(e) => setProfileForm({ ...profileForm, representativeName: e.target.value })} placeholder="例: 山田太郎" />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">郵便番号</Label>
                        <Input value={profileForm.postalCode} onChange={(e) => setProfileForm({ ...profileForm, postalCode: e.target.value })} placeholder="例: 100-0001" />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">電話番号</Label>
                        <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="例: 03-1234-5678" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">住所</Label>
                      <Input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} placeholder="例: 東京都千代田区..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1.5 block">メールアドレス</Label>
                        <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="例: info@example.com" />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">インボイス登録番号</Label>
                        <Input value={profileForm.taxId} onChange={(e) => setProfileForm({ ...profileForm, taxId: e.target.value })} placeholder="例: T1234567890123" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-sm font-semibold text-muted-foreground">振込先情報</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm mb-1.5 block">銀行名</Label>
                        <Input value={profileForm.bankName} onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })} placeholder="例: 三菱UFJ銀行" />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">支店名</Label>
                        <Input value={profileForm.bankBranch} onChange={(e) => setProfileForm({ ...profileForm, bankBranch: e.target.value })} placeholder="例: 東京支店" />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">口座種別</Label>
                        <Select value={profileForm.bankAccountType} onValueChange={(v) => setProfileForm({ ...profileForm, bankAccountType: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="普通">普通</SelectItem>
                            <SelectItem value="当座">当座</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1.5 block">口座番号</Label>
                        <Input value={profileForm.bankAccountNumber} onChange={(e) => setProfileForm({ ...profileForm, bankAccountNumber: e.target.value })} placeholder="例: 1234567" />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">口座名義</Label>
                        <Input value={profileForm.bankAccountName} onChange={(e) => setProfileForm({ ...profileForm, bankAccountName: e.target.value })} placeholder="例: ヤマダタロウ" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-sm font-semibold text-muted-foreground">会計設定</h3>
                    <div className="max-w-xs">
                      <Label className="text-sm mb-1.5 block">会計年度開始月</Label>
                      <Select value={String(profileForm.fiscalYearStart)} onValueChange={(v) => setProfileForm({ ...profileForm, fiscalYearStart: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}月</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveProfile} disabled={profileMut.isPending}>
                      保存する
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients */}
        <TabsContent value="clients">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">取引先一覧</CardTitle>
              <Button size="sm" onClick={openCreateClient} className="gap-2">
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {clientsLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>
              ) : !clientsList || clientsList.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">取引先がありません</p>
                  <Button variant="outline" className="mt-4" onClick={openCreateClient}>取引先を追加する</Button>
                </div>
              ) : (
                <div className="divide-y">
                  {clientsList.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{client.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {client.contactPerson && <span className="text-xs text-muted-foreground">{client.contactPerson}</span>}
                          {client.email && <span className="text-xs text-muted-foreground">{client.email}</span>}
                          {client.phone && <span className="text-xs text-muted-foreground">{client.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditClient(client)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("この取引先を削除しますか？")) deleteClientMut.mutate({ id: client.id }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClientId ? "取引先を編集" : "取引先を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">取引先名</Label>
              <Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="例: 株式会社ABC" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">担当者名</Label>
                <Input value={clientForm.contactPerson} onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })} placeholder="例: 田中一郎" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">電話番号</Label>
                <Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="例: 03-1234-5678" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">メールアドレス</Label>
                <Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} placeholder="例: info@abc.co.jp" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">郵便番号</Label>
                <Input value={clientForm.postalCode} onChange={(e) => setClientForm({ ...clientForm, postalCode: e.target.value })} placeholder="例: 100-0001" />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">住所</Label>
              <Input value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} placeholder="例: 東京都千代田区..." />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">メモ</Label>
              <Textarea value={clientForm.memo} onChange={(e) => setClientForm({ ...clientForm, memo: e.target.value })} placeholder="備考（任意）" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSaveClient} disabled={createClientMut.isPending || updateClientMut.isPending}>
              {editingClientId ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
