import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronRight, Network, CircuitBoard } from "lucide-react";
import { KIND_LABEL, MEM_LABEL, STATIONS, loadDataset, search, type Dataset, type Kind, type Rec } from "@/lib/dcs";
import { DetailPanel } from "@/components/dcs/DetailPanel";
import { KindBadge, StnBadge, stnColor } from "@/components/dcs/badges";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LMYP-1 DCS Reference — I/O, Memory & Wiring Search" },
      { name: "description", content: "Search every DCS address, tag and description across stations 101–105 with full I/O, range, memory and wiring details." },
      { property: "og:title", content: "LMYP-1 DCS Reference" },
      { property: "og:description", content: "One search for addresses, tags, ranges and wiring across all five controllers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Tab = Kind | "all" | "modbus";
const TABS: Tab[] = ["all", "io", "mem", "relay", "ser", "modbus"];
const TAB_LABEL: Record<Tab, string> = { all: "All", ...KIND_LABEL, modbus: "Sub-system" };
const PAGE = 120;

function Index() {
  const { data: ds, isLoading, error } = useQuery({ queryKey: ["dcs"], queryFn: loadDataset, staleTime: Infinity });
  const [q, setQ] = useState("");
  const [stn, setStn] = useState(0);
  const [tab, setTab] = useState<Tab>("all");
  const [group, setGroup] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [sel, setSel] = useState<Rec | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dq = useDeferredValue(q);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => setLimit(PAGE), [dq, stn, tab, group]);
  useEffect(() => setGroup(""), [tab]);

  const base = useMemo(() => (ds ? search(ds, { q: dq, stn, kind: "all", group: "" }) : []), [ds, dq, stn]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: base.length, io: 0, mem: 0, relay: 0, ser: 0 };
    for (const r of base) c[r.kind] = (c[r.kind] ?? 0) + 1;
    return c;
  }, [base]);
  const inTab = useMemo(() => (tab === "all" || tab === "modbus" ? base : base.filter((r) => r.kind === tab)), [base, tab]);
  const groups = useMemo(() => {
    if (tab === "all" || tab === "modbus") return [];
    const m = new Map<string, number>();
    for (const r of inTab) m.set(r.group, (m.get(r.group) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [inTab, tab]);
  const results = useMemo(() => (group ? inTab.filter((r) => r.group === group) : inTab), [inTab, group]);
  const idle = !dq.trim() && tab === "all" && !stn;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 pb-3 pt-3 sm:px-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
              <CircuitBoard className="size-4" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight">LMYP-1 DCS Reference</h1>
              <p className="text-[11px] text-muted-foreground">#1 Unit · Stations 101–105</p>
            </div>
            {ds && (
              <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:block">
                {ds.recs.length.toLocaleString()} records indexed
              </span>
            )}
          </div>
          <label className="group relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search address, tag or description — e.g. AI0128, PT-BR1001, drum level"
              className="h-12 w-full rounded-lg border bg-card pl-10 pr-20 font-mono text-[15px] outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              autoComplete="off"
              spellCheck={false}
              inputMode="search"
            />
            {q ? (
              <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">/</kbd>
            )}
          </label>
          <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <Chip active={stn === 0} onClick={() => setStn(0)}>All stations</Chip>
            {STATIONS.map((s) => (
              <Chip key={s} active={stn === s} onClick={() => setStn(stn === s ? 0 : s)} color={stnColor(s)}>
                STN {s}
              </Chip>
            ))}
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative shrink-0 px-3 py-2.5 text-sm transition-colors ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {TAB_LABEL[t]}
              {t !== "modbus" && ds && <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{(counts[t] ?? 0).toLocaleString()}</span>}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {isLoading && <LoadingState />}
        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">{(error as Error).message}</p>}
        {ds && tab === "modbus" && <ModbusView ds={ds} q={dq} />}
        {ds && tab !== "modbus" && (
          <>
            {idle && <Overview ds={ds} onPick={(s) => setStn(s)} />}
            {groups.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                <Chip small active={!group} onClick={() => setGroup("")}>All types</Chip>
                {groups.map(([g, n]) => (
                  <Chip small key={g} active={group === g} onClick={() => setGroup(group === g ? "" : g)} title={MEM_LABEL[g]}>
                    {g} <span className="ml-1 font-mono text-[10px] opacity-60">{n}</span>
                  </Chip>
                ))}
              </div>
            )}
            {!idle && (
              <>
                <div className="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>{results.length.toLocaleString()} result{results.length === 1 ? "" : "s"}</span>
                  {dq && <span className="hidden sm:inline">Exact address & tag matches first</span>}
                </div>
                {results.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    No match. Try part of a tag (e.g. <span className="font-mono text-foreground">BR1001</span>) or an address without the dot (<span className="font-mono text-foreground">I0000</span>).
                  </div>
                ) : (
                  <ResultList items={results.slice(0, limit)} onOpen={setSel} />
                )}
                {results.length > limit && (
                  <button type="button" onClick={() => setLimit((l) => l + PAGE * 2)} className="mt-3 w-full rounded-lg border bg-card py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    Show more · {(results.length - limit).toLocaleString()} remaining
                  </button>
                )}
              </>
            )}
          </>
        )}
      </main>
      {ds && <DetailPanel rec={sel} ds={ds} onClose={() => setSel(null)} onOpen={setSel} />}
    </div>
  );
}

function Chip({ active, onClick, children, color, small, title }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string; small?: boolean; title?: string | undefined }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition-colors ${small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-[13px]"} ${
        active ? "border-primary/60 bg-primary/15 text-foreground" : "bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

function ResultList({ items, onOpen }: { items: Rec[]; onOpen: (r: Rec) => void }) {
  return (
    <ul className="overflow-hidden rounded-lg border bg-card">
      <li className="hidden grid-cols-[84px_110px_170px_1fr_96px_16px] gap-3 border-b bg-secondary/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <span>Station</span>
        <span>Address</span>
        <span>Tag</span>
        <span>Description</span>
        <span>Type</span>
        <span />
      </li>
      {items.map((r) => (
        <li key={r.id} className="border-b last:border-b-0">
          <button
            type="button"
            onClick={() => onOpen(r)}
            className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none md:grid-cols-[84px_110px_170px_1fr_96px_16px] md:py-2.5"
          >
            <span className="hidden md:block">{r.stn ? <StnBadge stn={r.stn} /> : <span className="text-xs text-muted-foreground">—</span>}</span>
            <span className="flex min-w-0 items-center gap-2 md:contents">
              <span className="font-mono text-sm font-medium text-primary">{r.addr}</span>
              <span className="truncate font-mono text-sm text-foreground md:block">{r.tag || <span className="text-muted-foreground md:inline">—</span>}</span>
            </span>
            <span className="row-span-2 flex items-center gap-2 md:hidden">
              <ChevronRight className="size-4 text-muted-foreground" />
            </span>
            <span className="col-start-1 truncate text-sm text-muted-foreground md:col-start-auto md:text-foreground/85">{r.desc || "—"}</span>
            <span className="col-start-1 flex items-center gap-1.5 md:col-start-auto">
              <span className="md:hidden">{r.stn ? <StnBadge stn={r.stn} /> : null}</span>
              <KindBadge kind={r.kind} group={r.group} />
            </span>
            <ChevronRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary md:block" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Overview({ ds, onPick }: { ds: Dataset; onPick: (s: number) => void }) {
  const stats = useMemo(
    () =>
      STATIONS.map((s) => {
        const io: Record<string, number> = {};
        let mem = 0;
        for (const r of ds.recs) {
          if (r.stn !== s) continue;
          if (r.kind === "io") io[r.group] = (io[r.group] ?? 0) + 1;
          else if (r.kind === "mem") mem++;
        }
        return { s, io, mem, total: Object.values(io).reduce((a, b) => a + b, 0) };
      }),
    [ds],
  );
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Controllers</h2>
          <p className="text-sm text-muted-foreground">Pick a station or start typing to search everything.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(({ s, io, mem, total }) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="group rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50"
            style={{ borderTopColor: stnColor(s), borderTopWidth: 2 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-semibold">STN {s}</span>
              <span className="text-[11px] text-muted-foreground">Station {s - 100}</span>
            </div>
            <div className="mt-3 font-mono text-2xl font-semibold">{total.toLocaleString()}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">I/O points</div>
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.entries(io)
                .sort()
                .map(([g, n]) => (
                  <span key={g} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">
                    {g} {n}
                  </span>
                ))}
            </div>
            <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
              <span className="font-mono text-foreground">{mem.toLocaleString()}</span> memory points
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Network className="size-3.5" /> Also included: IRP/ARP relay panels, SER event points and sub-system Modbus/BC maps.
      </p>
    </section>
  );
}

function ModbusView({ ds, q }: { ds: Dataset; q: string }) {
  const t = q.trim().toLowerCase();
  return (
    <div className="space-y-4">
      {ds.modbus.map((m) => {
        const rows = t ? m.rows.filter((r, i) => i === 0 || r.join(" ").toLowerCase().includes(t)) : m.rows;
        if (t && rows.length <= 1) return null;
        const [head, ...body] = rows;
        return (
          <section key={m.sheet} className="overflow-hidden rounded-lg border bg-card">
            <header className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{m.sheet}</h3>
              <p className="text-xs text-muted-foreground">{m.title}</p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>{(head ?? []).map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {body.map((r, i) => (
                    <tr key={i} className="hover:bg-accent/40">
                      {r.map((c, j) => <td key={j} className={`px-3 py-2 align-top ${j < 3 ? "whitespace-nowrap font-mono" : "min-w-40"}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-card" />
      ))}
    </div>
  );
}
