export type SectionId =
  | "overview"
  | "stores"
  | "lifecycle"
  | "admins"
  | "subscriptions"
  | "payment-ops"
  | "support"
  | "health"
  | "ai-usage"
  | "flags"
  | "security"
  | "settings";

export type StorePlan = "Starter" | "Growth" | "Scale";
export type StoreStatus = "active" | "trial" | "suspended";
export type SubscriptionStatus = "active" | "trial" | "past_due" | "cancelled";
export type PublishStatus = "draft" | "published";
export type DomainStatus = "not_connected" | "verifying" | "connected";
export type SslStatus = "inactive" | "pending" | "active";
export type PaymentMode = "test" | "live";
export type AdminRole = "super_admin" | "ops" | "support" | "finance";
export type AdminStatus = "active" | "invited" | "disabled";
export type Priority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";
export type ServiceStatus = "healthy" | "degraded" | "down";

export interface StoreRecord {
  id: string;
  name: string;
  ownerEmail: string;
  plan: StorePlan;
  region: string;
  gmvUsd: number;
  status: StoreStatus;
  createdAt: string;
}

export interface SubscriptionRecord {
  id: string;
  storeId: string;
  storeName: string;
  ownerEmail: string;
  plan: StorePlan;
  status: SubscriptionStatus;
  amountUsd: number;
  nextBillingDate: string;
  expiryDate: string;
  lastPaymentDate: string;
  failedPaymentCount: number;
}

export interface StoreLifecycleRecord {
  storeId: string;
  storeName: string;
  publishStatus: PublishStatus;
  domain: string;
  domainStatus: DomainStatus;
  sslStatus: SslStatus;
  lastPublishedAt: string;
  lastThemeUpdateAt: string;
}

export interface PaymentOpsRecord {
  storeId: string;
  storeName: string;
  stripeEnabled: boolean;
  stripeMode: PaymentMode;
  sslCommerzEnabled: boolean;
  sslCommerzMode: PaymentMode;
  codEnabled: boolean;
  failedCheckout24h: number;
  checkoutSuccessRatePct: number;
}

export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastActive: string;
}

export interface SupportTicket {
  id: string;
  storeName: string;
  category: "payment" | "shipping" | "auth" | "bug";
  priority: Priority;
  status: TicketStatus;
  slaHours: number;
  createdAt: string;
}

export interface ServiceRecord {
  name: string;
  uptimePct: number;
  latencyMs: number;
  status: ServiceStatus;
}

export interface ModelUsageRecord {
  model: string;
  requests: number;
  tokens: number;
  costUsd: number;
  quotaPct: number;
}

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  rolloutPct: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  risk: "low" | "medium" | "high";
  at: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  level: "info" | "warning" | "critical";
  startedAt: string;
  status: "monitoring" | "resolved";
}
