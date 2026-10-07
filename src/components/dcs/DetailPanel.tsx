import { Check, Copy, ArrowRight, Cable, Cpu, Gauge, Link2, Tag, Bell } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { KIND_LABEL, MEM_LABEL, keyOf, related, type Dataset, type Rec } from "@/lib/dcs";
import { KindBadge, StnBadge } from "./badges";

type Row = Record<string, string | number | undefined>;

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${value}`}
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {ok ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <h3 className="flex items-center gap-2 border-b px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {icon}
        {title}
      </h3>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Fields({ items }: { items: Array<[string, unknown, boolean?]> }) {
  const list = items.filter(([, v]) => v !== undefined && v !== null && String(v) !== "");
  if (!list.length) return <p className="text-sm text-muted-foreground">No data recorded.</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {list.map(([k, v, mono]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
          <dd className={`mt-0.5 break-words text-sm text-foreground ${mono ? "font-mono" : ""}`}>{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chain({ steps }: { steps: Array<{ title: string; items: Array<[string, unknown]> }> }) {
  const shown = steps.filter((s) => s.items.some(([, v]) => v !== undefined && String(v) !== ""));
  if (!shown.length) return <p className="text-sm text-muted-foreground">No wiring data for this point.</p>;
  return (
    <ol className="relative space-y-3">
      {shown.map((s, i) => (
        <li key={s.title} className="relative pl-7">
          <span className="absolute left-0 top-1 flex size-5 items-center justify-center rounded-full border border-primary/50 bg-primary/10 font-mono text-[10px] text-primary">
            {i + 1}
          </span>
          {i < shown.length - 1 && <span className="absolute left-[9.5px] top-6 h-[calc(100%-8px)] w-px bg-border" />}
          <div className="text-xs font-semibold text-foreground">{s.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {s.items
              .filter(([, v]) => v !== undefined && String(v) !== "")
              .map(([k, v]) => (
                <span key={k} className="inline-flex items-baseline gap-1.5 rounded-md border bg-secondary px-2 py-1 text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono text-foreground">{String(v)}</span>
                </span>
              ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function IoBody({ r, ds, open }: { r: Rec; ds: Dataset; open: (r: Rec) => void }) {
  const d = r.data as Row;
  const w = (r.wire ?? {}) as Row;
  const analog = r.group === "AI" || r.group === "AO" || d["lo"] || d["hi"];
  const sab = d["sab"] ? ds.byKey.get(keyOf(r.stn, String(d["sab"])))?.find((x) => x.kind === "mem") : undefined;
  return (
    <>
      <Section icon={<Tag className="size-3.5" />} title="Identification">
        <Fields
          items={[
            ["Station", `STN ${r.stn}`],
            ["DCS address", r.addr, true],
            ["Signal type", d["type"] ?? r.group],
            ["Node", d["node"] ?? w["node"], true],
            ["I/O unit", d["unit"], true],
            ["Point no.", d["no"], true],
            ["Graphic", d["pict"]],
            ["Revision", d["rev"]],
            ["Remark", d["remark"]],
          ]}
        />
      </Section>
      {analog && (
        <Section icon={<Gauge className="size-3.5" />} title="Range">
          <div className="flex items-end gap-3">
            <div className="flex-1 rounded-md border bg-secondary p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Base scale</div>
              <div className="font-mono text-lg">{d["lo"] || "—"}</div>
            </div>
            <ArrowRight className="mb-4 size-4 text-muted-foreground" />
            <div className="flex-1 rounded-md border bg-secondary p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Full scale</div>
              <div className="font-mono text-lg">{d["hi"] || "—"}</div>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-3 font-mono text-sm text-primary">{d["eu"] || "—"}</div>
          </div>
        </Section>
      )}
      {d["sab"] && (
        <Section icon={<Bell className="size-3.5" />} title="Signal abnormal">
          <button
            type="button"
            disabled={!sab}
            onClick={() => sab && open(sab)}
            className="flex w-full items-center justify-between rounded-md border bg-secondary px-3 py-2 text-left text-sm transition-colors enabled:hover:border-primary/50"
          >
            <span className="font-mono text-primary">{String(d["sab"])}</span>
            <span className="truncate pl-3 text-muted-foreground">{sab?.data["Remark"] ?? sab?.desc ?? "Alarm bit"}</span>
          </button>
        </Section>
      )}
      <Section icon={<Cable className="size-3.5" />} title="Wiring path · field to controller">
        <Chain
          steps={[
            { title: "Field / Junction box", items: [["JB", w["jb"]], ["JB TB", w["jbTb"]], ["Cable", w["fieldCab"]], ["Spec", w["fieldSpec"]]] },
            { title: "Marshalling panel", items: [["Panel", w["mpl"]], ["TB strip", w["mplTb"]], ["TB no.", w["mplTbNo"]]] },
            { title: "Interconnect cable", items: [["Cable", w["cab"]], ["Spec", w["cabSpec"]], ["Core", w["core"]]] },
            {
              title: "FCS panel",
              items: [["Panel", w["fcsPanel"]], ["Relay", w["relay"]], ["D/W", w["dw"]], ["O/P", w["op"]], ["TB strip", w["ebTb"]], ["TB no.", w["ebTbNo"]], ["Board", w["board"]], ["Int. cable", w["intCab"]], ["Signal", w["sig"]]],
            },
            { title: "Controller I/O", items: [["FCS", w["fcs"]], ["Node", w["node"]], ["Slot", w["slot"]], ["Channel", w["ch"]], ["Address", w["addr"]]] },
          ]}
        />
      </Section>
    </>
  );
}

function MemBody({ r }: { r: Rec }) {
  const d = r.data as Row;
  const extra = Object.entries(d).filter(([k]) => !["stn", "cat", "addr", "desc"].includes(k));
  return (
    <Section icon={<Cpu className="size-3.5" />} title="Memory point">
      <Fields
        items={[
          ["Station", `STN ${r.stn}`],
          ["Area", `${r.group} · ${MEM_LABEL[r.group] ?? "Memory"}`],
          ["Address", r.addr, true],
          ...extra.map(([k, v]) => [k, v, false] as [string, unknown, boolean]),
        ]}
      />
    </Section>
  );
}

function RelayBody({ r }: { r: Rec }) {
  const d = r.data as Row;
  return (
    <>
      <Section icon={<Tag className="size-3.5" />} title="Point">
        <Fields items={[["Panel", d["panel"]], ["Item", d["item"], true], ["Station", r.stn ? `STN ${r.stn}` : ""], ["DCS address", d["addr"], true], ["Remark", d["remark"]]]} />
      </Section>
      <Section icon={<Cable className="size-3.5" />} title="Signal path">
        <Chain
          steps={[
            { title: "Field / source", items: [["From", d["field"]], ["Cable", d["fieldCab"]]] },
            { title: "Relay panel", items: [["Panel", d["relayPanel"]], ["Input TB", d["inTb"]], ["TB no.", d["inTbNo"]], ["Relay", d["relay"]], ["Output TB", d["outTb"]], ["TB no.", d["outTbNo"]]] },
            { title: "Interconnect cable", items: [["Cable", d["cab"]], ["Spec", d["spec"]], ["Core", d["core"]]] },
            { title: "Marshalling / DCS", items: [["Panel", d["mpl"]], ["TB", d["mplTb"]], ["TB no.", d["mplTbNo"]], ["FCS", d["fcs"]], ["Address", d["addr"]]] },
          ]}
        />
      </Section>
    </>
  );
}

function SerBody({ r }: { r: Rec }) {
  const d = r.data as Row;
  return (
    <Section icon={<Cable className="size-3.5" />} title="Event recorder path">
      <Chain
        steps={[
          { title: "Source panel", items: [["Panel", d["mpl"]], ["TB", d["mplTb"]], ["TB no.", d["mplTbNo"]]] },
          { title: "Cable", items: [["Cable", d["cab"]], ["Spec", d["spec"]], ["Core", d["core"]]] },
          { title: "SER panel", items: [["Panel", d["serPanel"]], ["TB", d["serTb"]], ["TB no.", d["serTbNo"]], ["Point", d["point"]], ["Item", d["item"]]] },
        ]}
      />
    </Section>
  );
}

export function DetailPanel({ rec, ds, onClose, onOpen }: { rec: Rec | null; ds: Dataset; onClose: () => void; onOpen: (r: Rec) => void }) {
  const mobile = useIsMobile();
  const rel = rec ? related(ds, rec) : [];
  return (
    <Sheet open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={mobile ? "bottom" : "right"}
        className={`flex flex-col gap-0 overflow-hidden p-0 ${mobile ? "h-[90dvh] rounded-t-2xl" : "w-full sm:max-w-xl"}`}
      >
        {rec && (
          <>
            <SheetHeader className="space-y-2 border-b bg-card px-5 py-4 text-left">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                {rec.stn ? <StnBadge stn={rec.stn} /> : null}
                <KindBadge kind={rec.kind} group={rec.group} />
              </div>
              <div className="flex items-center gap-1">
                <SheetTitle className="font-mono text-xl tracking-tight">{rec.tag || rec.addr}</SheetTitle>
                <CopyBtn value={rec.tag || rec.addr} />
              </div>
              {rec.tag && rec.addr && (
                <div className="flex items-center gap-1 font-mono text-sm text-primary">
                  {rec.addr}
                  <CopyBtn value={rec.addr} />
                </div>
              )}
              <SheetDescription className="text-sm leading-relaxed text-foreground/80">{rec.desc || "No description"}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {rec.kind === "io" && <IoBody r={rec} ds={ds} open={onOpen} />}
              {rec.kind === "mem" && <MemBody r={rec} />}
              {rec.kind === "relay" && <RelayBody r={rec} />}
              {rec.kind === "ser" && <SerBody r={rec} />}
              {rel.length > 0 && (
                <Section icon={<Link2 className="size-3.5" />} title={`Related · ${rel.length}`}>
                  <ul className="-my-1 divide-y">
                    {rel.map((x) => (
                      <li key={x.id}>
                        <button type="button" onClick={() => onOpen(x)} className="flex w-full items-center gap-3 py-2 text-left text-sm hover:text-primary">
                          <span className="w-20 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">{KIND_LABEL[x.kind]}</span>
                          <span className="w-24 shrink-0 font-mono">{x.addr}</span>
                          <span className="truncate text-muted-foreground">{x.tag || x.desc}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
