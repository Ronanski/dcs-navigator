export type Kind = "io" | "mem" | "relay" | "ser";
type Row = Record<string, string | number>;

export interface Rec {
  id: number;
  kind: Kind;
  stn: number;
  addr: string;
  tag: string;
  desc: string;
  group: string;
  data: Row;
  wire?: Row;
  hay: string;
}

export interface ModbusSheet {
  sheet: string;
  title: string;
  rows: string[][];
}

export interface Dataset {
  recs: Rec[];
  modbus: ModbusSheet[];
  byKey: Map<string, Rec[]>;
}

export const STATIONS = [101, 102, 103, 104, 105] as const;

export const KIND_LABEL: Record<Kind, string> = {
  io: "I/O Points",
  mem: "Memory",
  relay: "IRP / ARP",
  ser: "SER",
};

export const MEM_LABEL: Record<string, string> = {
  WM: "Word memory (M)",
  WB: "Bit memory (B)",
  TR: "Timer",
  PTN: "Linear pattern",
  SI: "SI register",
  DI: "DI register",
  DB: "DB register",
  FP: "Floating point",
};

function ioGroup(t: string) {
  if (t.startsWith("DI")) return "DI";
  if (t.startsWith("DO")) return "DO";
  if (t.startsWith("AI")) return "AI";
  if (t.startsWith("AO")) return "AO";
  if (t.startsWith("PI")) return "PI";
  if (t.startsWith("PO")) return "PO";
  return t || "Other";
}

const norm = (s: string) => s.toLowerCase();
export const keyOf = (stn: number, v: string) => `${stn}|${v.toLowerCase()}`;

function hayOf(parts: Array<string | number | undefined>) {
  const s = parts.filter(Boolean).join(" ").toLowerCase();
  return s + " " + s.replace(/\./g, "");
}

export async function loadDataset(): Promise<Dataset> {
  const res = await fetch("/dcs-data.json");
  if (!res.ok) throw new Error("Could not load the DCS reference data");
  const raw = await res.json();
  const recs: Rec[] = [];
  let id = 0;

  const wireMap = new Map<string, Row>();
  for (const w of raw.wire as Row[]) wireMap.set(keyOf(Number(w["stn"]), String(w["addr"])), w);

  for (const r of raw.io as Row[]) {
    const stn = Number(r["stn"]);
    const wire = wireMap.get(keyOf(stn, String(r["addr"])));
    if (wire) wireMap.delete(keyOf(stn, String(r["addr"])));
    recs.push({
      id: id++, kind: "io", stn, addr: String(r["addr"]), tag: String(r["tag"] ?? ""), desc: String(r["desc"] ?? ""),
      group: ioGroup(String(r["type"] ?? "")), data: r, wire,
      hay: hayOf([...Object.values(r), ...(wire ? Object.values(wire) : [])] as string[]),
    });
  }
  for (const w of wireMap.values()) {
    recs.push({
      id: id++, kind: "io", stn: Number(w["stn"]), addr: String(w["addr"]), tag: String(w["tag"] ?? ""), desc: String(w["desc"] ?? ""),
      group: w["sheet"] === "DO" ? "DO" : w["sheet"] === "DI" ? "DI" : "AI", data: { stn: w["stn"], addr: w["addr"], tag: w["tag"] ?? "", desc: w["desc"] ?? "" }, wire: w,
      hay: hayOf(Object.values(w) as string[]),
    });
  }
  for (const m of raw.mem as Row[]) {
    recs.push({
      id: id++, kind: "mem", stn: Number(m["stn"]), addr: String(m["addr"]), tag: "", desc: String(m["desc"] ?? ""),
      group: String(m["cat"]), data: m, hay: hayOf(Object.values(m) as string[]),
    });
  }
  for (const r of raw.relay as Row[]) {
    recs.push({
      id: id++, kind: "relay", stn: Number(r["stn"]) || 0, addr: String(r["addr"] ?? ""), tag: String(r["tag"] ?? ""),
      desc: String(r["field"] ?? ""), group: String(r["panel"]), data: r, hay: hayOf(Object.values(r) as string[]),
    });
  }
  for (const r of raw.ser as Row[]) {
    recs.push({
      id: id++, kind: "ser", stn: 0, addr: `Point ${r["point"] ?? r["item"]}`, tag: String(r["tag"] ?? ""), desc: String(r["desc"] ?? ""),
      group: String(r["panel"]), data: r, hay: hayOf(Object.values(r) as string[]),
    });
  }

  const byKey = new Map<string, Rec[]>();
  const add = (k: string, r: Rec) => {
    const a = byKey.get(k);
    if (a) a.push(r);
    else byKey.set(k, [r]);
  };
  for (const r of recs) {
    if (r["addr"]) add(keyOf(r["stn"], r["addr"]), r);
    if (r["tag"]) add(`tag|${r["tag"].toLowerCase()}`, r);
  }
  return { recs, modbus: raw.modbus, byKey };
}

export interface Filters {
  q: string;
  stn: number; // 0 = all
  kind: Kind | "all";
  group: string; // "" = all
}

export function search(ds: Dataset, f: Filters): Rec[] {
  const tokens = norm(f.q).trim().split(/\s+/).filter(Boolean);
  const q = tokens.join(" ");
  const qn = q.replace(/\./g, "");
  const out: { r: Rec; s: number }[] = [];
  for (const r of ds.recs) {
    if (f.stn && r["stn"] !== f.stn) continue;
    if (f.kind !== "all" && r.kind !== f.kind) continue;
    if (f.group && r.group !== f.group) continue;
    if (tokens.length) {
      let ok = true;
      for (const t of tokens) if (!r.hay.includes(t)) { ok = false; break; }
      if (!ok) continue;
      const a = r["addr"].toLowerCase();
      const g = r["tag"].toLowerCase();
      let s = 0;
      if (a === q || a.replace(/\./g, "") === qn || g === q) s = 100;
      else if (g.startsWith(q) || a.startsWith(q)) s = 60;
      else if (g.includes(q) || a.includes(q)) s = 40;
      else if (r["desc"].toLowerCase().includes(q)) s = 20;
      if (r.kind === "io") s += 5;
      if (r.kind === "mem" && /^used$/i.test(r["desc"])) s -= 10;
      out.push({ r, s });
    } else out.push({ r, s: 0 });
  }
  if (tokens.length) out.sort((x, y) => y.s - x.s || x.r.id - y.r.id);
  return out.map((o) => o.r);
}

export function related(ds: Dataset, r: Rec): Rec[] {
  const set = new Map<number, Rec>();
  const push = (arr?: Rec[]) => arr?.forEach((x) => x.id !== r.id && set.set(x.id, x));
  if (r["tag"]) push(ds.byKey.get(`tag|${r["tag"].toLowerCase()}`));
  if (r["addr"] && r.kind !== "ser") push(ds.byKey.get(keyOf(r["stn"], r["addr"])));
  if (r.kind === "io" && r.data["sab"]) push(ds.byKey.get(keyOf(r["stn"], String(r.data["sab"]))));
  if (r.kind === "mem") {
    for (const x of ds.recs)
      if (x.kind === "io" && x.stn === r["stn"] && String(x.data["sab"] ?? "").toLowerCase() === r["addr"].toLowerCase()) set.set(x.id, x);
  }
  return [...set.values()].slice(0, 30);
}
