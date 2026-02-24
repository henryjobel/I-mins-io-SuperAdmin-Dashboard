import {
  AdminRecord,
  AdminRole,
  AuditLog,
  FeatureFlag,
  IncidentRecord,
  ModelUsageRecord,
  PaymentOpsRecord,
  ServiceRecord,
  StoreLifecycleRecord,
  StorePlan,
  StoreRecord,
  StoreStatus,
  SubscriptionRecord,
  SubscriptionStatus,
  SupportTicket,
} from "@/types/admin";
import { apiRequest, buildQuery, clearAuthTokens, setAuthTokens } from "@/lib/http";

export interface SuperAdminSession {
  name: string;
  email: string;
  role: AdminRole;
}

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface PlatformSettingRecord {
  key: string;
  valueJson: Record<string, unknown>;
}

export interface CoreSettingsPayload {
  platformName: string;
  defaultCurrency: string;
  alertEmail: string;
  sessionTimeout: string;
  webhookRetries: string;
}

export interface PlanSettingsPayload {
  starterPrice: string;
  growthPrice: string;
  scalePrice: string;
  trialDays: string;
  graceDays: string;
}

export interface OverviewResponse {
  stores: number;
  users: number;
  orders: number;
  aiJobs: number;
}

export interface HealthSnapshot {
  services: ServiceRecord[];
  maintenanceMode: boolean;
}

export interface AiUsageSnapshot {
  models: ModelUsageRecord[];
  hardCapUsd: number;
  utilizationPct: number;
}

const DEFAULT_CORE_SETTINGS: CoreSettingsPayload = {
  platformName: "Nexus Commerce Cloud",
  defaultCurrency: "USD",
  alertEmail: "ops@nexus-cloud.ai",
  sessionTimeout: "30",
  webhookRetries: "3",
};

const DEFAULT_PLAN_SETTINGS: PlanSettingsPayload = {
  starterPrice: "39",
  growthPrice: "129",
  scalePrice: "299",
  trialDays: "7",
  graceDays: "3",
};

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function toStorePlan(value: unknown): StorePlan {
  const raw = String(value || "").toLowerCase();
  if (raw === "growth") return "Growth";
  if (raw === "scale") return "Scale";
  return "Starter";
}

function toStoreStatus(value: unknown): StoreStatus {
  const raw = String(value || "").toLowerCase();
  if (raw === "active") return "active";
  if (raw === "suspended") return "suspended";
  return "trial";
}

function toSubscriptionStatus(value: unknown): SubscriptionStatus {
  const raw = String(value || "").toLowerCase();
  if (raw === "active") return "active";
  if (raw === "past_due") return "past_due";
  if (raw === "cancelled") return "cancelled";
  return "trial";
}

function toAdminRole(value: unknown): AdminRole {
  const raw = String(value || "").toLowerCase();
  if (raw === "super_admin") return "super_admin";
  if (raw === "ops") return "ops";
  if (raw === "support") return "support";
  return "finance";
}

function toSessionRole(value: unknown): AdminRole | null {
  const role = toAdminRole(value);
  return role;
}

function normalizeDateValue(value: unknown, fallback = "N/A") {
  return asString(value, fallback);
}

function mapStoreRecord(row: Record<string, unknown>): StoreRecord {
  return {
    id: asString(row.id, ""),
    name: asString(row.name, "Unnamed Store"),
    ownerEmail: asString(row.ownerEmail, "unknown@store.local"),
    plan: toStorePlan(row.plan),
    region: asString(row.region, "US-East"),
    gmvUsd: asNumber(row.gmvUsd, 0),
    status: toStoreStatus(row.status),
    createdAt: normalizeDateValue(row.createdAt, ""),
  };
}

function mapLifecycleRecord(row: Record<string, unknown>): StoreLifecycleRecord {
  const publishRaw = String(row.publishStatus || "").toLowerCase();
  const domainRaw = String(row.domainStatus || "").toLowerCase();
  const sslRaw = String(row.sslStatus || "").toLowerCase();

  return {
    storeId: asString(row.storeId, ""),
    storeName: asString(row.storeName, "Unknown Store"),
    publishStatus: publishRaw === "published" ? "published" : "draft",
    domain: asString(row.domain, "N/A"),
    domainStatus:
      domainRaw === "connected"
        ? "connected"
        : domainRaw === "verifying"
          ? "verifying"
          : "not_connected",
    sslStatus: sslRaw === "active" ? "active" : sslRaw === "pending" ? "pending" : "inactive",
    lastPublishedAt: normalizeDateValue(row.lastPublishedAt),
    lastThemeUpdateAt: normalizeDateValue(row.lastThemeUpdateAt, ""),
  };
}

function mapSubscriptionRecord(row: Record<string, unknown>): SubscriptionRecord {
  return {
    id: asString(row.id, ""),
    storeId: asString(row.storeId, ""),
    storeName: asString(row.storeName, "Unknown Store"),
    ownerEmail: asString(row.ownerEmail, "unknown@store.local"),
    plan: toStorePlan(row.plan),
    status: toSubscriptionStatus(row.status),
    amountUsd: asNumber(row.amountUsd, 0),
    nextBillingDate: normalizeDateValue(row.nextBillingDate),
    expiryDate: normalizeDateValue(row.expiryDate),
    lastPaymentDate: normalizeDateValue(row.lastPaymentDate),
    failedPaymentCount: asNumber(row.failedPaymentCount, 0),
  };
}

function mapPaymentOpsRecord(row: Record<string, unknown>): PaymentOpsRecord {
  return {
    storeId: asString(row.storeId, ""),
    storeName: asString(row.storeName, "Unknown Store"),
    stripeEnabled: asBoolean(row.stripeEnabled, false),
    stripeMode: String(row.stripeMode || "").toLowerCase() === "live" ? "live" : "test",
    sslCommerzEnabled: asBoolean(row.sslCommerzEnabled, false),
    sslCommerzMode: String(row.sslCommerzMode || "").toLowerCase() === "live" ? "live" : "test",
    codEnabled: asBoolean(row.codEnabled, true),
    failedCheckout24h: asNumber(row.failedCheckout24h, 0),
    checkoutSuccessRatePct: asNumber(row.checkoutSuccessRatePct, 0),
  };
}

function mapAdminRecord(row: Record<string, unknown>): AdminRecord {
  const status = String(row.status || "").toLowerCase();
  return {
    id: asString(row.id, ""),
    name: asString(row.name, "Unknown"),
    email: asString(row.email, ""),
    role: toAdminRole(row.role),
    status: status === "active" ? "active" : status === "disabled" ? "disabled" : "invited",
    lastActive: normalizeDateValue(row.lastActive, "N/A"),
  };
}

function mapTicketRecord(row: Record<string, unknown>): SupportTicket {
  const category = String(row.category || "").toLowerCase();
  const status = String(row.status || "").toLowerCase();
  const priority = String(row.priority || "").toLowerCase();

  return {
    id: asString(row.id, ""),
    storeName: asString(row.storeName, "Unknown Store"),
    category:
      category === "payment" || category === "shipping" || category === "auth" ? category : "bug",
    priority: priority === "low" ? "low" : priority === "high" ? "high" : "medium",
    status: status === "resolved" ? "resolved" : status === "in_progress" ? "in_progress" : "open",
    slaHours: asNumber(row.slaHours, 24),
    createdAt: normalizeDateValue(row.createdAt, ""),
  };
}

function mapServiceRecord(row: Record<string, unknown>): ServiceRecord {
  const status = String(row.status || "").toLowerCase();
  return {
    name: asString(row.name, "Unknown Service"),
    uptimePct: asNumber(row.uptimePct, 0),
    latencyMs: asNumber(row.latencyMs, 0),
    status: status === "degraded" ? "degraded" : status === "down" ? "down" : "healthy",
  };
}

function mapModelUsageRecord(row: Record<string, unknown>): ModelUsageRecord {
  return {
    model: asString(row.model, "Unknown Model"),
    requests: asNumber(row.requests, 0),
    tokens: asNumber(row.tokens, 0),
    costUsd: asNumber(row.costUsd, 0),
    quotaPct: asNumber(row.quotaPct, 0),
  };
}

function mapFlagRecord(row: Record<string, unknown>): FeatureFlag {
  return {
    key: asString(row.key, ""),
    description: asString(row.description, ""),
    enabled: asBoolean(row.enabled, false),
    rolloutPct: asNumber(row.rolloutPct, 100),
  };
}

function mapAuditRecord(row: Record<string, unknown>): AuditLog {
  const risk = String(row.risk || "").toLowerCase();
  return {
    id: asString(row.id, ""),
    actor: asString(row.actor, "system"),
    action: asString(row.action, ""),
    target: asString(row.target, ""),
    risk: risk === "high" ? "high" : risk === "medium" ? "medium" : "low",
    at: normalizeDateValue(row.at, ""),
  };
}

function mapIncidentRecord(row: Record<string, unknown>): IncidentRecord {
  const level = String(row.level || "").toLowerCase();
  const status = String(row.status || "").toLowerCase();
  return {
    id: asString(row.id, ""),
    title: asString(row.title, "Untitled incident"),
    level: level === "critical" ? "critical" : level === "info" ? "info" : "warning",
    startedAt: normalizeDateValue(row.startedAt, ""),
    status: status === "resolved" ? "resolved" : "monitoring",
  };
}

export async function loginSuperAdmin(email: string, password: string): Promise<SuperAdminSession> {
  const response = await apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setAuthTokens(response.accessToken, response.refreshToken);
  const role = toSessionRole(response.user.role);
  if (!role) {
    clearAuthTokens();
    throw new Error("Unknown user role");
  }

  if (!["super_admin", "ops", "support", "finance"].includes(role)) {
    clearAuthTokens();
    throw new Error("This account is not authorized for super admin dashboard");
  }

  return {
    name: asString(response.user.name, "Admin"),
    email: asString(response.user.email, email),
    role,
  };
}

export async function fetchOverview() {
  return apiRequest<OverviewResponse>("/api/super-admin/overview");
}

export async function fetchOverviewMetrics(from?: string, to?: string) {
  const path = buildQuery("/api/super-admin/overview/metrics", { from, to });
  return apiRequest<{
    from: string | null;
    to: string | null;
    totalRevenue: number;
    totalOrders: number;
    activeStores: number;
    failedPayments: number;
  }>(path);
}

export async function fetchStores() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/stores");
  return rows.map(mapStoreRecord);
}

export async function createStore(payload: {
  name: string;
  ownerEmail: string;
  plan: StorePlan;
  region: string;
  status: StoreStatus;
}) {
  const row = await apiRequest<Record<string, unknown>>("/api/super-admin/stores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapStoreRecord(row);
}

export async function updateStoreStatus(id: string, status: StoreStatus) {
  const mappedStatus = status === "trial" ? "draft" : status;
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/stores/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: mappedStatus }),
  });
  return mapStoreRecord(row);
}

export async function deleteStore(id: string) {
  return apiRequest<{ deleted: boolean; id: string; name: string }>(`/api/super-admin/stores/${id}`, {
    method: "DELETE",
  });
}

export async function fetchLifecycle() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/lifecycle");
  return rows.map(mapLifecycleRecord);
}

export async function updateLifecycle(
  storeId: string,
  payload: Partial<{
    publishStatus: "draft" | "published";
    domainStatus: "not_connected" | "verifying" | "connected";
    sslStatus: "inactive" | "pending" | "active";
    notes: string;
  }>,
) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/lifecycle/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapLifecycleRecord(row);
}

export async function markThemeSynced(storeId: string, at?: string) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/lifecycle/${storeId}/theme-sync`, {
    method: "POST",
    body: JSON.stringify(at ? { at } : {}),
  });
  return mapLifecycleRecord(row);
}

export async function fetchAdmins() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/admins");
  return rows.map(mapAdminRecord);
}

export async function inviteAdmin(payload: { name: string; email: string; role: AdminRole }) {
  const row = await apiRequest<Record<string, unknown>>("/api/super-admin/admins/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAdminRecord(row);
}

export async function updateAdminStatus(id: string, isActive: boolean) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/admins/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return mapAdminRecord(row);
}

export async function resendAdminInvite(id: string) {
  return apiRequest<{ id: string; resent: boolean; simulated: boolean }>(`/api/super-admin/admins/${id}/resend-invite`, {
    method: "POST",
  });
}

export async function resetAdminPassword(id: string) {
  return apiRequest<{ id: string; resetToken: string; simulated: boolean }>(`/api/super-admin/admins/${id}/reset-password`, {
    method: "POST",
  });
}

export async function fetchSubscriptions() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/subscriptions");
  return rows.map(mapSubscriptionRecord);
}

export async function updateSubscription(
  storeId: string,
  payload: Partial<{
    plan: StorePlan;
    status: SubscriptionStatus;
    nextBillingDate: string;
    expiryDate: string;
  }>,
) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/subscriptions/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapSubscriptionRecord(row);
}

export async function retrySubscription(storeId: string) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/subscriptions/${storeId}/retry`, {
    method: "POST",
  });
  return mapSubscriptionRecord(row);
}

export async function cancelSubscription(storeId: string) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/subscriptions/${storeId}/cancel`, {
    method: "POST",
  });
  return mapSubscriptionRecord(row);
}

export async function syncSubscriptionPricing() {
  return apiRequest<{
    updated: number;
    skipped: number;
    prices: Record<StorePlan, number>;
  }>("/api/super-admin/subscriptions/sync-pricing", {
    method: "POST",
  });
}

export async function fetchPaymentOps() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/payment-ops");
  return rows.map(mapPaymentOpsRecord);
}

export async function updatePaymentOps(
  storeId: string,
  payload: Partial<{
    stripeEnabled: boolean;
    sslCommerzEnabled: boolean;
    codEnabled: boolean;
    mode: "test" | "live";
  }>,
) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/payment-ops/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapPaymentOpsRecord(row);
}

export async function resetPaymentFailures(storeId: string) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/payment-ops/${storeId}/reset-failures`, {
    method: "POST",
  });
  return mapPaymentOpsRecord(row);
}

export async function fetchTickets() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/tickets");
  return rows.map(mapTicketRecord);
}

export async function updateTicket(
  id: string,
  payload: {
    status: "open" | "in_progress" | "resolved";
    note?: string;
    priority?: "low" | "medium" | "high";
  },
) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapTicketRecord(row);
}

export async function fetchHealth() {
  const response = await apiRequest<{
    services: Record<string, unknown>[];
    maintenanceMode?: unknown;
  }>("/api/super-admin/health");
  return {
    services: (response.services || []).map(mapServiceRecord),
    maintenanceMode: asBoolean(response.maintenanceMode, false),
  } satisfies HealthSnapshot;
}

export async function restartService(service: string) {
  return apiRequest<{ service: string; restarted: boolean; mode: string }>(
    `/api/super-admin/health/${encodeURIComponent(service)}/restart`,
    {
      method: "POST",
    },
  );
}

export async function setMaintenanceMode(enabled: boolean) {
  return apiRequest<{
    enabled: boolean;
    updatedAt: string;
  }>("/api/super-admin/health/maintenance", {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

export async function fetchAiUsage() {
  const response = await apiRequest<{
    models: Record<string, unknown>[];
    hardCapUsd?: unknown;
    utilizationPct?: unknown;
  }>("/api/super-admin/ai-usage");
  return {
    models: (response.models || []).map(mapModelUsageRecord),
    hardCapUsd: Math.max(1, asNumber(response.hardCapUsd, 150)),
    utilizationPct: Math.max(0, Math.min(100, asNumber(response.utilizationPct, 0))),
  } satisfies AiUsageSnapshot;
}

export async function updateAiHardCap(hardCapUsd: number) {
  return apiRequest<{ hardCapUsd: number; updatedAt: string }>("/api/super-admin/ai-usage/hard-cap", {
    method: "PATCH",
    body: JSON.stringify({ hardCapUsd }),
  });
}

export async function fetchFlags() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/flags");
  return rows.map(mapFlagRecord);
}

export async function updateFlag(
  key: string,
  payload: { enabled: boolean; description?: string; rolloutPct?: number },
) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/flags/${key}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapFlagRecord(row);
}

export async function fetchAuditLogs() {
  const path = buildQuery("/api/super-admin/audit-logs", { format: "dashboard" });
  const rows = await apiRequest<Record<string, unknown>[]>(path);
  return rows.map(mapAuditRecord);
}

export async function fetchSettings() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/settings");
  return rows.map((row) => ({
    key: asString(row.key, ""),
    valueJson: asRecord(row.valueJson),
  }));
}

export async function patchSetting(key: string, valueJson: Record<string, unknown>) {
  return apiRequest<PlatformSettingRecord>(`/api/super-admin/settings/${key}`, {
    method: "PATCH",
    body: JSON.stringify({ valueJson }),
  });
}

export async function upsertSettingsBatch(values: Record<string, Record<string, unknown>>) {
  return apiRequest<{ updated: number }>("/api/super-admin/settings", {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

export async function fetchIncidents() {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/super-admin/security/incidents");
  return rows.map(mapIncidentRecord);
}

export async function fetchIncident(id: string) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/security/incidents/${id}`);
  return mapIncidentRecord(row);
}

export async function createIncident(payload: {
  title: string;
  level: "info" | "warning" | "critical";
  status?: "monitoring" | "resolved";
  startedAt?: string;
  note?: string;
  resolutionNote?: string;
}) {
  const row = await apiRequest<Record<string, unknown>>("/api/super-admin/security/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapIncidentRecord(row);
}

export async function updateIncident(
  id: string,
  payload: Partial<{
    title: string;
    level: "info" | "warning" | "critical";
    status: "monitoring" | "resolved";
    note: string;
    resolutionNote: string;
  }>,
) {
  const row = await apiRequest<Record<string, unknown>>(`/api/super-admin/security/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapIncidentRecord(row);
}

export async function rotatePlatformKeys() {
  return apiRequest<{
    rotated: boolean;
    keyVersion: number;
    keyId: string;
    rotatedAt: string;
  }>("/api/super-admin/security/rotate-keys", {
    method: "POST",
  });
}

export async function loadSettingsForms() {
  const rows = await fetchSettings();
  const map = new Map(rows.map((item) => [item.key, item.valueJson]));

  const core = asRecord(map.get("super_admin:core_settings"));
  const plans = asRecord(map.get("super_admin:plan_settings"));

  return {
    coreSettings: {
      platformName: asString(core.platformName, DEFAULT_CORE_SETTINGS.platformName),
      defaultCurrency: asString(core.defaultCurrency, DEFAULT_CORE_SETTINGS.defaultCurrency),
      alertEmail: asString(core.alertEmail, DEFAULT_CORE_SETTINGS.alertEmail),
      sessionTimeout: asString(core.sessionTimeout, DEFAULT_CORE_SETTINGS.sessionTimeout),
      webhookRetries: asString(core.webhookRetries, DEFAULT_CORE_SETTINGS.webhookRetries),
    } satisfies CoreSettingsPayload,
    planSettings: {
      starterPrice: asString(plans.starterPrice, DEFAULT_PLAN_SETTINGS.starterPrice),
      growthPrice: asString(plans.growthPrice, DEFAULT_PLAN_SETTINGS.growthPrice),
      scalePrice: asString(plans.scalePrice, DEFAULT_PLAN_SETTINGS.scalePrice),
      trialDays: asString(plans.trialDays, DEFAULT_PLAN_SETTINGS.trialDays),
      graceDays: asString(plans.graceDays, DEFAULT_PLAN_SETTINGS.graceDays),
    } satisfies PlanSettingsPayload,
    rawSettings: rows,
  };
}
