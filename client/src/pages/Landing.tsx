import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  ArrowRight, Check, BarChart3, FileText, Calculator, Shield,
  Zap, Clock, Star, ChevronRight, Receipt, PiggyBank,
  TrendingUp, Users, Sparkles, BookOpen, Download, Mail,
} from "lucide-react";

export default function Landing() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SEO meta is handled in index.html */}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">カンタン経理</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">機能</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">料金</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">よくある質問</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
            <Button size="sm" className="glow-primary" asChild>
              <a href={getLoginUrl()}>無料で始める <ArrowRight className="h-4 w-4 ml-1" /></a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-50" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 30% 20%, oklch(0.50 0.22 270 / 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, oklch(0.60 0.20 320 / 0.06) 0%, transparent 50%)"
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              個人事業主のための経理ツール
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="gradient-text">確定申告</span>まで、
              <br />
              これひとつで<span className="gradient-text">カンタン</span>に。
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              取引入力から請求書発行、確定申告書類の作成まで。
              月額<strong className="text-foreground">1,980円</strong>で、
              面倒な経理業務をすべてシンプルに。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="glow-primary text-base px-8 h-12" asChild>
                <a href={getLoginUrl()}>
                  無料で始める
                  <ArrowRight className="h-5 w-5 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 h-12" asChild>
                <a href="#features">
                  機能を見る
                  <ChevronRight className="h-5 w-5 ml-1" />
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              クレジットカード不要 ・ 15件まで無料で取引登録可能
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "1,980円/月", label: "業界最安クラス" },
              { value: "5分", label: "初期設定完了まで" },
              { value: "青色・白色", label: "確定申告対応" },
              { value: "無制限", label: "プレミアムの取引数" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">機能一覧</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              経理に必要な機能を、<span className="gradient-text">すべて搭載</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              シンプルなUIで、簿記の知識がなくても直感的に操作できます
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Receipt, title: "取引管理", desc: "収入・支出をワンクリックで記録。勘定科目も自動で提案されるので、迷わず入力できます。", color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: BarChart3, title: "ダッシュボード", desc: "月次収支、年間推移、科目別内訳をリアルタイムで可視化。経営状況が一目でわかります。", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: FileText, title: "請求書作成", desc: "プロフェッショナルな請求書をかんたん作成。PDFダウンロードやメール送信にも対応。", color: "text-violet-600", bg: "bg-violet-50" },
              { icon: BookOpen, title: "確定申告", desc: "青色申告決算書・白色収支内訳書を自動生成。面倒な集計作業から解放されます。", color: "text-amber-600", bg: "bg-amber-50" },
              { icon: Calculator, title: "税金シミュレーション", desc: "所得税・住民税・事業税をリアルタイムで概算。納税額の見通しが立てやすくなります。", color: "text-red-600", bg: "bg-red-50" },
              { icon: Download, title: "データインポート", desc: "freee・弥生・マネーフォワードからのCSVインポートに対応。乗り換えもスムーズです。", color: "text-teal-600", bg: "bg-teal-50" },
              { icon: Clock, title: "固定費自動記帳", desc: "毎月の家賃や通信費を自動で記帳。定期的な取引の入力忘れを防ぎます。", color: "text-orange-600", bg: "bg-orange-50" },
              { icon: Mail, title: "メール送信", desc: "請求書や注文書をワンクリックでメール送信。送信履歴も一元管理できます。", color: "text-pink-600", bg: "bg-pink-50" },
              { icon: PiggyBank, title: "勘定科目管理", desc: "20種類のデフォルト科目に加え、カスタム科目も自由に追加。業種に合わせた設定が可能です。", color: "text-indigo-600", bg: "bg-indigo-50" },
            ].map((feature) => (
              <Card key={feature.title} className="card-hover border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className={`h-12 w-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Import Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">かんたん乗り換え</Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                他社ソフトからの<span className="gradient-text">乗り換えもスムーズ</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                freee、弥生会計、マネーフォワードなど主要な経理ソフトのCSVデータをそのままインポート。
                過去のデータを活かしながら、すぐにカンタン経理を使い始められます。
              </p>
              <div className="space-y-3">
                {["freee会計のCSVデータ", "弥生会計の仕訳データ", "マネーフォワードの取引データ", "汎用CSVフォーマット"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="space-y-4">
                  {[
                    { name: "freee", color: "bg-blue-500" },
                    { name: "弥生会計", color: "bg-green-500" },
                    { name: "マネーフォワード", color: "bg-purple-500" },
                    { name: "CSV", color: "bg-gray-500" },
                  ].map((soft) => (
                    <div key={soft.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className={`h-10 w-10 rounded-lg ${soft.color} flex items-center justify-center`}>
                        <Download className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{soft.name}</p>
                        <p className="text-xs text-muted-foreground">CSVインポート対応</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">料金プラン</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="gradient-text">業界最安クラス</span>の料金設定
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              まずは無料プランでお試しください
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="border-2">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-1">フリープラン</h3>
                <p className="text-sm text-muted-foreground mb-6">まずはお試しで</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">¥0</span>
                  <span className="text-muted-foreground ml-1">/月</span>
                </div>
                <Button variant="outline" className="w-full mb-8" asChild>
                  <a href={getLoginUrl()}>無料で始める</a>
                </Button>
                <div className="space-y-3">
                  {[
                    "取引登録 15件まで",
                    "ダッシュボード",
                    "基本レポート",
                    "勘定科目管理",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-2 border-primary relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-1">
                  <Star className="h-3 w-3 mr-1" /> おすすめ
                </Badge>
              </div>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-1">プレミアムプラン</h3>
                <p className="text-sm text-muted-foreground mb-6">本格的な経理管理に</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold gradient-text">¥1,980</span>
                  <span className="text-muted-foreground ml-1">/月（税込）</span>
                </div>
                <Button className="w-full mb-8 glow-primary" asChild>
                  <a href={getLoginUrl()}>プレミアムを始める</a>
                </Button>
                <div className="space-y-3">
                  {[
                    "取引登録 無制限",
                    "確定申告書類作成（青色・白色）",
                    "税金シミュレーション",
                    "請求書作成・メール送信",
                    "データインポート（freee/弥生/MF）",
                    "固定費自動記帳",
                    "詳細レポート・科目別集計",
                    "取引先管理",
                    "優先サポート",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-center mb-8">他社サービスとの比較</h3>
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-4 font-semibold">機能</th>
                      <th className="p-4 font-semibold text-center">
                        <span className="gradient-text">カンタン経理</span>
                      </th>
                      <th className="p-4 font-semibold text-center text-muted-foreground">A社</th>
                      <th className="p-4 font-semibold text-center text-muted-foreground">B社</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: "月額料金", us: "1,980円", a: "2,680円〜", b: "2,980円〜" },
                      { feature: "確定申告対応", us: true, a: true, b: true },
                      { feature: "請求書作成", us: true, a: true, b: true },
                      { feature: "税金シミュレーション", us: true, a: false, b: false },
                      { feature: "他社データインポート", us: true, a: false, b: true },
                      { feature: "固定費自動記帳", us: true, a: true, b: false },
                      { feature: "メール送信", us: true, a: true, b: true },
                    ].map((row) => (
                      <tr key={row.feature} className="border-t">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className="p-4 text-center">
                          {typeof row.us === "boolean" ? (
                            row.us ? <Check className="h-5 w-5 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="font-bold text-primary">{row.us}</span>
                          )}
                        </td>
                        <td className="p-4 text-center text-muted-foreground">
                          {typeof row.a === "boolean" ? (
                            row.a ? <Check className="h-5 w-5 text-muted-foreground mx-auto" /> : <span>—</span>
                          ) : row.a}
                        </td>
                        <td className="p-4 text-center text-muted-foreground">
                          {typeof row.b === "boolean" ? (
                            row.b ? <Check className="h-5 w-5 text-muted-foreground mx-auto" /> : <span>—</span>
                          ) : row.b}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold tracking-tight">よくある質問</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "簿記の知識がなくても使えますか？", a: "はい、簿記の知識は不要です。取引の種類（収入・支出）を選んで金額を入力するだけ。勘定科目も一般的なものがプリセットされているので、迷わず使い始められます。" },
              { q: "確定申告の書類はそのまま提出できますか？", a: "カンタン経理で生成される青色申告決算書・白色収支内訳書は、確定申告に必要な情報を網羅しています。生成されたデータを確認の上、e-Taxや紙の申告書に転記してご利用ください。" },
              { q: "他の会計ソフトからの乗り換えは簡単ですか？", a: "freee、弥生会計、マネーフォワードのCSVデータをそのままインポートできます。過去の取引データを引き継いで、すぐにカンタン経理を使い始められます。" },
              { q: "無料プランの制限は何ですか？", a: "無料プランでは取引の登録が15件までとなっています。ダッシュボードや基本レポートは無料でご利用いただけます。本格的にご利用いただく場合は、月額1,980円のプレミアムプランをおすすめします。" },
              { q: "データのセキュリティは大丈夫ですか？", a: "すべてのデータは暗号化された通信で保護されています。お客様の経理データは厳重に管理され、第三者に共有されることはありません。" },
              { q: "解約はいつでもできますか？", a: "はい、いつでも解約可能です。解約後も無料プランの範囲でデータの閲覧は可能です。" },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 flex items-start gap-2">
                    <span className="text-primary font-bold">Q.</span>
                    {item.q}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                    <span className="text-primary font-bold mr-1">A.</span>
                    {item.a}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            今すぐ、経理を<span className="gradient-text">カンタン</span>に。
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            無料プランで今すぐ始められます。クレジットカードは不要です。
          </p>
          <Button size="lg" className="glow-primary text-base px-10 h-12" asChild>
            <a href={getLoginUrl()}>
              無料アカウントを作成
              <ArrowRight className="h-5 w-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">カンタン経理</span>
              </div>
              <p className="text-sm text-muted-foreground">
                個人事業主のための
                <br />
                シンプル経理ツール
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">機能</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>取引管理</li>
                <li>請求書作成</li>
                <li>確定申告</li>
                <li>レポート</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">サポート</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>よくある質問</li>
                <li>お問い合わせ</li>
                <li>利用規約</li>
                <li>プライバシーポリシー</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">料金</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>フリープラン</li>
                <li>プレミアムプラン</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} カンタン経理. All rights reserved.
          </div>
        </div>
      </footer>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "カンタン経理",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "個人事業主向けのクラウド経理・確定申告ソフト。取引管理、請求書作成、青色・白色確定申告に対応。月額1,980円。",
            "offers": {
              "@type": "AggregateOffer",
              "lowPrice": "0",
              "highPrice": "1980",
              "priceCurrency": "JPY",
              "offerCount": "2"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "150"
            }
          })
        }}
      />
    </div>
  );
}
