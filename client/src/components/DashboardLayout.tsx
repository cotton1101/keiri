import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BookOpen,
  BarChart3,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  PanelLeft,
  FileCheck,
  Upload,
  Repeat,
  Calculator,
  Receipt,
  Shield,
  Users,
  Crown,
  Camera,
  ScrollText,
} from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const mainMenuItems = [
  { icon: LayoutDashboard, label: "ダッシュボード", path: "/dashboard" },
  { icon: ArrowLeftRight, label: "取引管理", path: "/transactions" },
  { icon: Camera, label: "レシート読取", path: "/receipts" },
  { icon: Repeat, label: "固定費・定期", path: "/recurring" },
  { icon: ScrollText, label: "見積書", path: "/quotes" },
  { icon: FileText, label: "請求書", path: "/invoices" },
  { icon: BookOpen, label: "勘定科目", path: "/accounts" },
];

const reportMenuItems = [
  { icon: BarChart3, label: "レポート", path: "/reports" },
  { icon: FileCheck, label: "確定申告", path: "/tax-filing" },
  { icon: Receipt, label: "消費税", path: "/consumption-tax" },
  { icon: Calculator, label: "税金シミュレーション", path: "/tax-simulator" },
  { icon: Upload, label: "インポート", path: "/import" },
];

const systemMenuItems = [
  { icon: CreditCard, label: "プラン", path: "/plans" },
  { icon: Settings, label: "設定", path: "/settings" },
];

const adminMenuItems = [
  { icon: Shield, label: "管理者", path: "/admin" },
  { icon: Users, label: "ユーザー管理", path: "/admin/users" },
  { icon: Crown, label: "サブスク管理", path: "/admin/subscriptions" },
];

const allMenuItems = [...mainMenuItems, ...reportMenuItems, ...systemMenuItems, ...adminMenuItems];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const activeMenuItem = allMenuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";

  const renderMenuGroup = (items: typeof mainMenuItems, label?: string) => (
    <>
      {label && !isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            {label}
          </span>
        </div>
      )}
      {label && isCollapsed && <div className="h-2" />}
      <SidebarMenu className="space-y-px px-2">
        {items.map((item) => {
          const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path + "/"));
          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={() => setLocation(item.path)}
                tooltip={item.label}
                className={`h-8 transition-all font-normal rounded-lg text-[13px] ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="truncate">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </>
  );

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 transition-all w-full">
            <button
              onClick={toggleSidebar}
              className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              aria-label="Toggle navigation"
            >
              <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
            </button>
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.20_320)] flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="h-3.5 w-3.5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <span className="font-bold tracking-tight truncate text-sm text-sidebar-foreground">
                  カンタン経理
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 overflow-y-auto">
          {renderMenuGroup(mainMenuItems)}
          {renderMenuGroup(reportMenuItems, "レポート")}
          {renderMenuGroup(systemMenuItems)}
          {isAdmin && renderMenuGroup(adminMenuItems, "管理者")}
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-sidebar-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-border">
                  <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/20 to-[oklch(0.55_0.20_320)]/20 text-primary">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                      {user?.name || "-"}
                    </p>
                    {isAdmin && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wide">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-sidebar-foreground/50 truncate mt-1">
                    {user?.email || "-"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>設定</span>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  <span>管理者画面</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>ログアウト</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="font-medium text-sm tracking-tight text-foreground">
                {activeMenuItem?.label ?? "メニュー"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
