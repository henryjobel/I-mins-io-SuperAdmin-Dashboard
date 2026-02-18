import { LucideIcon, X } from "lucide-react";
import { SectionId } from "@/types/admin";

interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
  activeSection: SectionId;
  open: boolean;
  onNavigate: (id: SectionId) => void;
  onClose: () => void;
}

export function Sidebar({ items, activeSection, open, onNavigate, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-slate-200/70 bg-white/90 p-5 shadow-2xl backdrop-blur transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">Nexus Cloud</p>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Super Admin</h1>
            <p className="text-xs text-slate-500">Platform Control Center</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            const active = item.id === activeSection;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? "bg-brand text-white shadow-[0_10px_24px_-14px_rgba(10,127,149,1)]"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-white" : "text-brand-deep"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-sunset/30 bg-sunset-soft/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sunset-deep">Release Window</p>
          <p className="mt-1 text-sm font-medium text-slate-800">v2.1 freeze in 4 days</p>
          <p className="mt-1 text-xs text-slate-600">Review flags and billing migration before release.</p>
        </div>
      </aside>
    </>
  );
}

