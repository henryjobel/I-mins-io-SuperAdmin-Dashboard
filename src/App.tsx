import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bot,
  CreditCard,
  Download,
  Flag,
  Headset,
  LayoutDashboard,
  Lock,
  Plus,
  Server,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ToastItem, ToastViewport } from "@/components/common/ToastViewport";
import { Sidebar } from "@/components/layout/Sidebar";
import { Timeframe, Topbar } from "@/components/layout/Topbar";
import {
  adminRecords,
  auditLogs,
  incidentRecords,
  modelUsageRecords,
  paymentOpsRecords,
  platformFlags,
  serviceRecords,
  storeLifecycleRecords,
  storeRecords,
  subscriptionRecords,
  supportTickets,
} from "@/data/mockData";
import { useAuditLog } from "@/hooks/useAuditLog";
import { AdminRole, SectionId, StorePlan, StoreStatus, SubscriptionStatus } from "@/types/admin";

const navItems: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "stores", label: "Stores", icon: Store },
  { id: "lifecycle", label: "Lifecycle", icon: Activity },
  { id: "admins", label: "Admins", icon: ShieldCheck },
  { id: "subscriptions", label: "Billing", icon: CreditCard },
  { id: "payment-ops", label: "Payment Ops", icon: Wallet },
  { id: "support", label: "Support", icon: Headset },
  { id: "health", label: "Health", icon: Activity },
  { id: "ai-usage", label: "AI Usage", icon: Bot },
  { id: "flags", label: "Feature Flags", icon: Flag },
  { id: "security", label: "Security", icon: Lock },
  { id: "settings", label: "Settings", icon: Settings },
];

const sectionMeta: Record<SectionId, { title: string; subtitle: string }> = {
  overview: {
    title: "Platform Overview",
    subtitle: "Live snapshot of stores, revenue, incident risk, and operational load.",
  },
  stores: {
    title: "Store Directory",
    subtitle: "Manage tenant stores, plans, and account health from one place.",
  },
  lifecycle: {
    title: "Store Lifecycle Monitor",
    subtitle: "Track publishing state, domain setup, SSL readiness, and storefront freshness.",
  },
  admins: {
    title: "Admin Management",
    subtitle: "Roles, account status, and team invite controls for internal operators.",
  },
  subscriptions: {
    title: "Billing and Subscriptions",
    subtitle: "Track platform recurring revenue, recovery, and plan distribution.",
  },
  "payment-ops": {
    title: "Payment Operations",
    subtitle: "Gateway enablement, mode control, and checkout failure monitoring per store.",
  },
  support: {
    title: "Support Queue",
    subtitle: "Prioritize open issues and protect SLA targets across all stores.",
  },
  health: {
    title: "System Health",
    subtitle: "Service uptime, latency, maintenance controls, and incident tracking.",
  },
  "ai-usage": {
    title: "AI Usage",
    subtitle: "Monitor model consumption, cost, and quota allocation.",
  },
  flags: {
    title: "Feature Flags",
    subtitle: "Control rollout strategy and release toggles safely.",
  },
  security: {
    title: "Security and Compliance",
    subtitle: "Audit trail, privileged actions, and platform hardening checklist.",
  },
  settings: {
    title: "Platform Settings",
    subtitle: "Core configuration for operations, alerts, and default behavior.",
  },
};

const roleSectionAccess: Record<AdminRole, SectionId[]> = {
  super_admin: [
    "overview",
    "stores",
    "lifecycle",
    "admins",
    "subscriptions",
    "payment-ops",
    "support",
    "health",
    "ai-usage",
    "flags",
    "security",
    "settings",
  ],
  ops: ["overview", "stores", "lifecycle", "subscriptions", "payment-ops", "support", "health", "ai-usage", "flags"],
  support: ["overview", "stores", "lifecycle", "subscriptions", "support"],
  finance: ["overview", "stores", "subscriptions", "payment-ops"],
};

const demoAccounts: { email: string; password: string; name: string; role: AdminRole }[] = [
  { email: "mahin@nexus.ai", password: "admin123", name: "Mahin Chowdhury", role: "super_admin" },
  { email: "sadia.ops@nexus.ai", password: "ops123", name: "Sadia Noor", role: "ops" },
  { email: "jannat.support@nexus.ai", password: "support123", name: "Jannat Rafi", role: "support" },
  { email: "riyad.finance@nexus.ai", password: "finance123", name: "Riyad Hasan", role: "finance" },
];

const DEFAULT_PLAN_PRICE: Record<StorePlan, number> = {
  Starter: 39,
  Growth: 129,
  Scale: 299,
};

type SortDirection = "asc" | "desc";

interface AuthSession {
  name: string;
  email: string;
  role: AdminRole;
}

function isSection(value: string): value is SectionId {
  return navItems.some((item) => item.id === value);
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  useEffect(() => {
    persistSession(session);
  }, [session]);

  const handleLogin = (email: string, password: string) => {
    const account = demoAccounts.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
    );
    if (!account) return false;

    setSession({ name: account.name, email: account.email, role: account.role });
    return true;
  };

  const handleLogout = () => {
    setSession(null);
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? "/dashboard/overview" : "/login"} replace />} />
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard/overview" replace /> : <LoginPage onLogin={handleLogin} />}
      />
      <Route
        path="/dashboard/:section"
        element={session ? <DashboardPage session={session} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={session ? "/dashboard/overview" : "/login"} replace />} />
    </Routes>
  );
}

function DashboardPage({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const navigate = useNavigate();
  const { section: rawSection = "overview" } = useParams();
  const allowedSections = useMemo(() => roleSectionAccess[session.role] ?? ["overview"], [session.role]);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => allowedSections.includes(item.id)),
    [allowedSections],
  );
  const fallbackSection = allowedSections[0] ?? "overview";
  const section: SectionId =
    isSection(rawSection) && allowedSections.includes(rawSection) ? rawSection : fallbackSection;
  const meta = sectionMeta[section];

  useEffect(() => {
    if (!isSection(rawSection) || !allowedSections.includes(rawSection)) {
      navigate(`/dashboard/${fallbackSection}`, { replace: true });
    }
  }, [allowedSections, fallbackSection, navigate, rawSection]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [stores, setStores] = useState(storeRecords);
  const [lifecycleRows, setLifecycleRows] = useState(storeLifecycleRecords);
  const [subscriptions, setSubscriptions] = useState(subscriptionRecords);
  const [paymentOpsRows, setPaymentOpsRows] = useState(paymentOpsRecords);
  const [admins, setAdmins] = useState(adminRecords);
  const [tickets, setTickets] = useState(supportTickets);
  const [services, setServices] = useState(serviceRecords);
  const [flags, setFlags] = useState(platformFlags);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [storeQuery, setStoreQuery] = useState("");
  const [storeFormOpen, setStoreFormOpen] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({
    name: "",
    ownerEmail: "",
    plan: "Starter" as StorePlan,
    region: "US-East",
    status: "trial" as StoreStatus,
  });
  const [lifecycleQuery, setLifecycleQuery] = useState("");
  const [subscriptionQuery, setSubscriptionQuery] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | SubscriptionStatus>("all");
  const [paymentOpsQuery, setPaymentOpsQuery] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("ops");

  const [settingsForm, setSettingsForm] = useState({
    platformName: "Nexus Commerce Cloud",
    alertEmail: "ops@nexus-cloud.ai",
    defaultCurrency: "USD",
    sessionTimeout: "30",
    webhookRetries: "3",
  });
  const [planSettings, setPlanSettings] = useState({
    starterPrice: String(DEFAULT_PLAN_PRICE.Starter),
    growthPrice: String(DEFAULT_PLAN_PRICE.Growth),
    scalePrice: String(DEFAULT_PLAN_PRICE.Scale),
    trialDays: "7",
    graceDays: "3",
  });
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);

  const [storeSortKey, setStoreSortKey] = useState<"name" | "plan" | "region" | "gmvUsd" | "status">("name");
  const [storeSortDirection, setStoreSortDirection] = useState<SortDirection>("asc");
  const [storePage, setStorePage] = useState(1);

  const [lifecycleSortKey, setLifecycleSortKey] = useState<
    "storeName" | "publishStatus" | "domainStatus" | "sslStatus" | "lastThemeUpdateAt"
  >("storeName");
  const [lifecycleSortDirection, setLifecycleSortDirection] = useState<SortDirection>("asc");
  const [lifecyclePage, setLifecyclePage] = useState(1);

  const [subscriptionSortKey, setSubscriptionSortKey] = useState<
    "storeName" | "plan" | "status" | "nextBillingDate" | "amountUsd" | "failedPaymentCount"
  >("storeName");
  const [subscriptionSortDirection, setSubscriptionSortDirection] = useState<SortDirection>("asc");
  const [subscriptionPage, setSubscriptionPage] = useState(1);

  const [paymentSortKey, setPaymentSortKey] = useState<"storeName" | "failedCheckout24h" | "checkoutSuccessRatePct">("storeName");
  const [paymentSortDirection, setPaymentSortDirection] = useState<SortDirection>("asc");
  const [paymentPage, setPaymentPage] = useState(1);

  const planPrice = useMemo(
    () => ({
      Starter: toNumber(planSettings.starterPrice, DEFAULT_PLAN_PRICE.Starter),
      Growth: toNumber(planSettings.growthPrice, DEFAULT_PLAN_PRICE.Growth),
      Scale: toNumber(planSettings.scalePrice, DEFAULT_PLAN_PRICE.Scale),
    }),
    [planSettings.growthPrice, planSettings.scalePrice, planSettings.starterPrice],
  );

  const canManageStores = session.role === "super_admin" || session.role === "ops";
  const canRemoveStores = session.role === "super_admin";
  const canManageLifecycle = session.role === "super_admin" || session.role === "ops";
  const canManageSubscriptions = session.role !== "support";
  const canManagePaymentOps = session.role === "super_admin" || session.role === "ops" || session.role === "finance";
  const canManageAdmins = session.role === "super_admin";
  const canManageSettings = session.role === "super_admin";

  const { entries: auditEntries, append: appendAudit } = useAuditLog({
    initial: auditLogs,
    actor: session.name,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDataState("ready"), 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setStorePage(1);
  }, [storeQuery, storeSortDirection, storeSortKey]);

  useEffect(() => {
    setLifecyclePage(1);
  }, [lifecycleQuery, lifecycleSortDirection, lifecycleSortKey]);

  useEffect(() => {
    setSubscriptionPage(1);
  }, [subscriptionQuery, subscriptionFilter, subscriptionSortDirection, subscriptionSortKey]);

  useEffect(() => {
    setPaymentPage(1);
  }, [paymentOpsQuery, paymentSortDirection, paymentSortKey]);

  const pushToast = (message: string, tone: ToastItem["tone"] = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3500);
  };

  const requestConfirm = ({
    title,
    message,
    confirmLabel = "Confirm",
    tone = "default",
    onConfirm,
  }: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "default" | "danger";
    onConfirm: () => void;
  }) => {
    setConfirmState({ title, message, confirmLabel, tone, onConfirm });
  };

  const filteredStores = useMemo(() => {
    const key = storeQuery.toLowerCase().trim();
    if (!key) return stores;
    return stores.filter(
      (store) => store.name.toLowerCase().includes(key) || store.ownerEmail.toLowerCase().includes(key) || store.id.includes(key),
    );
  }, [stores, storeQuery]);

  const filteredSubscriptions = useMemo(() => {
    const key = subscriptionQuery.toLowerCase().trim();

    return subscriptions.filter((subscription) => {
      const matchesStatus = subscriptionFilter === "all" || subscription.status === subscriptionFilter;
      const matchesQuery =
        !key ||
        subscription.storeName.toLowerCase().includes(key) ||
        subscription.ownerEmail.toLowerCase().includes(key) ||
        subscription.storeId.toLowerCase().includes(key) ||
        subscription.id.toLowerCase().includes(key);

      return matchesStatus && matchesQuery;
    });
  }, [subscriptions, subscriptionQuery, subscriptionFilter]);

  const filteredLifecycleRows = useMemo(() => {
    const key = lifecycleQuery.toLowerCase().trim();
    if (!key) return lifecycleRows;

    return lifecycleRows.filter(
      (row) =>
        row.storeName.toLowerCase().includes(key) ||
        row.storeId.toLowerCase().includes(key) ||
        row.domain.toLowerCase().includes(key),
    );
  }, [lifecycleRows, lifecycleQuery]);

  const filteredPaymentOpsRows = useMemo(() => {
    const key = paymentOpsQuery.toLowerCase().trim();
    if (!key) return paymentOpsRows;

    return paymentOpsRows.filter(
      (row) => row.storeName.toLowerCase().includes(key) || row.storeId.toLowerCase().includes(key),
    );
  }, [paymentOpsRows, paymentOpsQuery]);

  const sortedStores = useMemo(
    () =>
      [...filteredStores].sort((a, b) => {
        switch (storeSortKey) {
          case "gmvUsd":
            return compareNumbers(a.gmvUsd, b.gmvUsd, storeSortDirection);
          case "name":
            return compareText(a.name, b.name, storeSortDirection);
          case "plan":
            return compareText(a.plan, b.plan, storeSortDirection);
          case "region":
            return compareText(a.region, b.region, storeSortDirection);
          case "status":
            return compareText(a.status, b.status, storeSortDirection);
          default:
            return 0;
        }
      }),
    [filteredStores, storeSortDirection, storeSortKey],
  );

  const sortedLifecycleRows = useMemo(
    () =>
      [...filteredLifecycleRows].sort((a, b) => {
        switch (lifecycleSortKey) {
          case "storeName":
            return compareText(a.storeName, b.storeName, lifecycleSortDirection);
          case "publishStatus":
            return compareText(a.publishStatus, b.publishStatus, lifecycleSortDirection);
          case "domainStatus":
            return compareText(a.domainStatus, b.domainStatus, lifecycleSortDirection);
          case "sslStatus":
            return compareText(a.sslStatus, b.sslStatus, lifecycleSortDirection);
          case "lastThemeUpdateAt":
            return compareDate(a.lastThemeUpdateAt, b.lastThemeUpdateAt, lifecycleSortDirection);
          default:
            return 0;
        }
      }),
    [filteredLifecycleRows, lifecycleSortDirection, lifecycleSortKey],
  );

  const sortedSubscriptions = useMemo(
    () =>
      [...filteredSubscriptions].sort((a, b) => {
        switch (subscriptionSortKey) {
          case "storeName":
            return compareText(a.storeName, b.storeName, subscriptionSortDirection);
          case "plan":
            return compareText(a.plan, b.plan, subscriptionSortDirection);
          case "status":
            return compareText(a.status, b.status, subscriptionSortDirection);
          case "nextBillingDate":
            return compareDate(a.nextBillingDate, b.nextBillingDate, subscriptionSortDirection);
          case "amountUsd":
            return compareNumbers(a.amountUsd, b.amountUsd, subscriptionSortDirection);
          case "failedPaymentCount":
            return compareNumbers(a.failedPaymentCount, b.failedPaymentCount, subscriptionSortDirection);
          default:
            return 0;
        }
      }),
    [filteredSubscriptions, subscriptionSortDirection, subscriptionSortKey],
  );

  const sortedPaymentOpsRows = useMemo(
    () =>
      [...filteredPaymentOpsRows].sort((a, b) => {
        switch (paymentSortKey) {
          case "storeName":
            return compareText(a.storeName, b.storeName, paymentSortDirection);
          case "failedCheckout24h":
            return compareNumbers(a.failedCheckout24h, b.failedCheckout24h, paymentSortDirection);
          case "checkoutSuccessRatePct":
            return compareNumbers(a.checkoutSuccessRatePct, b.checkoutSuccessRatePct, paymentSortDirection);
          default:
            return 0;
        }
      }),
    [filteredPaymentOpsRows, paymentSortDirection, paymentSortKey],
  );

  const storePageData = useMemo(() => paginateRows(sortedStores, storePage, 6), [sortedStores, storePage]);
  const lifecyclePageData = useMemo(
    () => paginateRows(sortedLifecycleRows, lifecyclePage, 6),
    [sortedLifecycleRows, lifecyclePage],
  );
  const subscriptionPageData = useMemo(
    () => paginateRows(sortedSubscriptions, subscriptionPage, 6),
    [sortedSubscriptions, subscriptionPage],
  );
  const paymentPageData = useMemo(
    () => paginateRows(sortedPaymentOpsRows, paymentPage, 6),
    [sortedPaymentOpsRows, paymentPage],
  );

  const activeStores = stores.filter((store) => store.status !== "suspended").length;
  const activeAdmins = admins.filter((admin) => admin.status === "active").length;
  const openTickets = tickets.filter((ticket) => ticket.status !== "resolved").length;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active");
  const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, subscription) => sum + subscription.amountUsd, 0);
  const trialEndingSoon = subscriptions.filter((subscription) => {
    if (subscription.status !== "trial") return false;
    const days = daysUntil(subscription.expiryDate);
    return days >= 0 && days <= 7;
  }).length;
  const pastDueCount = subscriptions.filter((subscription) => subscription.status === "past_due").length;
  const failedCollections = subscriptions.filter((subscription) => subscription.failedPaymentCount > 0).length;
  const publishedStores = lifecycleRows.filter((row) => row.publishStatus === "published").length;
  const domainConnectedStores = lifecycleRows.filter((row) => row.domainStatus === "connected").length;
  const sslPendingStores = lifecycleRows.filter((row) => row.sslStatus === "pending").length;
  const liveGatewayStores = paymentOpsRows.filter(
    (row) =>
      (row.stripeEnabled && row.stripeMode === "live") || (row.sslCommerzEnabled && row.sslCommerzMode === "live"),
  ).length;
  const paymentIssueStores = paymentOpsRows.filter((row) => row.failedCheckout24h >= 3).length;
  const aiCost = modelUsageRecords.reduce((sum, record) => sum + record.costUsd, 0);

  const timeframeLabel = timeframe === "7d" ? "last 7 days" : timeframe === "30d" ? "last 30 days" : "last 90 days";

  const handleInvite = (event: FormEvent) => {
    event.preventDefault();
    if (!canManageAdmins) {
      pushToast("Only super admin can invite internal admins.", "error");
      return;
    }

    const name = inviteName.trim();
    const email = inviteEmail.trim();
    if (!name || !email) return;

    setAdmins((current) => [
      {
        id: `ADM-${String(current.length + 1).padStart(2, "0")}`,
        name,
        email,
        role: inviteRole,
        status: "invited",
        lastActive: "pending",
      },
      ...current,
    ]);

    setInviteName("");
    setInviteEmail("");
    setInviteRole("ops");
    appendAudit("invited admin user", email, "medium");
    pushToast(`Invite sent to ${email}.`, "success");
  };

  const toggleStoreStatus = (storeId: string) => {
    if (!canManageStores) {
      pushToast("You have read-only access for store records.", "error");
      return;
    }

    const target = stores.find((store) => store.id === storeId);
    if (!target) return;

    const nextStatus = target.status === "suspended" ? "active" : "suspended";
    requestConfirm({
      title: nextStatus === "suspended" ? "Suspend Store?" : "Reactivate Store?",
      message: `Store "${target.name}" will be marked as ${nextStatus}.`,
      confirmLabel: nextStatus === "suspended" ? "Suspend" : "Reactivate",
      tone: nextStatus === "suspended" ? "danger" : "default",
      onConfirm: () => {
        setStores((current) =>
          current.map((store) => (store.id === storeId ? { ...store, status: nextStatus } : store)),
        );
        appendAudit(`${nextStatus === "suspended" ? "suspended" : "reactivated"} store`, storeId, "high");
        pushToast(`Store ${nextStatus}.`, "success");
      },
    });
  };

  const resolveTicket = (ticketId: string) => {
    if (!(session.role === "super_admin" || session.role === "ops" || session.role === "support")) {
      pushToast("You do not have access to resolve tickets.", "error");
      return;
    }

    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: "resolved" } : ticket)),
    );
    appendAudit("resolved support ticket", ticketId, "low");
    pushToast("Ticket marked as resolved.", "success");
  };

  const restartService = (serviceName: string) => {
    if (!(session.role === "super_admin" || session.role === "ops")) {
      pushToast("Only super admin or ops can restart services.", "error");
      return;
    }

    setServices((current) =>
      current.map((service) =>
        service.name === serviceName
          ? {
              ...service,
              status: "healthy",
              latencyMs: Math.max(45, service.latencyMs - 35),
              uptimePct: Math.min(99.99, service.uptimePct + 0.2),
            }
          : service,
      ),
    );
    appendAudit("restarted platform service", serviceName, "high");
    pushToast(`${serviceName} restart triggered.`, "info");
  };

  const toggleFlag = (key: string) => {
    if (!(session.role === "super_admin" || session.role === "ops")) {
      pushToast("Only super admin or ops can toggle feature flags.", "error");
      return;
    }

    setFlags((current) => current.map((flag) => (flag.key === key ? { ...flag, enabled: !flag.enabled } : flag)));
    appendAudit("toggled feature flag", key, "medium");
    pushToast(`Feature flag ${key} updated.`, "success");
  };

  const updateSetting = (key: keyof typeof settingsForm, value: string) => {
    setSettingsForm((current) => ({ ...current, [key]: value }));
  };

  const updatePlanSetting = (key: keyof typeof planSettings, value: string) => {
    setPlanSettings((current) => ({ ...current, [key]: value }));
  };

  const retryDataLoad = () => {
    setDataState("loading");
    window.setTimeout(() => {
      setDataState("ready");
      pushToast("Data reloaded successfully.", "success");
    }, 700);
  };

  const exportSubscriptionsCsv = () => {
    const headers = [
      "Subscription ID",
      "Store ID",
      "Store Name",
      "Owner Email",
      "Plan",
      "Status",
      "Amount USD",
      "Next Billing Date",
      "Expiry Date",
      "Last Payment Date",
      "Failed Payment Count",
    ];

    const rows = subscriptions.map((item) => [
      item.id,
      item.storeId,
      item.storeName,
      item.ownerEmail,
      item.plan,
      item.status,
      String(item.amountUsd),
      item.nextBillingDate,
      item.expiryDate,
      item.lastPaymentDate,
      String(item.failedPaymentCount),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subscriptions-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    appendAudit("exported subscriptions csv", "subscriptions-report", "low");
    pushToast("Subscription report downloaded.", "success");
  };

  const updateNewStoreField = (
    key: "name" | "ownerEmail" | "plan" | "region" | "status",
    value: string,
  ) => {
    setNewStoreForm((current) => ({ ...current, [key]: value }));
  };

  const handleAddStore = (event: FormEvent) => {
    event.preventDefault();
    if (!canManageStores) {
      pushToast("Only super admin or ops can add stores.", "error");
      return;
    }

    const name = newStoreForm.name.trim();
    const ownerEmail = newStoreForm.ownerEmail.trim().toLowerCase();
    if (!name || !ownerEmail) return;
    if (stores.some((store) => store.ownerEmail.toLowerCase() === ownerEmail)) {
      pushToast("A store already exists with this owner email.", "error");
      return;
    }

    const today = todayIso();
    const storeId = nextIdFromExisting(stores.map((store) => store.id), "STR-", 1000);
    const subscriptionId = nextIdFromExisting(subscriptions.map((subscription) => subscription.id), "SUB-", 3000);
    const subscriptionStatus: SubscriptionStatus =
      newStoreForm.status === "trial" ? "trial" : newStoreForm.status === "suspended" ? "cancelled" : "active";
    const nextBillingDate =
      subscriptionStatus === "active"
        ? addDaysToIso(today, 30)
        : subscriptionStatus === "trial"
          ? addDaysToIso(today, 7)
          : "N/A";

    setStores((current) => [
      {
        id: storeId,
        name,
        ownerEmail,
        plan: newStoreForm.plan,
        region: newStoreForm.region,
        gmvUsd: 0,
        status: newStoreForm.status,
        createdAt: today,
      },
      ...current,
    ]);

    setSubscriptions((current) => [
      {
        id: subscriptionId,
        storeId,
        storeName: name,
        ownerEmail,
        plan: newStoreForm.plan,
        status: subscriptionStatus,
        amountUsd: subscriptionStatus === "active" ? planPrice[newStoreForm.plan] : 0,
        nextBillingDate,
        expiryDate: nextBillingDate,
        lastPaymentDate: subscriptionStatus === "active" ? today : "N/A",
        failedPaymentCount: 0,
      },
      ...current,
    ]);

    setLifecycleRows((current) => [
      {
        storeId,
        storeName: name,
        publishStatus: "draft",
        domain: "N/A",
        domainStatus: "not_connected",
        sslStatus: "inactive",
        lastPublishedAt: "N/A",
        lastThemeUpdateAt: today,
      },
      ...current,
    ]);

    setPaymentOpsRows((current) => [
      {
        storeId,
        storeName: name,
        stripeEnabled: false,
        stripeMode: "test",
        sslCommerzEnabled: false,
        sslCommerzMode: "test",
        codEnabled: true,
        failedCheckout24h: 0,
        checkoutSuccessRatePct: 100,
      },
      ...current,
    ]);

    setNewStoreForm({
      name: "",
      ownerEmail: "",
      plan: "Starter",
      region: "US-East",
      status: "trial",
    });
    setStoreFormOpen(false);
    appendAudit("created store", storeId, "medium");
    pushToast(`Store ${name} added.`, "success");
  };

  const removeStore = (storeId: string) => {
    if (!canRemoveStores) {
      pushToast("Only super admin can permanently remove stores.", "error");
      return;
    }

    const target = stores.find((store) => store.id === storeId);
    if (!target) return;

    requestConfirm({
      title: "Remove Store Permanently?",
      message: `Store "${target.name}" and related subscription/lifecycle/payment data will be deleted.`,
      confirmLabel: "Remove",
      tone: "danger",
      onConfirm: () => {
        setStores((current) => current.filter((store) => store.id !== storeId));
        setSubscriptions((current) => current.filter((subscription) => subscription.storeId !== storeId));
        setLifecycleRows((current) => current.filter((row) => row.storeId !== storeId));
        setPaymentOpsRows((current) => current.filter((row) => row.storeId !== storeId));
        appendAudit("removed store", storeId, "high");
        pushToast(`Store ${target.name} removed.`, "success");
      },
    });
  };

  const togglePublishStatus = (storeId: string) => {
    if (!canManageLifecycle) {
      pushToast("Only super admin or ops can change publish status.", "error");
      return;
    }

    const today = todayIso();
    setLifecycleRows((current) =>
      current.map((row) =>
        row.storeId === storeId
          ? {
              ...row,
              publishStatus: row.publishStatus === "published" ? "draft" : "published",
              lastPublishedAt: row.publishStatus === "published" ? row.lastPublishedAt : today,
            }
          : row,
        ),
    );
    appendAudit("toggled publish status", storeId, "medium");
    pushToast("Publish status updated.", "success");
  };

  const cycleDomainConnection = (storeId: string) => {
    if (!canManageLifecycle) {
      pushToast("Only super admin or ops can update domain state.", "error");
      return;
    }

    setLifecycleRows((current) =>
      current.map((row) => {
        if (row.storeId !== storeId) return row;

        if (row.domainStatus === "not_connected") {
          return {
            ...row,
            domainStatus: "verifying",
            sslStatus: "pending",
            domain:
              row.domain !== "N/A" ? row.domain : `${row.storeName.toLowerCase().replace(/\s+/g, "")}.shopnexus.app`,
          };
        }

        if (row.domainStatus === "verifying") {
          return { ...row, domainStatus: "connected", sslStatus: "active" };
        }

        return { ...row, domainStatus: "not_connected", sslStatus: "inactive", domain: "N/A" };
      }),
    );
    appendAudit("updated domain connection", storeId, "medium");
    pushToast("Domain workflow step updated.", "success");
  };

  const markThemeUpdated = (storeId: string) => {
    if (!canManageLifecycle) {
      pushToast("Only super admin or ops can update theme freshness.", "error");
      return;
    }

    const today = todayIso();
    setLifecycleRows((current) =>
      current.map((row) => (row.storeId === storeId ? { ...row, lastThemeUpdateAt: today } : row)),
    );
    appendAudit("marked theme synced", storeId, "low");
    pushToast("Theme update timestamp refreshed.", "success");
  };

  const toggleStripe = (storeId: string) => {
    if (!canManagePaymentOps) {
      pushToast("You do not have permission to change payment gateways.", "error");
      return;
    }

    setPaymentOpsRows((current) =>
      current.map((row) => (row.storeId === storeId ? { ...row, stripeEnabled: !row.stripeEnabled } : row)),
    );
    appendAudit("toggled stripe gateway", storeId, "medium");
    pushToast("Stripe setting updated.", "success");
  };

  const toggleSslCommerz = (storeId: string) => {
    if (!canManagePaymentOps) {
      pushToast("You do not have permission to change payment gateways.", "error");
      return;
    }

    setPaymentOpsRows((current) =>
      current.map((row) => (row.storeId === storeId ? { ...row, sslCommerzEnabled: !row.sslCommerzEnabled } : row)),
    );
    appendAudit("toggled sslcommerz gateway", storeId, "medium");
    pushToast("SSLCommerz setting updated.", "success");
  };

  const toggleCod = (storeId: string) => {
    if (!canManagePaymentOps) {
      pushToast("You do not have permission to change payment methods.", "error");
      return;
    }

    setPaymentOpsRows((current) =>
      current.map((row) => (row.storeId === storeId ? { ...row, codEnabled: !row.codEnabled } : row)),
    );
    appendAudit("toggled cod payment", storeId, "low");
    pushToast("COD setting updated.", "success");
  };

  const toggleStripeMode = (storeId: string) => {
    if (!canManagePaymentOps) {
      pushToast("You do not have permission to change gateway mode.", "error");
      return;
    }

    setPaymentOpsRows((current) =>
      current.map((row) =>
        row.storeId === storeId ? { ...row, stripeMode: row.stripeMode === "live" ? "test" : "live" } : row,
      ),
    );
    appendAudit("toggled stripe mode", storeId, "high");
    pushToast("Stripe mode switched.", "info");
  };

  const toggleSslCommerzMode = (storeId: string) => {
    if (!canManagePaymentOps) {
      pushToast("You do not have permission to change gateway mode.", "error");
      return;
    }

    setPaymentOpsRows((current) =>
      current.map((row) =>
        row.storeId === storeId ? { ...row, sslCommerzMode: row.sslCommerzMode === "live" ? "test" : "live" } : row,
      ),
    );
    appendAudit("toggled sslcommerz mode", storeId, "high");
    pushToast("SSLCommerz mode switched.", "info");
  };

  const resetFailedCheckouts = (storeId: string) => {
    if (!canManagePaymentOps) {
      pushToast("You do not have permission to reset checkout counters.", "error");
      return;
    }

    setPaymentOpsRows((current) =>
      current.map((row) =>
        row.storeId === storeId ? { ...row, failedCheckout24h: 0, checkoutSuccessRatePct: Math.max(row.checkoutSuccessRatePct, 98) } : row,
      ),
    );
    appendAudit("reset failed checkout counter", storeId, "medium");
    pushToast("Checkout failure counter reset.", "success");
  };

  const changeSubscriptionPlan = (subscriptionId: string) => {
    if (!canManageSubscriptions) {
      pushToast("You have read-only access to subscriptions.", "error");
      return;
    }

    setSubscriptions((current) =>
      current.map((subscription) => {
        if (subscription.id !== subscriptionId) return subscription;

        const nextPlan: StorePlan =
          subscription.plan === "Starter" ? "Growth" : subscription.plan === "Growth" ? "Scale" : "Starter";
        const nextAmount = subscription.status === "trial" ? 0 : planPrice[nextPlan];

        return { ...subscription, plan: nextPlan, amountUsd: nextAmount };
      }),
    );

    setStores((current) =>
      current.map((store) => {
        const target = subscriptions.find((subscription) => subscription.id === subscriptionId);
        if (!target || store.id !== target.storeId) return store;
        const nextPlan: StorePlan = store.plan === "Starter" ? "Growth" : store.plan === "Growth" ? "Scale" : "Starter";
        return { ...store, plan: nextPlan };
      }),
    );
    appendAudit("changed subscription plan", subscriptionId, "medium");
    pushToast("Subscription plan updated.", "success");
  };

  const extendTrial = (subscriptionId: string) => {
    if (!canManageSubscriptions) {
      pushToast("You have read-only access to subscriptions.", "error");
      return;
    }

    setSubscriptions((current) =>
      current.map((subscription) => {
        if (subscription.id !== subscriptionId || subscription.status !== "trial") return subscription;
        const nextExpiry = addDaysToIso(subscription.expiryDate, 7);

        return {
          ...subscription,
          expiryDate: nextExpiry,
          nextBillingDate: nextExpiry,
          amountUsd: 0,
        };
      }),
    );
    appendAudit("extended trial period", subscriptionId, "low");
    pushToast("Trial extended by 7 days.", "success");
  };

  const markSubscriptionPaid = (subscriptionId: string) => {
    if (!canManageSubscriptions) {
      pushToast("You have read-only access to subscriptions.", "error");
      return;
    }

    const today = todayIso();
    const nextBilling = addDaysToIso(today, 30);

    setSubscriptions((current) =>
      current.map((subscription) => {
        if (subscription.id !== subscriptionId) return subscription;
        if (subscription.status !== "past_due") return subscription;

        return {
          ...subscription,
          status: "active",
          failedPaymentCount: 0,
          lastPaymentDate: today,
          nextBillingDate: nextBilling,
          expiryDate: nextBilling,
          amountUsd: planPrice[subscription.plan],
        };
      }),
    );

    setStores((current) =>
      current.map((store) => {
        const target = subscriptions.find((subscription) => subscription.id === subscriptionId);
        if (!target || store.id !== target.storeId) return store;
        return { ...store, status: "active" };
      }),
    );
    appendAudit("marked subscription paid", subscriptionId, "medium");
    pushToast("Subscription moved to active.", "success");
  };

  const toggleSuspendSubscription = (subscriptionId: string) => {
    if (!canManageSubscriptions) {
      pushToast("You have read-only access to subscriptions.", "error");
      return;
    }

    const target = subscriptions.find((subscription) => subscription.id === subscriptionId);
    if (!target) return;

    const today = todayIso();
    const nextBilling = addDaysToIso(today, 30);
    const isReactivate = target.status === "cancelled";

    requestConfirm({
      title: isReactivate ? "Reactivate Subscription?" : "Suspend Subscription?",
      message: isReactivate
        ? "This store will return to active billing cycle."
        : "This will stop billing and move the store to suspended state.",
      confirmLabel: isReactivate ? "Reactivate" : "Suspend",
      tone: isReactivate ? "default" : "danger",
      onConfirm: () => {
        setSubscriptions((current) =>
          current.map((subscription) => {
            if (subscription.id !== subscriptionId) return subscription;

            if (subscription.status === "cancelled") {
              return {
                ...subscription,
                status: "active",
                amountUsd: planPrice[subscription.plan],
                nextBillingDate: nextBilling,
                expiryDate: nextBilling,
              };
            }

            return {
              ...subscription,
              status: "cancelled",
              nextBillingDate: "N/A",
              expiryDate: today,
            };
          }),
        );

        setStores((current) =>
          current.map((store) => {
            const linked = subscriptions.find((subscription) => subscription.id === subscriptionId);
            if (!linked || store.id !== linked.storeId) return store;

            const nextStoreStatus = linked.status === "cancelled" ? "active" : "suspended";
            return { ...store, status: nextStoreStatus };
          }),
        );

        appendAudit(`${isReactivate ? "reactivated" : "suspended"} subscription`, subscriptionId, "high");
        pushToast(`Subscription ${isReactivate ? "reactivated" : "suspended"}.`, "success");
      },
    });
  };

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Platform MRR"
          value={usd(monthlyRecurringRevenue)}
          delta="+12.6%"
          hint={timeframeLabel}
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Stores"
          value={String(stores.length)}
          delta="+5.1%"
          hint={`${activeStores} active`}
          icon={<Store className="h-4 w-4" />}
        />
        <MetricCard
          title="Active Admins"
          value={String(activeAdmins)}
          delta="+2"
          hint="internal operators"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricCard
          title="AI Cost"
          value={usd(aiCost)}
          delta="+8.4%"
          hint={timeframeLabel}
          icon={<Bot className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Onboarding Funnel" subtitle="Store activation journey">
          <div className="space-y-3">
            {[
              { label: "New Signups", value: 126, width: 100 },
              { label: "Generated Storefront", value: 88, width: 70 },
              { label: "Published Live", value: 71, width: 56 },
              { label: "First Sale", value: 38, width: 30 },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${row.width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Incidents" subtitle="Recent platform events" className="xl:col-span-2">
          <div className="space-y-3">
            {incidentRecords.map((incident) => (
              <div key={incident.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{incident.title}</p>
                  <span className={pillClass(incident.level === "critical" ? "red" : incident.level === "warning" ? "amber" : "slate")}>
                    {incident.level}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {incident.id} - {incident.startedAt} - {incident.status}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );

  const renderStores = () => (
    <SectionCard title="Store Tenants" subtitle="Search and enforce status controls">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={storeQuery}
            onChange={(event) => setStoreQuery(event.target.value)}
            placeholder="Search by store name, email, id"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 md:max-w-sm"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={storeSortKey}
              onChange={(event) =>
                setStoreSortKey(event.target.value as "name" | "plan" | "region" | "gmvUsd" | "status")
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="name">Sort: Name</option>
              <option value="plan">Sort: Plan</option>
              <option value="region">Sort: Region</option>
              <option value="gmvUsd">Sort: GMV</option>
              <option value="status">Sort: Status</option>
            </select>
            <button
              onClick={() => setStoreSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {storeSortDirection === "asc" ? "Asc" : "Desc"}
            </button>
            <button
              onClick={() => setStoreFormOpen((current) => !current)}
              disabled={!canManageStores}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {storeFormOpen ? "Close Form" : "Add Store"}
            </button>
            <div className="text-xs text-slate-500">
              Showing {storePageData.rows.length} of {sortedStores.length}
            </div>
          </div>
        </div>

        {storeFormOpen && canManageStores ? (
          <form
            onSubmit={handleAddStore}
            className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-2 xl:grid-cols-6"
          >
            <input
              value={newStoreForm.name}
              onChange={(event) => updateNewStoreField("name", event.target.value)}
              placeholder="Store name"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              required
            />
            <input
              value={newStoreForm.ownerEmail}
              onChange={(event) => updateNewStoreField("ownerEmail", event.target.value)}
              placeholder="Owner email"
              type="email"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              required
            />
            <select
              value={newStoreForm.plan}
              onChange={(event) => updateNewStoreField("plan", event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="Starter">Starter</option>
              <option value="Growth">Growth</option>
              <option value="Scale">Scale</option>
            </select>
            <input
              value={newStoreForm.region}
              onChange={(event) => updateNewStoreField("region", event.target.value)}
              placeholder="Region"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <select
              value={newStoreForm.status}
              onChange={(event) => updateNewStoreField("status", event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </form>
        ) : null}
      </div>

      {storePageData.rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3">Store</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Region</th>
                <th className="pb-3">GMV</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {storePageData.rows.map((store) => (
                <tr key={store.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">
                    <p className="font-semibold text-slate-800">{store.name}</p>
                    <p className="text-xs text-slate-500">
                      {store.id} - {store.ownerEmail}
                    </p>
                  </td>
                  <td className="py-3">{store.plan}</td>
                  <td className="py-3">{store.region}</td>
                  <td className="py-3">{usd(store.gmvUsd)}</td>
                  <td className="py-3">
                    <span className={pillClass(store.status === "active" ? "green" : store.status === "trial" ? "blue" : "red")}>
                      {store.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => toggleStoreStatus(store.id)}
                        disabled={!canManageStores}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          store.status === "suspended"
                            ? "bg-brand-soft text-brand-deep hover:bg-brand-soft/80"
                            : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {store.status === "suspended" ? "Re-activate" : "Suspend"}
                      </button>
                      <button
                        onClick={() => removeStore(store.id)}
                        disabled={!canRemoveStores}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No store found" description="Try a different search keyword or add a new store." />
      )}

      <PaginationControls
        currentPage={storePageData.page}
        totalPages={storePageData.totalPages}
        totalItems={storePageData.total}
        onPageChange={setStorePage}
      />
    </SectionCard>
  );

  const renderLifecycle = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Published Stores"
          value={String(publishedStores)}
          delta={`${stores.length - publishedStores} drafts`}
          hint="storefront status"
          icon={<Store className="h-4 w-4" />}
        />
        <MetricCard
          title="Domain Connected"
          value={String(domainConnectedStores)}
          delta={`${lifecycleRows.length - domainConnectedStores} pending`}
          hint="DNS health"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="SSL Pending"
          value={String(sslPendingStores)}
          delta="needs follow-up"
          hint="certificate queue"
          icon={<Lock className="h-4 w-4" />}
        />
        <MetricCard
          title="Stale Theme Updates"
          value={String(lifecycleRows.filter((row) => daysSinceIso(row.lastThemeUpdateAt) > 14).length)}
          delta="older than 14 days"
          hint="freshness check"
          icon={<Zap className="h-4 w-4" />}
        />
      </div>

      <SectionCard title="Lifecycle Table" subtitle="Publish, domain, SSL, and update activity by store">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <input
            value={lifecycleQuery}
            onChange={(event) => setLifecycleQuery(event.target.value)}
            placeholder="Search store id, name, domain"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 md:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={lifecycleSortKey}
              onChange={(event) =>
                setLifecycleSortKey(
                  event.target.value as "storeName" | "publishStatus" | "domainStatus" | "sslStatus" | "lastThemeUpdateAt",
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="storeName">Sort: Store</option>
              <option value="publishStatus">Sort: Publish</option>
              <option value="domainStatus">Sort: Domain</option>
              <option value="sslStatus">Sort: SSL</option>
              <option value="lastThemeUpdateAt">Sort: Theme Update</option>
            </select>
            <button
              onClick={() => setLifecycleSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {lifecycleSortDirection === "asc" ? "Asc" : "Desc"}
            </button>
            <div className="text-xs text-slate-500">
              Showing {lifecyclePageData.rows.length} / {sortedLifecycleRows.length}
            </div>
          </div>
        </div>

        {lifecyclePageData.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3">Store</th>
                  <th className="pb-3">Publish</th>
                  <th className="pb-3">Domain</th>
                  <th className="pb-3">SSL</th>
                  <th className="pb-3">Last Publish</th>
                  <th className="pb-3">Theme Update</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lifecyclePageData.rows.map((row) => (
                  <tr key={row.storeId} className="border-b border-slate-100 last:border-0">
                    <td className="py-3">
                      <p className="font-semibold text-slate-800">{row.storeName}</p>
                      <p className="text-xs text-slate-500">{row.storeId}</p>
                    </td>
                    <td className="py-3">
                      <span className={pillClass(row.publishStatus === "published" ? "green" : "amber")}>
                        {row.publishStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-slate-700">{row.domain}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.domainStatus === "not_connected"
                            ? "not connected"
                            : row.domainStatus === "verifying"
                              ? "verifying"
                              : "connected"}
                        </p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={pillClass(
                          row.sslStatus === "active" ? "green" : row.sslStatus === "pending" ? "amber" : "slate",
                        )}
                      >
                        {row.sslStatus}
                      </span>
                    </td>
                    <td className="py-3">{formatDateOrText(row.lastPublishedAt)}</td>
                    <td className="py-3">{formatDateOrText(row.lastThemeUpdateAt)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => togglePublishStatus(row.storeId)}
                          disabled={!canManageLifecycle}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {row.publishStatus === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => cycleDomainConnection(row.storeId)}
                          disabled={!canManageLifecycle}
                          className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-deep hover:bg-brand-soft/80 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {row.domainStatus === "not_connected"
                            ? "Connect Domain"
                            : row.domainStatus === "verifying"
                              ? "Verify DNS"
                              : "Disconnect"}
                        </button>
                        <button
                          onClick={() => markThemeUpdated(row.storeId)}
                          disabled={!canManageLifecycle}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Theme Synced
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No lifecycle record" description="Adjust filters or search to view lifecycle entries." />
        )}

        <PaginationControls
          currentPage={lifecyclePageData.page}
          totalPages={lifecyclePageData.totalPages}
          totalItems={lifecyclePageData.total}
          onPageChange={setLifecyclePage}
        />
      </SectionCard>
    </div>
  );

  const renderPaymentOps = () => {
    const avgSuccessRate = paymentOpsRows.length
      ? paymentOpsRows.reduce((sum, row) => sum + row.checkoutSuccessRatePct, 0) / paymentOpsRows.length
      : 0;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Live Gateway Stores"
            value={String(liveGatewayStores)}
            delta={`${paymentOpsRows.length - liveGatewayStores} on test/off`}
            hint="gateway readiness"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <MetricCard
            title="Checkout Issue Stores"
            value={String(paymentIssueStores)}
            delta="failed checkout >= 3"
            hint="needs review"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Checkout Success"
            value={`${avgSuccessRate.toFixed(1)}%`}
            delta="+1.4%"
            hint={timeframeLabel}
            icon={<Wallet className="h-4 w-4" />}
          />
          <MetricCard
            title="COD Enabled Stores"
            value={String(paymentOpsRows.filter((row) => row.codEnabled).length)}
            delta="fallback method"
            hint="coverage"
            icon={<Store className="h-4 w-4" />}
          />
        </div>

        <SectionCard title="Payment Gateway Matrix" subtitle="Control stripe, sslcommerz, cod, and checkout stability">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <input
              value={paymentOpsQuery}
              onChange={(event) => setPaymentOpsQuery(event.target.value)}
              placeholder="Search by store name or id"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 md:max-w-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={paymentSortKey}
                onChange={(event) =>
                  setPaymentSortKey(event.target.value as "storeName" | "failedCheckout24h" | "checkoutSuccessRatePct")
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="storeName">Sort: Store</option>
                <option value="failedCheckout24h">Sort: Failed Checkout</option>
                <option value="checkoutSuccessRatePct">Sort: Success Rate</option>
              </select>
              <button
                onClick={() => setPaymentSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {paymentSortDirection === "asc" ? "Asc" : "Desc"}
              </button>
              <div className="text-xs text-slate-500">
                Showing {paymentPageData.rows.length} / {sortedPaymentOpsRows.length}
              </div>
            </div>
          </div>

          {paymentPageData.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1140px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3">Store</th>
                    <th className="pb-3">Stripe</th>
                    <th className="pb-3">SSLCommerz</th>
                    <th className="pb-3">COD</th>
                    <th className="pb-3">Failed 24h</th>
                    <th className="pb-3">Success Rate</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentPageData.rows.map((row) => (
                    <tr key={row.storeId} className="border-b border-slate-100 last:border-0">
                      <td className="py-3">
                        <p className="font-semibold text-slate-800">{row.storeName}</p>
                        <p className="text-xs text-slate-500">{row.storeId}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={pillClass(row.stripeEnabled ? "green" : "slate")}>
                            {row.stripeEnabled ? "enabled" : "disabled"}
                          </span>
                          <button
                            onClick={() => toggleStripe(row.storeId)}
                            disabled={!canManagePaymentOps}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Toggle
                          </button>
                          <button
                            onClick={() => toggleStripeMode(row.storeId)}
                            disabled={!canManagePaymentOps}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {row.stripeMode}
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={pillClass(row.sslCommerzEnabled ? "green" : "slate")}>
                            {row.sslCommerzEnabled ? "enabled" : "disabled"}
                          </span>
                          <button
                            onClick={() => toggleSslCommerz(row.storeId)}
                            disabled={!canManagePaymentOps}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Toggle
                          </button>
                          <button
                            onClick={() => toggleSslCommerzMode(row.storeId)}
                            disabled={!canManagePaymentOps}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {row.sslCommerzMode}
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={pillClass(row.codEnabled ? "green" : "slate")}>
                            {row.codEnabled ? "enabled" : "disabled"}
                          </span>
                          <button
                            onClick={() => toggleCod(row.storeId)}
                            disabled={!canManagePaymentOps}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Toggle
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={row.failedCheckout24h >= 3 ? pillClass("red") : pillClass("slate")}>
                          {row.failedCheckout24h}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-700">{row.checkoutSuccessRatePct.toFixed(1)}%</td>
                      <td className="py-3">
                        <button
                          onClick={() => resetFailedCheckouts(row.storeId)}
                          disabled={!canManagePaymentOps}
                          className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-deep hover:bg-brand-soft/80 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset Failures
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No payment records" description="No rows matched the current search/filter criteria." />
          )}

          <PaginationControls
            currentPage={paymentPageData.page}
            totalPages={paymentPageData.totalPages}
            totalItems={paymentPageData.total}
            onPageChange={setPaymentPage}
          />
        </SectionCard>
      </div>
    );
  };

  const renderAdmins = () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <SectionCard title="Admin Accounts" subtitle="Roles and account state" className="xl:col-span-3">
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
            >
              <div>
                <p className="font-semibold text-slate-800">{admin.name}</p>
                <p className="text-xs text-slate-500">
                  {admin.email} - {formatRole(admin.role)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={pillClass(admin.status === "active" ? "green" : admin.status === "invited" ? "amber" : "slate")}>
                  {admin.status}
                </span>
                <span className="text-xs text-slate-500">{admin.lastActive}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Invite Admin" subtitle="Create invite for operator role" className="xl:col-span-2">
        {canManageAdmins ? (
          <form className="space-y-3" onSubmit={handleInvite}>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Full name"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
            />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Work email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <select
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as AdminRole)}
            >
              <option value="ops">Ops</option>
              <option value="support">Support</option>
              <option value="finance">Finance</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              <UserPlus className="h-4 w-4" />
              Send Invite
            </button>
          </form>
        ) : (
          <EmptyState
            title="Restricted"
            description="Only super admin can invite internal admin accounts."
          />
        )}
      </SectionCard>
    </div>
  );

  const renderSubscriptions = () => {
    const plans: StorePlan[] = ["Starter", "Growth", "Scale"];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Active Subscriptions"
            value={String(activeSubscriptions.length)}
            delta="+4.2%"
            hint={timeframeLabel}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <MetricCard
            title="Trial Ending in 7 Days"
            value={String(trialEndingSoon)}
            delta="+1"
            hint="follow-up required"
            icon={<Zap className="h-4 w-4" />}
          />
          <MetricCard
            title="Past Due"
            value={String(pastDueCount)}
            delta={failedCollections ? `${failedCollections} with failures` : "0 failures"}
            hint="needs recovery"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="MRR"
            value={usd(monthlyRecurringRevenue)}
            delta="+9.1%"
            hint="active billing only"
            icon={<Wallet className="h-4 w-4" />}
          />
        </div>

        <SectionCard title="Subscription Ledger" subtitle="Track active, expiring, due, and cancelled subscriptions">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              value={subscriptionQuery}
              onChange={(event) => setSubscriptionQuery(event.target.value)}
              placeholder="Search store, email, subscription id"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 md:max-w-sm"
            />

            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              {(["all", "active", "trial", "past_due", "cancelled"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSubscriptionFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    subscriptionFilter === status ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {status === "past_due" ? "past due" : status}
                </button>
              ))}
            </div>

            <select
              value={subscriptionSortKey}
              onChange={(event) =>
                setSubscriptionSortKey(
                  event.target.value as
                    | "storeName"
                    | "plan"
                    | "status"
                    | "nextBillingDate"
                    | "amountUsd"
                    | "failedPaymentCount",
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="storeName">Sort: Store</option>
              <option value="plan">Sort: Plan</option>
              <option value="status">Sort: Status</option>
              <option value="nextBillingDate">Sort: Next Billing</option>
              <option value="amountUsd">Sort: Amount</option>
              <option value="failedPaymentCount">Sort: Failed Count</option>
            </select>
            <button
              onClick={() => setSubscriptionSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {subscriptionSortDirection === "asc" ? "Asc" : "Desc"}
            </button>
            <button
              onClick={exportSubscriptionsCsv}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>

            <div className="ml-auto text-xs text-slate-500">
              Showing {subscriptionPageData.rows.length} / {sortedSubscriptions.length}
            </div>
          </div>

          {subscriptionPageData.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3">Store</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Next Billing</th>
                    <th className="pb-3">Expiry</th>
                    <th className="pb-3">Last Payment</th>
                    <th className="pb-3">Failed</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionPageData.rows.map((subscription) => (
                    <tr key={subscription.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3">
                        <p className="font-semibold text-slate-800">{subscription.storeName}</p>
                        <p className="text-xs text-slate-500">
                          {subscription.storeId} - {subscription.ownerEmail}
                        </p>
                      </td>
                      <td className="py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-700">{subscription.plan}</p>
                          <p className="text-xs text-slate-500">{subscription.id}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={pillClass(
                            subscription.status === "active"
                              ? "green"
                              : subscription.status === "trial"
                                ? "blue"
                                : subscription.status === "past_due"
                                  ? "amber"
                                  : "red",
                          )}
                        >
                          {subscription.status === "past_due" ? "past due" : subscription.status}
                        </span>
                      </td>
                      <td className="py-3">{formatDateOrText(subscription.nextBillingDate)}</td>
                      <td className="py-3">{formatDateOrText(subscription.expiryDate)}</td>
                      <td className="py-3">{formatDateOrText(subscription.lastPaymentDate)}</td>
                      <td className="py-3">
                        <span
                          className={
                            subscription.failedPaymentCount > 0
                              ? "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
                              : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          }
                        >
                          {subscription.failedPaymentCount}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-700">
                        {subscription.amountUsd > 0 ? usd(subscription.amountUsd) : "Free/Trial"}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => changeSubscriptionPlan(subscription.id)}
                            disabled={!canManageSubscriptions}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Change Plan
                          </button>

                          {subscription.status === "trial" ? (
                            <button
                              onClick={() => extendTrial(subscription.id)}
                              disabled={!canManageSubscriptions}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Extend Trial
                            </button>
                          ) : null}

                          {subscription.status === "past_due" ? (
                            <button
                              onClick={() => markSubscriptionPaid(subscription.id)}
                              disabled={!canManageSubscriptions}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Mark Paid
                            </button>
                          ) : null}

                          <button
                            onClick={() => toggleSuspendSubscription(subscription.id)}
                            disabled={!canManageSubscriptions}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                              subscription.status === "cancelled"
                                ? "bg-brand-soft text-brand-deep hover:bg-brand-soft/80"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {subscription.status === "cancelled" ? "Reactivate" : "Suspend"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No subscriptions found" description="Try changing status filter or search keyword." />
          )}

          <PaginationControls
            currentPage={subscriptionPageData.page}
            totalPages={subscriptionPageData.totalPages}
            totalItems={subscriptionPageData.total}
            onPageChange={setSubscriptionPage}
          />
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SectionCard title="Plan Distribution" subtitle="Current subscription mix" className="xl:col-span-2">
            <div className="space-y-4">
              {plans.map((plan) => {
                const count = subscriptions.filter((subscription) => subscription.plan === plan).length;
                const percent = subscriptions.length ? Math.round((count / subscriptions.length) * 100) : 0;

                return (
                  <div key={plan}>
                    <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                      <span>{plan}</span>
                      <span>
                        {count} stores ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-brand" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Recovery Queue" subtitle="Collections and renewals">
            <p className="text-sm text-slate-500">Past due stores</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{pastDueCount}</p>
            <p className="mt-4 text-sm text-slate-500">Failed collection attempts</p>
            <p className="text-xl font-semibold text-slate-800">{failedCollections}</p>
            <div className="mt-4 rounded-xl border border-sunset/30 bg-sunset-soft/70 p-3 text-xs text-slate-700">
              Tip: Prioritize stores with 2+ failed attempts and expiry within 3 days.
            </div>
          </SectionCard>
        </div>
      </div>
    );
  };

  const renderSupport = () => (
    <SectionCard title="Ticket Queue" subtitle={`${openTickets} unresolved tickets`}>
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">
                  {ticket.id} - {ticket.storeName}
                </p>
                <p className="text-xs text-slate-500">
                  {ticket.category} issue - opened {ticket.createdAt} - SLA {ticket.slaHours}h
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={pillClass(ticket.priority === "high" ? "red" : ticket.priority === "medium" ? "amber" : "blue")}>
                  {ticket.priority}
                </span>
                <span className={pillClass(ticket.status === "resolved" ? "green" : "slate")}>{ticket.status}</span>
                {ticket.status !== "resolved" ? (
                  <button
                    onClick={() => resolveTicket(ticket.id)}
                    className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-deep hover:bg-brand-soft/80"
                  >
                    Mark Resolved
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const renderHealth = () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <SectionCard title="Service Health" subtitle="Uptime and latency overview" className="xl:col-span-2">
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.name} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{service.name}</p>
                  <p className="text-xs text-slate-500">
                    Uptime {service.uptimePct.toFixed(2)}% - Latency {service.latencyMs} ms
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={pillClass(service.status === "healthy" ? "green" : service.status === "degraded" ? "amber" : "red")}>
                    {service.status}
                  </span>
                  {service.status !== "healthy" ? (
                    <button
                      onClick={() => restartService(service.name)}
                      className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-deep hover:bg-brand-soft/80"
                    >
                      Restart
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Safety Controls" subtitle="Global operational switches">
        <div className="space-y-3">
          <button
            onClick={() => setMaintenanceMode((current) => !current)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
              maintenanceMode ? "bg-red-600 text-white hover:bg-red-700" : "bg-brand text-white hover:bg-brand-deep"
            }`}
          >
            {maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
          </button>
          <p className="text-xs text-slate-500">
            Maintenance mode should be enabled only for migrations that require checkout freeze.
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Latest alert</p>
            <p className="mt-1">Checkout worker latency is above baseline. Investigation in progress.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderAIUsage = () => {
    const totalCost = modelUsageRecords.reduce((sum, model) => sum + model.costUsd, 0);

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Model Cost and Quota" subtitle="Provider-level breakdown" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3">Model</th>
                  <th className="pb-3">Requests</th>
                  <th className="pb-3">Tokens</th>
                  <th className="pb-3">Cost</th>
                  <th className="pb-3">Quota</th>
                </tr>
              </thead>
              <tbody>
                {modelUsageRecords.map((model) => (
                  <tr key={model.model} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-semibold text-slate-800">{model.model}</td>
                    <td className="py-3">{model.requests.toLocaleString("en-US")}</td>
                    <td className="py-3">{model.tokens.toLocaleString("en-US")}</td>
                    <td className="py-3">{usd(model.costUsd)}</td>
                    <td className="py-3">
                      <div className="w-36">
                        <div className="mb-1 text-xs text-slate-500">{model.quotaPct}%</div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-brand" style={{ width: `${model.quotaPct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Budget Guardrail" subtitle="AI spend control">
          <p className="text-sm text-slate-500">Current month spend</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{usd(totalCost)}</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-sunset" style={{ width: `${Math.min(100, (totalCost / 150) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Soft limit: $150</p>
          <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Update Hard Cap
          </button>
        </SectionCard>
      </div>
    );
  };

  const renderFlags = () => (
    <SectionCard title="Feature Rollout Matrix" subtitle="Enable features with controlled exposure">
      <div className="space-y-3">
        {flags.map((flag) => (
          <div key={flag.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{flag.key}</p>
                <p className="text-xs text-slate-500">{flag.description}</p>
                <div className="mt-2 h-2 w-44 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${flag.rolloutPct}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Rollout {flag.rolloutPct}%</p>
              </div>

              <button
                onClick={() => toggleFlag(flag.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  flag.enabled ? "bg-brand text-white hover:bg-brand-deep" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {flag.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const renderSecurity = () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <SectionCard title="Audit Trail" subtitle="Privileged action history" className="xl:col-span-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3">Actor</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Target</th>
                <th className="pb-3">Risk</th>
                <th className="pb-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {auditEntries.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 font-semibold text-slate-800">{log.actor}</td>
                  <td className="py-3">{log.action}</td>
                  <td className="py-3">{log.target}</td>
                  <td className="py-3">
                    <span className={pillClass(log.risk === "high" ? "red" : log.risk === "medium" ? "amber" : "green")}>
                      {log.risk}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{log.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Compliance Checklist" subtitle="MVP readiness snapshot">
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <span className={pillClass("green")}>done</span>
            2FA enforced for internal admins
          </li>
          <li className="flex items-center gap-2">
            <span className={pillClass("green")}>done</span>
            Secret rotation policy every 90 days
          </li>
          <li className="flex items-center gap-2">
            <span className={pillClass("amber")}>review</span>
            SIEM log forwarding for all microservices
          </li>
          <li className="flex items-center gap-2">
            <span className={pillClass("amber")}>review</span>
            Data retention policy sign-off
          </li>
        </ul>
        <button
          onClick={() => {
            if (session.role !== "super_admin") {
              pushToast("Only super admin can rotate platform keys.", "error");
              return;
            }
            appendAudit("rotated platform keys", "platform-keys", "high");
            pushToast("Platform keys rotation scheduled.", "success");
          }}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Rotate Platform Keys
        </button>
      </SectionCard>
    </div>
  );

  const renderSettings = () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <SectionCard title="Core Settings" subtitle="Saved locally for backend integration later" className="xl:col-span-2">
        {canManageSettings ? (
          <>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Platform Name">
                <input
                  value={settingsForm.platformName}
                  onChange={(event) => updateSetting("platformName", event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </Field>
              <Field label="Default Currency">
                <input
                  value={settingsForm.defaultCurrency}
                  onChange={(event) => updateSetting("defaultCurrency", event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </Field>
              <Field label="Alert Email">
                <input
                  value={settingsForm.alertEmail}
                  onChange={(event) => updateSetting("alertEmail", event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </Field>
              <Field label="Session Timeout (min)">
                <input
                  value={settingsForm.sessionTimeout}
                  onChange={(event) => updateSetting("sessionTimeout", event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </Field>
              <Field label="Webhook Retry Attempts">
                <input
                  value={settingsForm.webhookRetries}
                  onChange={(event) => updateSetting("webhookRetries", event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </Field>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  appendAudit("saved core settings draft", "platform-settings", "medium");
                  pushToast("Settings draft saved.", "success");
                }}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                Save Draft
              </button>
              <button
                onClick={() => {
                  appendAudit("pushed core settings to production", "platform-settings", "high");
                  pushToast("Settings pushed to production.", "success");
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Push to Production
              </button>
              <button
                onClick={() => setDataState("error")}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Simulate Data Error
              </button>
            </div>
          </>
        ) : (
          <EmptyState title="Restricted" description="Only super admin can modify platform settings." />
        )}
      </SectionCard>

      <SectionCard title="Plan Settings" subtitle="Starter, Growth, Scale pricing and trial policy">
        {canManageSettings ? (
          <div className="space-y-3">
            <Field label="Starter Price (USD)">
              <input
                value={planSettings.starterPrice}
                onChange={(event) => updatePlanSetting("starterPrice", event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </Field>
            <Field label="Growth Price (USD)">
              <input
                value={planSettings.growthPrice}
                onChange={(event) => updatePlanSetting("growthPrice", event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </Field>
            <Field label="Scale Price (USD)">
              <input
                value={planSettings.scalePrice}
                onChange={(event) => updatePlanSetting("scalePrice", event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </Field>
            <Field label="Trial Days">
              <input
                value={planSettings.trialDays}
                onChange={(event) => updatePlanSetting("trialDays", event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </Field>
            <Field label="Grace Period (Days)">
              <input
                value={planSettings.graceDays}
                onChange={(event) => updatePlanSetting("graceDays", event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </Field>
            <button
              onClick={() => {
                setSubscriptions((current) =>
                  current.map((subscription) =>
                    subscription.status === "active"
                      ? { ...subscription, amountUsd: planPrice[subscription.plan] }
                      : subscription,
                  ),
                );
                appendAudit("updated plan settings", "plan-policy", "high");
                pushToast("Plan settings updated and active subscription pricing synced.", "success");
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save Plan Rules
            </button>
          </div>
        ) : (
          <EmptyState title="Restricted" description="Only super admin can update pricing and trial policy." />
        )}
      </SectionCard>
    </div>
  );

  const renderSection = () => {
    switch (section) {
      case "overview":
        return renderOverview();
      case "stores":
        return renderStores();
      case "lifecycle":
        return renderLifecycle();
      case "admins":
        return renderAdmins();
      case "subscriptions":
        return renderSubscriptions();
      case "payment-ops":
        return renderPaymentOps();
      case "support":
        return renderSupport();
      case "health":
        return renderHealth();
      case "ai-usage":
        return renderAIUsage();
      case "flags":
        return renderFlags();
      case "security":
        return renderSecurity();
      case "settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  const renderSectionBody = () => {
    if (dataState === "loading") {
      return <LoadingState />;
    }

    if (dataState === "error") {
      return (
        <ErrorState
          title="Failed to load dashboard data"
          description="The most recent request failed. Retry now or return later."
          onRetry={retryDataLoad}
        />
      );
    }

    return renderSection();
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_12%,rgba(10,127,149,0.10),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(234,123,50,0.14),transparent_34%)]" />

      <Sidebar
        items={visibleNavItems}
        activeSection={section}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(id) => {
          navigate(`/dashboard/${id}`);
          setSidebarOpen(false);
        }}
      />

      <div className="md:pl-[280px]">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onOpenSidebar={() => setSidebarOpen(true)}
          userName={session.name}
          userRole={session.role}
          onLogout={onLogout}
        />

        <main className="space-y-4 px-4 py-5 md:px-8 md:py-6">
          {renderSectionBody()}

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600">
            <Server className="h-4 w-4 text-brand-deep" />
            Backend integration pending.
            <span className="font-semibold text-slate-800">All modules are frontend-ready with mock state and actions.</span>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          confirmState.onConfirm();
          setConfirmState(null);
        }}
      />
      <ToastViewport items={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
    </div>
  );
}

function MetricCard({
  title,
  value,
  delta,
  hint,
  icon,
}: {
  title: string;
  value: string;
  delta: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="animate-enter rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{title}</p>
        <div className="rounded-lg bg-brand-soft p-2 text-brand-deep">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-brand-deep">
        <Zap className="h-3.5 w-3.5" />
        {delta} <span className="text-slate-500">{hint}</span>
      </p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`animate-enter rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] ${className}`}
    >
      <div className="mb-4">
        <h3 className="font-heading text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function formatRole(role: AdminRole) {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "ops":
      return "Operations";
    case "support":
      return "Support";
    case "finance":
      return "Finance";
    default:
      return role;
  }
}

function pillClass(tone: "green" | "amber" | "red" | "blue" | "slate") {
  switch (tone) {
    case "green":
      return "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700";
    case "amber":
      return "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700";
    case "red":
      return "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700";
    case "blue":
      return "rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700";
    case "slate":
      return "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700";
    default:
      return "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700";
  }
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDaysToIso(isoDate: string, days: number) {
  const base = isoDate === "N/A" ? new Date() : new Date(isoDate);
  if (Number.isNaN(base.getTime())) {
    return todayIso();
  }

  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

function formatDateOrText(value: string) {
  if (value === "N/A") return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function daysUntil(isoDate: string) {
  if (isoDate === "N/A") return Number.POSITIVE_INFINITY;

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function daysSinceIso(isoDate: string) {
  if (isoDate === "N/A") return Number.POSITIVE_INFINITY;

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;

  const today = new Date();
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function nextIdFromExisting(existingIds: string[], prefix: string, fallbackStart: number) {
  const max = existingIds.reduce((largest, id) => {
    const numeric = Number.parseInt(id.replace(prefix, ""), 10);
    return Number.isNaN(numeric) ? largest : Math.max(largest, numeric);
  }, fallbackStart);

  return `${prefix}${max + 1}`;
}

function toNumber(value: string, fallback: number) {
  const numeric = Number.parseFloat(value);
  return Number.isNaN(numeric) ? fallback : numeric;
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function compareText(a: string, b: string, direction: SortDirection) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 0;
  const result = left > right ? 1 : -1;
  return direction === "asc" ? result : -result;
}

function compareNumbers(a: number, b: number, direction: SortDirection) {
  const result = a === b ? 0 : a > b ? 1 : -1;
  return direction === "asc" ? result : -result;
}

function compareDate(a: string, b: string, direction: SortDirection) {
  const left = parseDateValue(a);
  const right = parseDateValue(b);
  return compareNumbers(left, right, direction);
}

function parseDateValue(value: string) {
  if (value === "N/A") return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  return parsed.getTime();
}

function paginateRows<T>(rows: T[], requestedPage: number, pageSize: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    rows: rows.slice(start, end),
    page,
    total,
    totalPages,
  };
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white/70" />
      ))}
    </div>
  );
}

function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700" />
        <div>
          <h3 className="font-heading text-lg font-bold text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{description}</p>
          <button
            onClick={onRetry}
            className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => boolean }) {
  const [email, setEmail] = useState("mahin@nexus.ai");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const ok = onLogin(email, password);
    if (!ok) {
      setError("Invalid credentials. Try one of the demo accounts.");
      return;
    }
    setError("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(10,127,149,0.16),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(234,123,50,0.18),transparent_36%)]" />
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">Nexus Cloud</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-slate-900">Super Admin Login</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to access platform controls and audit workflows.</p>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              required
            />
          </Field>

          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}

          <button className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep">
            Sign In
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Demo Accounts</p>
          <p className="mt-1">mahin@nexus.ai / admin123 (super admin)</p>
          <p>sadia.ops@nexus.ai / ops123 (ops)</p>
          <p>jannat.support@nexus.ai / support123 (support)</p>
          <p>riyad.finance@nexus.ai / finance123 (finance)</p>
        </div>
      </div>
    </div>
  );
}

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("super-admin-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.email || !parsed.role || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem("super-admin-session");
    return;
  }
  window.localStorage.setItem("super-admin-session", JSON.stringify(session));
}
