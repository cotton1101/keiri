import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import {
  ArrowRight, Check, BarChart3, FileText, Calculator, Shield,
  Zap, Clock, Star, ChevronRight, Receipt, PiggyBank,
  TrendingUp, Users, Sparkles, BookOpen, Download, Mail,
  Camera, Smartphone, CircleDollarSign, ChevronDown,
  LayoutDashboard, FileCheck, Repeat,
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center" aria-hidden="true">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">カンタン経理</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium" aria-label="メインナビゲーション">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">機能</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">使い方</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">料金</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">よくある質問</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">ログイン</Link>
            </Button>
            <Button size="sm" className="glow-primary" asChild>
              <Link href="/register">無料で始める <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
      <section className="relative overflow-hidden" aria-label="ヒーロー">
        <div className="absolute inset-0 animated-gradient opacity-50" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.50 0.22 270 / 0.10) 0%, transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.60 0.20 320 / 0.08) 0%, transparent 40%)"
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                個人事業主のための経理ツール
              </Badge>
              <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-extrabold tracking-tight leading-[1.15]">
                <span className="gradient-text">確定申告</span>まで、
                <br />
                これひとつで
                <br />
                <span className="gradient-text">カンタン</span>に。
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
                取引入力から請求書発行、確定申告書類の作成まで。
                月額<strong className="text-foreground">1,280円</strong>で、
                面倒な経理業務をすべてシンプルに。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <Button size="lg" className="glow-primary text-base px-8 h-12" asChild>
                  <Link href="/register">
                    無料で始める
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-base px-8 h-12" asChild>
                  <a href="#features">
                    機能を見る
                    <ChevronDown className="h-5 w-5 ml-1" />
                  </a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                クレジットカード不要 ・ 15件まで無料で取引登録可能
              </p>
            </div>

            {/* Dashboard Mock */}
            <div className="hidden md:block relative">
              <div className="relative rounded-2xl border bg-background/90 shadow-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="text-xs text-muted-foreground ml-2">カンタン経理 - ダッシュボード</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3">
                    <p className="text-[10px] text-muted-foreground">収入</p>
                    <p className="text-lg font-bold text-emerald-600">¥1,850,000</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-500">+12.5%</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3">
                    <p className="text-[10px] text-muted-foreground">支出</p>
                    <p className="text-lg font-bold text-rose-600">¥620,000</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-rose-500 rotate-180" />
                      <span className="text-[10px] text-rose-500">-3.2%</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3">
                    <p className="text-[10px] text-muted-foreground">利益</p>
                    <p className="text-lg font-bold text-blue-600">¥1,230,000</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Sparkles className="h-3 w-3 text-blue-500" />
                      <span className="text-[10px] text-blue-500">好調</span>
                    </div>
                  </div>
                </div>
                {/* Mini chart mock */}
                <div className="rounded-xl border p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">収支トレンド</span>
                    <span className="text-[10px] text-muted-foreground">2026年</span>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 55, 45, 65, 50, 70, 60, 75, 68, 80, 72, 85].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col gap-0.5">
                        <div className="bg-primary/80 rounded-sm" style={{ height: `${h}%` }} />
                        <div className="bg-rose-400/60 rounded-sm" style={{ height: `${h * 0.35}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Recent transactions mock */}
                <div className="space-y-1.5">
                  {[
                    { desc: "クライアントA - Web制作", amount: "+¥350,000", color: "text-emerald-600" },
                    { desc: "AWS利用料", amount: "-¥12,800", color: "text-rose-600" },
                    { desc: "コワーキングスペース", amount: "-¥22,000", color: "text-rose-600" },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30 text-xs">
                      <span className="text-muted-foreground">{tx.desc}</span>
                      <span className={`font-medium ${tx.color}`}>{tx.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                リアルタイム更新
              </div>
              <div className="absolute -bottom-3 -left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                <Shield className="h-3 w-3" /> SSL暗号化
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "1,280円/月", label: "業界最安クラス", icon: CircleDollarSign },
              { value: "5分", label: "初期設定完了まで", icon: Zap },
              { value: "青色・白色", label: "確定申告対応", icon: FileCheck },
              { value: "無制限", label: "プレミアムの取引数", icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <stat.icon className="h-5 w-5 text-primary mb-2" />
                <p className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">選ばれる理由</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              なぜ<span className="gradient-text">カンタン経理</span>が選ばれるのか
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "圧倒的にシンプル",
                desc: "複雑な設定は不要。アカウント作成後、すぐに取引入力を始められます。簿記の知識がなくても直感的に操作できるUI設計。",
                gradient: "from-amber-500 to-orange-500",
              },
              {
                icon: Shield,
                title: "安心のセキュリティ",
                desc: "SSL暗号化通信、JWTトークン認証、レート制限、CSRFプロテクションなど、エンタープライズレベルのセキュリティ対策。",
                gradient: "from-emerald-500 to-teal-500",
              },
              {
                icon: CircleDollarSign,
                title: "圧倒的な低価格",
                desc: "月額1,280円で全機能が使い放題。他社の半額以下の料金で、確定申告、請求書作成、税金シミュレーションまで対応。",
                gradient: "from-blue-500 to-violet-500",
              },
            ].map((item) => (
              <Card key={item.title} className="border-0 shadow-md overflow-hidden group">
                <CardContent className="p-0">
                  <div className={`h-1.5 bg-gradient-to-r ${item.gradient}`} />
                  <div className="p-7">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-5 shadow-md`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-28 bg-muted/20">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Receipt, title: "取引管理", desc: "収入・支出をワンクリックで記録。85種類の勘定科目がプリセット済み。", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
              { icon: Camera, title: "レシート読取", desc: "スマホで撮影するだけでレシートを自動解析。80以上のキーワードで科目を自動振り分け。", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30", isNew: true },
              { icon: LayoutDashboard, title: "ダッシュボード", desc: "月次収支、年間推移、科目別内訳をリアルタイムで可視化。経営状況が一目でわかります。", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { icon: FileText, title: "請求書作成", desc: "プロフェッショナルな請求書をかんたん作成。PDFダウンロードやメール送信にも対応。", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
              { icon: BookOpen, title: "確定申告", desc: "青色申告決算書・白色収支内訳書を自動生成。面倒な集計作業から解放されます。", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
              { icon: Calculator, title: "税金シミュレーション", desc: "所得税・住民税・事業税・健康保険料をリアルタイムで概算。実効税率も表示。", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
              { icon: CircleDollarSign, title: "消費税計算", desc: "本則課税・簡易課税に対応。業種別みなし仕入率で消費税の納税額を自動計算。", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", isNew: true },
              { icon: Download, title: "データインポート", desc: "freee・弥生・マネーフォワードからのCSVインポートに対応。乗り換えもスムーズ。", color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
              { icon: Repeat, title: "固定費自動記帳", desc: "毎月の家賃や通信費を自動で記帳。定期的な取引の入力忘れを防ぎます。", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
              { icon: Mail, title: "メール送信", desc: "請求書や注文書をワンクリックでメール送信。送信履歴も一元管理できます。", color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
              { icon: PiggyBank, title: "勘定科目管理", desc: "85種類のデフォルト科目に加え、カスタム科目も自由に追加。業種に合わせた設定が可能。", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
              { icon: BarChart3, title: "詳細レポート", desc: "月別・科目別の集計レポート。グラフ表示で経営の傾向を把握できます。", color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30" },
            ].map((feature) => (
              <Card key={feature.title} className="card-hover border-0 shadow-sm relative">
                {"isNew" in feature && feature.isNew && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-rose-500 text-white text-[10px] px-2 py-0.5">NEW</Badge>
                  </div>
                )}
                <CardContent className="p-5">
                  <div className={`h-11 w-11 rounded-xl ${feature.bg} flex items-center justify-center mb-3`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-base font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">かんたん3ステップ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="gradient-text">最短5分</span>で始められます
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              面倒な初期設定は不要。すぐに経理業務をスタートできます
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

            {[
              {
                step: "01",
                title: "無料アカウント作成",
                desc: "メールアドレスとパスワードを入力するだけ。30秒で完了します。",
                icon: Users,
              },
              {
                step: "02",
                title: "取引を入力",
                desc: "収入・支出を選んで金額を入力。勘定科目は85種類がプリセット済み。レシート撮影で自動入力も可能。",
                icon: Receipt,
              },
              {
                step: "03",
                title: "レポート＆確定申告",
                desc: "自動集計されたデータで経営状況を確認。確定申告書類もワンクリックで生成。",
                icon: FileCheck,
              },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg relative z-10">
                  <item.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-bold text-primary">
                  STEP {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2 mt-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="glow-primary text-base px-8 h-12" asChild>
              <Link href="/register">
                今すぐ無料で始める
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Receipt Feature Highlight */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Camera className="h-3 w-3 mr-1.5" />
                新機能
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                レシートを撮るだけで<br /><span className="gradient-text">自動仕訳</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                スマートフォンでレシートを撮影するだけで、金額・日付・取引先を自動認識。
                80以上のキーワードマッチングで勘定科目を自動提案します。
                PDFのアップロードにも対応。
              </p>
              <div className="space-y-4">
                {[
                  { icon: Camera, text: "スマホカメラで撮影 → 自動解析" },
                  { icon: Smartphone, text: "金額・日付・取引先を自動抽出" },
                  { icon: Sparkles, text: "80+キーワードで勘定科目を自動判定" },
                  { icon: FileText, text: "PDF領収書のアップロードにも対応" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt mock card */}
            <div className="relative">
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-primary/5 to-violet-500/5 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                        <Camera className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">レシート読取</p>
                        <p className="text-xs text-muted-foreground">自動解析完了</p>
                      </div>
                      <Badge className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">解析済み</Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-lg bg-background/80 p-3 border">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>取引先</span>
                          <span className="text-foreground font-medium">スターバックス 渋谷店</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>金額</span>
                          <span className="text-foreground font-medium">¥580</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>日付</span>
                          <span className="text-foreground font-medium">2026年3月15日</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>勘定科目</span>
                          <span className="text-primary font-medium">会議費（自動判定）</span>
                        </div>
                      </div>
                      <Button size="sm" className="w-full glow-primary">
                        <Check className="h-4 w-4 mr-1" />
                        取引として登録
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                NEW
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Import Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Card className="border-0 shadow-lg order-2 md:order-1">
              <CardContent className="p-8">
                <div className="space-y-4">
                  {[
                    { name: "freee", color: "bg-blue-500", desc: "freee会計のCSVデータ" },
                    { name: "弥生会計", color: "bg-green-500", desc: "弥生の仕訳データ" },
                    { name: "マネーフォワード", color: "bg-purple-500", desc: "MF会計の取引データ" },
                    { name: "CSV", color: "bg-gray-500", desc: "汎用CSVフォーマット" },
                  ].map((soft) => (
                    <div key={soft.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className={`h-10 w-10 rounded-lg ${soft.color} flex items-center justify-center shrink-0`}>
                        <Download className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{soft.name}</p>
                        <p className="text-xs text-muted-foreground">{soft.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="order-1 md:order-2">
              <Badge variant="secondary" className="mb-4">かんたん乗り換え</Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                他社ソフトからの<span className="gradient-text">乗り換えもスムーズ</span>
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                freee、弥生会計、マネーフォワードなど主要な経理ソフトのCSVデータをそのままインポート。
                過去のデータを活かしながら、すぐにカンタン経理を使い始められます。
              </p>
              <div className="space-y-2.5">
                {["データ移行は数クリックで完了", "過去の取引データをそのまま引き継ぎ", "勘定科目の自動マッピング対応"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 bg-muted/20">
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
                  <Link href="/register">無料で始める</Link>
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
                  <span className="text-4xl font-extrabold gradient-text">¥1,280</span>
                  <span className="text-muted-foreground ml-1">/月（税込）</span>
                </div>
                <Button className="w-full mb-8 glow-primary" asChild>
                  <Link href="/register">プレミアムを始める</Link>
                </Button>
                <div className="space-y-3">
                  {[
                    "取引登録 無制限",
                    "確定申告書類作成（青色・白色）",
                    "税金シミュレーション",
                    "消費税計算（本則・簡易課税）",
                    "レシート読取・自動仕訳",
                    "請求書作成・メール送信",
                    "データインポート（freee/弥生/MF）",
                    "固定費自動記帳",
                    "詳細レポート・科目別集計",
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
      <section className="py-16">
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
                      { feature: "月額料金", us: "1,280円", a: "2,680円〜", b: "2,980円〜" },
                      { feature: "確定申告対応", us: true, a: true, b: true },
                      { feature: "請求書作成", us: true, a: true, b: true },
                      { feature: "レシート読取", us: true, a: true, b: false },
                      { feature: "税金シミュレーション", us: true, a: false, b: false },
                      { feature: "消費税計算", us: true, a: true, b: true },
                      { feature: "他社データインポート", us: true, a: false, b: true },
                      { feature: "固定費自動記帳", us: true, a: true, b: false },
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
      <section id="faq" className="py-20 md:py-28 bg-muted/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold tracking-tight">よくある質問</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "簿記の知識がなくても使えますか？", a: "はい、簿記の知識は不要です。取引の種類（収入・支出）を選んで金額を入力するだけ。勘定科目も85種類がプリセットされているので、迷わず使い始められます。レシート撮影機能を使えば、科目の判定も自動です。" },
              { q: "確定申告の書類はそのまま提出できますか？", a: "カンタン経理で生成される青色申告決算書・白色収支内訳書は、確定申告に必要な情報を網羅しています。生成されたデータを確認の上、e-Taxや紙の申告書に転記してご利用ください。" },
              { q: "他の会計ソフトからの乗り換えは簡単ですか？", a: "freee、弥生会計、マネーフォワードのCSVデータをそのままインポートできます。過去の取引データを引き継いで、すぐにカンタン経理を使い始められます。" },
              { q: "無料プランの制限は何ですか？", a: "無料プランでは取引の登録が15件までとなっています。ダッシュボードや基本レポートは無料でご利用いただけます。本格的にご利用いただく場合は、月額1,280円のプレミアムプランをおすすめします。" },
              { q: "データのセキュリティは大丈夫ですか？", a: "すべてのデータはSSL暗号化された通信で保護されています。JWTトークン認証、レート制限、セキュリティヘッダーなど、エンタープライズレベルのセキュリティ対策を実装しています。" },
              { q: "消費税の計算はできますか？", a: "はい、本則課税と簡易課税の両方に対応しています。業種に応じたみなし仕入率を設定でき、消費税の納税額を自動計算します。免税事業者にも対応しています。" },
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
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-30" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, oklch(0.50 0.22 270 / 0.08) 0%, transparent 60%)"
        }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            今すぐ始めよう
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            今すぐ、経理を<span className="gradient-text">カンタン</span>に。
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            無料プランで今すぐ始められます。クレジットカードは不要です。
            5分で初期設定が完了し、すぐに使い始められます。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="glow-primary text-base px-10 h-12" asChild>
              <Link href="/register">
                無料アカウントを作成
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 h-12" asChild>
              <Link href="/login">
                ログインはこちら
              </Link>
            </Button>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12" role="contentinfo">
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
                <li>レシート読取</li>
                <li>請求書作成</li>
                <li>確定申告</li>
                <li>税金シミュレーション</li>
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
                <li>フリープラン（無料）</li>
                <li>プレミアムプラン（¥1,280/月）</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} カンタン経理. All rights reserved.
          </div>
        </div>
      </footer>

      {/* JSON-LD Structured Data: SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "カンタン経理",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "url": "https://sns-tool.online/keiri/",
            "description": "個人事業主・フリーランス向けのクラウド経理・確定申告ソフト。取引管理、レシート読取、請求書作成、青色・白色確定申告、税金シミュレーション、消費税計算に対応。月額1,280円。",
            "offers": [
              {
                "@type": "Offer",
                "name": "フリープラン",
                "price": "0",
                "priceCurrency": "JPY",
                "description": "取引登録15件まで無料"
              },
              {
                "@type": "Offer",
                "name": "プレミアムプラン",
                "price": "1280",
                "priceCurrency": "JPY",
                "billingIncrement": "P1M",
                "description": "全機能使い放題・取引無制限"
              }
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "150"
            },
            "featureList": [
              "取引管理",
              "レシート読取・自動仕訳",
              "請求書作成・メール送信",
              "青色申告・白色申告対応",
              "税金シミュレーション",
              "消費税計算（本則課税・簡易課税）",
              "データインポート（freee/弥生/マネーフォワード）",
              "固定費自動記帳",
              "ダッシュボード・レポート"
            ]
          })
        }}
      />

      {/* JSON-LD: FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "簿記の知識がなくても使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい、簿記の知識は不要です。取引の種類（収入・支出）を選んで金額を入力するだけ。勘定科目も85種類がプリセットされているので、迷わず使い始められます。レシート撮影機能を使えば、科目の判定も自動です。" } },
              { "@type": "Question", "name": "確定申告の書類はそのまま提出できますか？", "acceptedAnswer": { "@type": "Answer", "text": "カンタン経理で生成される青色申告決算書・白色収支内訳書は、確定申告に必要な情報を網羅しています。生成されたデータを確認の上、e-Taxや紙の申告書に転記してご利用ください。" } },
              { "@type": "Question", "name": "他の会計ソフトからの乗り換えは簡単ですか？", "acceptedAnswer": { "@type": "Answer", "text": "freee、弥生会計、マネーフォワードのCSVデータをそのままインポートできます。過去の取引データを引き継いで、すぐにカンタン経理を使い始められます。" } },
              { "@type": "Question", "name": "無料プランの制限は何ですか？", "acceptedAnswer": { "@type": "Answer", "text": "無料プランでは取引の登録が15件までとなっています。ダッシュボードや基本レポートは無料でご利用いただけます。本格的にご利用いただく場合は、月額1,280円のプレミアムプランをおすすめします。" } },
              { "@type": "Question", "name": "データのセキュリティは大丈夫ですか？", "acceptedAnswer": { "@type": "Answer", "text": "すべてのデータはSSL暗号化された通信で保護されています。JWTトークン認証、レート制限、セキュリティヘッダーなど、エンタープライズレベルのセキュリティ対策を実装しています。" } },
              { "@type": "Question", "name": "消費税の計算はできますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい、本則課税と簡易課税の両方に対応しています。業種に応じたみなし仕入率を設定でき、消費税の納税額を自動計算します。免税事業者にも対応しています。" } },
              { "@type": "Question", "name": "解約はいつでもできますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい、いつでも解約可能です。解約後も無料プランの範囲でデータの閲覧は可能です。" } },
            ]
          })
        }}
      />

      {/* JSON-LD: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "カンタン経理",
            "url": "https://sns-tool.online/keiri/",
            "description": "個人事業主・フリーランスのためのクラウド経理サービス"
          })
        }}
      />

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "ホーム", "item": "https://sns-tool.online/keiri/" }
            ]
          })
        }}
      />
    </div>
  );
}
