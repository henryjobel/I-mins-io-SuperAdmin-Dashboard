import { useState } from "react";
import { AuditLog } from "@/types/admin";

interface UseAuditLogOptions {
  initial: AuditLog[];
  actor: string;
}

export function useAuditLog({ initial, actor }: UseAuditLogOptions) {
  const [entries, setEntries] = useState<AuditLog[]>(initial);

  const append = (action: string, target: string, risk: AuditLog["risk"] = "low") => {
    setEntries((current) => {
      const nextId = nextAuditId(current);
      const nextEntry: AuditLog = {
        id: nextId,
        actor,
        action,
        target,
        risk,
        at: "just now",
      };

      return [nextEntry, ...current].slice(0, 250);
    });
  };

  return { entries, append };
}

function nextAuditId(entries: AuditLog[]) {
  const max = entries.reduce((largest, entry) => {
    const numeric = Number.parseInt(entry.id.replace("AUD-", ""), 10);
    return Number.isNaN(numeric) ? largest : Math.max(largest, numeric);
  }, 700);

  return `AUD-${max + 1}`;
}

