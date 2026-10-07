import type { Kind } from "@/lib/dcs";

const STN_VAR: Record<number, string> = {
  101: "var(--stn-1)",
  102: "var(--stn-2)",
  103: "var(--stn-3)",
  104: "var(--stn-4)",
  105: "var(--stn-5)",
};

export function stnColor(stn: number) {
  return STN_VAR[stn] ?? "var(--muted-foreground)";
}

export function StnBadge({ stn }: { stn: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium"
      style={{ color: stnColor(stn), borderColor: `color-mix(in oklab, ${stnColor(stn)} 40%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: stnColor(stn) }} />
      STN {stn}
    </span>
  );
}

export function KindBadge({ kind, group }: { kind: Kind; group: string }) {
  const label = kind === "mem" ? `MEM · ${group}` : group;
  return (
    <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-medium text-secondary-foreground">
      {label}
    </span>
  );
}
