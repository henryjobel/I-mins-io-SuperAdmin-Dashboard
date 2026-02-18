import { Bell, LogOut, Menu, Search } from "lucide-react";
import { AdminRole } from "@/types/admin";

type Timeframe = "7d" | "30d" | "90d";

interface TopbarProps {
  title: string;
  subtitle: string;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onOpenSidebar: () => void;
  userName: string;
  userRole: AdminRole;
  onLogout: () => void;
}

export function Topbar({
  title,
  subtitle,
  timeframe,
  onTimeframeChange,
  onOpenSidebar,
  userName,
  userRole,
  onLogout,
}: TopbarProps) {
  const today = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date());

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 lg:flex">
            <Search className="h-4 w-4" />
            <span>Search stores, admins, tickets</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-1">
            {(["7d", "30d", "90d"] as const).map((option) => (
              <button
                key={option}
                onClick={() => onTimeframeChange(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  timeframe === option ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100">
            <Bell className="h-4 w-4" />
          </button>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
            <p className="text-xs font-semibold text-slate-800">{userName}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{userRole.replace("_", " ")}</p>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">{today}</div>
        </div>
      </div>
    </header>
  );
}

export type { Timeframe };
