import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { lazy, Suspense } from "react";
import { BASE_PATH } from "./const";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Home = lazy(() => import("./pages/Home"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Reports = lazy(() => import("./pages/Reports"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Quotes = lazy(() => import("./pages/Quotes"));
const QuoteDetail = lazy(() => import("./pages/QuoteDetail"));
const Plans = lazy(() => import("./pages/Plans"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const TaxFiling = lazy(() => import("./pages/TaxFiling"));
const TaxSimulator = lazy(() => import("./pages/TaxSimulator"));
const ConsumptionTax = lazy(() => import("./pages/ConsumptionTax"));
const ImportData = lazy(() => import("./pages/ImportData"));
const Recurring = lazy(() => import("./pages/Recurring"));
const Receipts = lazy(() => import("./pages/Receipts"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">読み込み中...</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/dashboard" component={Home} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/recurring" component={Recurring} />
          <Route path="/receipts" component={Receipts} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/reports" component={Reports} />
          <Route path="/tax-filing" component={TaxFiling} />
          <Route path="/tax-simulator" component={TaxSimulator} />
          <Route path="/consumption-tax" component={ConsumptionTax} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/invoices/:id" component={InvoiceDetail} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/quotes/:id" component={QuoteDetail} />
          <Route path="/import" component={ImportData} />
          <Route path="/plans" component={Plans} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/subscriptions" component={AdminSubscriptions} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route>
          <AppRoutes />
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors closeButton />
          <WouterRouter base={BASE_PATH || undefined}>
            <AppRouter />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
