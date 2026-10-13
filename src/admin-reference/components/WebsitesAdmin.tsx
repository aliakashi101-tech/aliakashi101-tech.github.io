import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { ArrowDown, ArrowUp, ExternalLink, Globe2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { firebaseApp } from "../lib/firebase";
import { starterWebsites } from "../lib/websiteData";

type Website = {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  url: string;
  image: string;
  image_theme: "light" | "dark";
  view_order: number;
  hidden: boolean;
};

const firestore = getFirestore(firebaseApp);
const websitesCollection = collection(firestore, "websites");
const emptyWebsite = (id: string): Website => ({
  id, name_en: "", name_ar: "", description_en: "", description_ar: "",
  url: "", image: "", image_theme: "light", view_order: 1, hidden: false,
});

function Field({ label, value, onChange, dir = "ltr", type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; dir?: "ltr" | "rtl"; type?: string }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm text-zinc-300"><span>{label}</span><input type={type} dir={dir} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400" /></label>;
}

export function WebsitesAdmin({ onDataChanged }: { onDataChanged: () => void }) {
  const [rows, setRows] = useState<Website[]>([]);
  const [editor, setEditor] = useState<Website | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const snapshot = await getDocs(websitesCollection);
      setRows(snapshot.docs.map((item) => ({ ...emptyWebsite(item.id), ...item.data(), id: item.id } as Website)).sort((a, b) => Number(a.view_order || 9999) - Number(b.view_order || 9999)));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load websites.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? rows.filter((row) => `${row.name_en} ${row.name_ar} ${row.description_en} ${row.description_ar}`.toLowerCase().includes(term)) : rows;
  }, [rows, search]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    if (!editor.name_en.trim() && !editor.name_ar.trim()) { setError("Add a website name in English or Arabic."); return; }
    try {
      const parsed = new URL(editor.url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch { setError("Enter a valid website URL starting with https://."); return; }
    if (editor.image && !/^(https?:\/\/|\/)/i.test(editor.image)) { setError("Use an https image URL or a path from this portfolio."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...editor, view_order: Number(editor.view_order) || rows.length + 1, updatedAt: serverTimestamp() };
      if (rows.some((row) => row.id === editor.id)) await setDoc(doc(firestore, "websites", editor.id), payload, { merge: true });
      else await addDoc(websitesCollection, payload);
      setEditor(null); setNotice("Website saved."); await refresh(); onDataChanged();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save website."); }
    finally { setSaving(false); }
  }

  async function importCurrent() {
    setSaving(true); setError("");
    try {
      const batch = writeBatch(firestore);
      starterWebsites.forEach(({ id, ...website }) => batch.set(doc(firestore, "websites", id), { ...website, updatedAt: serverTimestamp() }, { merge: true }));
      await batch.commit(); setNotice("Current website cards imported."); await refresh(); onDataChanged();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to import current websites."); }
    finally { setSaving(false); }
  }

  async function toggleVisibility(row: Website) {
    try { await setDoc(doc(firestore, "websites", row.id), { hidden: !row.hidden, updatedAt: serverTimestamp() }, { merge: true }); await refresh(); onDataChanged(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update website visibility."); }
  }

  async function move(row: Website, direction: -1 | 1) {
    const index = rows.findIndex((item) => item.id === row.id); const other = rows[index + direction];
    if (!other) return;
    try {
      const batch = writeBatch(firestore);
      batch.set(doc(firestore, "websites", row.id), { view_order: Number(other.view_order || index + 2), updatedAt: serverTimestamp() }, { merge: true });
      batch.set(doc(firestore, "websites", other.id), { view_order: Number(row.view_order || index + 1), updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit(); await refresh(); onDataChanged();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to reorder websites."); }
  }

  async function remove(row: Website) {
    if (!window.confirm(`Delete “${row.name_en || row.name_ar}”?`)) return;
    try { await deleteDoc(doc(firestore, "websites", row.id)); setNotice("Website deleted."); await refresh(); onDataChanged(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete website."); }
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-white">Selected website work</h2><p className="mt-1 text-sm text-zinc-500">Manage the website cards shown in your public portfolio, in English and Arabic.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditor(emptyWebsite(doc(websitesCollection).id))} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-3.5 py-2.5 text-sm font-semibold text-black hover:bg-cyan-300"><Plus size={16} />Add website</button><button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-300 hover:border-cyan-400"><RefreshCw size={16} />Refresh</button></div></div>
      <label className="mt-4 block max-w-sm"><span className="sr-only">Search websites</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search websites…" className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400" /></label>
    </section>
    {error && <p className="rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-200" role="alert">{error}</p>}
    {notice && <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200" role="status">{notice}</p>}
    {editor && <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Website editor</p><h2 className="mt-1 text-xl font-semibold text-white">{rows.some((row) => row.id === editor.id) ? "Edit website" : "Add website"}</h2></div><button type="button" onClick={() => setEditor(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800" aria-label="Close editor"><X size={18} /></button></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Name (English)" value={editor.name_en} onChange={(value) => setEditor({ ...editor, name_en: value })} /><Field label="Name (Arabic)" dir="rtl" value={editor.name_ar} onChange={(value) => setEditor({ ...editor, name_ar: value })} /><Field label="Description (English)" value={editor.description_en} onChange={(value) => setEditor({ ...editor, description_en: value })} /><Field label="Description (Arabic)" dir="rtl" value={editor.description_ar} onChange={(value) => setEditor({ ...editor, description_ar: value })} /><Field label="Website URL" type="url" value={editor.url} onChange={(value) => setEditor({ ...editor, url: value })} /><Field label="Logo image URL or portfolio path" value={editor.image} onChange={(value) => setEditor({ ...editor, image: value })} /><label className="flex flex-col gap-2 text-sm text-zinc-300"><span>Logo background</span><select value={editor.image_theme} onChange={(event) => setEditor({ ...editor, image_theme: event.target.value as Website["image_theme"] })} className="min-h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-white"><option value="light">Light</option><option value="dark">Dark</option></select></label><Field label="Display order" type="number" value={editor.view_order} onChange={(value) => setEditor({ ...editor, view_order: Number(value) })} /></div>
      <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={!editor.hidden} onChange={(event) => setEditor({ ...editor, hidden: !event.target.checked })} className="accent-cyan-400" />Show on public portfolio</label>
      {editor.image && <img src={editor.image} alt="Logo preview" className={`h-24 w-24 rounded-2xl object-contain p-3 ${editor.image_theme === "dark" ? "bg-black" : "bg-white"}`} />}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditor(null)} className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Save size={16} />{saving ? "Saving…" : "Save website"}</button></div>
    </form>}
    {loading ? <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-500">Loading websites…</div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-10 text-center"><Globe2 className="mx-auto mb-3 text-cyan-400" size={24} /><h3 className="font-semibold text-white">No website cards in Firebase yet</h3><p className="mt-1 text-sm text-zinc-500">Import your two current website cards to manage them here.</p><button type="button" disabled={saving} onClick={() => void importCurrent()} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black">Import current website cards</button></div> : <div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="min-w-[850px] w-full text-start text-sm"><thead className="bg-zinc-950/80 text-xs uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-4 py-4 font-medium">Website</th><th className="px-4 py-4 font-medium">Order</th><th className="px-4 py-4 font-medium">Status</th><th className="px-4 py-4 text-end font-medium">Actions</th></tr></thead><tbody className="divide-y divide-zinc-800">{filtered.map((row, index) => <tr key={row.id} className="bg-zinc-900/40"><td className="px-4 py-4"><div className="flex items-center gap-3">{row.image ? <img src={row.image} alt="" className={`h-12 w-12 rounded-xl object-contain p-2 ${row.image_theme === "dark" ? "bg-black" : "bg-white"}`} /> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-950 text-cyan-400"><Globe2 size={19} /></span>}<div><p className="font-medium text-white">{row.name_en || row.name_ar || "Untitled website"}</p><p className="text-xs text-zinc-500">{row.name_ar}</p></div></div></td><td className="px-4 py-4"><div className="flex items-center gap-2"><button type="button" disabled={index === 0} onClick={() => void move(row, -1)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30" aria-label="Move website up"><ArrowUp size={15} /></button><span>{row.view_order}</span><button type="button" disabled={index === rows.length - 1} onClick={() => void move(row, 1)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30" aria-label="Move website down"><ArrowDown size={15} /></button></div></td><td className="px-4 py-4"><button type="button" onClick={() => void toggleVisibility(row)} className={`rounded-full px-3 py-1 text-xs ${row.hidden ? "bg-zinc-800 text-zinc-400" : "bg-emerald-400/10 text-emerald-300"}`}>{row.hidden ? "Hidden" : "Published"}</button></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><a href={row.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-zinc-400 hover:text-cyan-300" aria-label="Open website"><ExternalLink size={16} /></a><button type="button" onClick={() => setEditor({ ...row })} className="rounded-lg p-2 text-zinc-400 hover:text-cyan-300" aria-label="Edit website"><Pencil size={16} /></button><button type="button" onClick={() => void remove(row)} className="rounded-lg p-2 text-zinc-400 hover:text-red-300" aria-label="Delete website"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">No matching websites.</p>}</div>}
  </div>;
}
