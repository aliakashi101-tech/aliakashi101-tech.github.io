import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileText,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  buildCvDocument,
  createDefaultCvProfile,
  formatCvPeriod,
  type CvCertification,
  type CvDocument,
  type CvEducation,
  type CvLanguage,
  type CvProfile,
  type CvProjectSource,
  type CvSourceData,
  normalizeCvProfile,
  saveCvProfile,
  validateCvDocument,
} from "../lib/cv";

type CvBuilderProps = {
  source: CvSourceData;
  initialProfile: CvProfile | null;
  onSaved: (profile: CvProfile) => void;
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
}

function updateArrayItem<T>(items: T[], index: number, next: Partial<T>) {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-cyan-400"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-cyan-400"
      />
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  icon: Icon,
  variant = "secondary",
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    primary: "bg-cyan-400 text-black hover:bg-cyan-300",
    secondary: "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-cyan-400 hover:text-white",
    danger: "border border-red-500/50 bg-red-500/5 text-red-200 hover:bg-red-500/15",
    ghost: "text-zinc-500 hover:bg-zinc-800 hover:text-white",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function Card({ title, description, children, className = "" }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10 sm:p-6 ${className}`}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-600">{label}</div>;
}

function CheckList({ document }: { document: CvDocument }) {
  const validation = validateCvDocument(document);
  return (
    <Card
      title="ATS readiness"
      description="Critical issues disable exports. Advisory items are recommendations for a stronger application."
    >
      <div className="mb-5 flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 text-lg font-bold ${validation.criticalIssues.length ? "border-amber-400/50 text-amber-300" : "border-emerald-400/60 text-emerald-300"}`}>
          {validation.score}
        </span>
        <div>
          <p className="font-medium text-white">{validation.criticalIssues.length ? "Complete the critical items before exporting" : "Ready for ATS export"}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{validation.advisoryIssues.length ? `${validation.advisoryIssues.length} advisory recommendation${validation.advisoryIssues.length === 1 ? "" : "s"} remaining.` : "The document passes the current content checks."}</p>
        </div>
      </div>
      <div className="space-y-2">
        {validation.checks.map((check) => (
          <div key={check.id} className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
            <span className={`mt-0.5 rounded-full p-1 ${check.passed ? "bg-emerald-400/10 text-emerald-300" : check.severity === "critical" ? "bg-red-400/10 text-red-300" : "bg-amber-400/10 text-amber-300"}`}>
              {check.passed ? <Check size={13} /> : <X size={13} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-200">{check.label}</span>
              {!check.passed && <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{check.detail}</span>}
            </span>
            {!check.passed && <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{check.severity}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Preview({ document }: { document: CvDocument }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white text-black shadow-2xl shadow-black/25">
      <article className="mx-auto min-h-[1120px] max-w-[794px] p-8 text-[11px] leading-[1.42] sm:p-10" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <header className="border-b border-zinc-300 pb-4 text-center">
          <h1 className="text-3xl font-bold leading-tight">{document.name || "Your Name"}</h1>
          <p className="mt-1 text-base font-bold">{document.targetTitle || "Target Job Title"}</p>
          <p className="mt-2 break-words text-[10px] text-zinc-700">{[document.email, document.phone, document.location].filter(Boolean).join(" | ") || "Email | Phone | Location"}</p>
          {document.links.length > 0 && (
            <p className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[10px] text-zinc-700">
              {document.links.map((link) => (
                <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
                  {link.label || link.url}
                </a>
              ))}
            </p>
          )}
        </header>

        {document.summary && <PreviewSection title="Professional Summary"><p>{document.summary}</p></PreviewSection>}

        {document.education.length > 0 && <PreviewSection title="Education">
          {document.education.map((item) => <div key={item.id} className="mb-2 last:mb-0"><p className="font-bold">{[item.degree, item.field].filter(Boolean).join(" in ") || item.institution}</p><p>{[item.institution, item.location, item.startDate || item.endDate ? formatCvPeriod(item.startDate, item.endDate) : "", item.gpa ? `GPA: ${item.gpa}` : ""].filter(Boolean).join(" | ")}</p>{item.details && <p>{item.details}</p>}</div>)}
        </PreviewSection>}

        {document.experiences.length > 0 && <PreviewSection title="Experience">
          {document.experiences.map((experience) => <div key={experience.id} className="mb-3 last:mb-0">
            <div className="flex items-baseline justify-between gap-3"><h3 className="font-bold">{experience.title}{experience.company ? " | " : ""}{experience.companyLink ? <a href={experience.companyLink} target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-400 underline-offset-2">{experience.company}</a> : experience.company}</h3><span className="shrink-0 text-[10px] text-zinc-700">{formatCvPeriod(experience.startDate, experience.endDate)}</span></div>
            <ul className="mt-1 list-disc space-y-0.5 ps-5">{experience.bullets.map((bullet, index) => <li key={`${bullet}-${index}`}>{bullet}</li>)}</ul>
          </div>)}
        </PreviewSection>}

        {document.projects.length > 0 && <PreviewSection title="Selected Projects">
          {document.projects.map((project) => <div key={project.id} className="mb-3 last:mb-0">
            <h3 className="font-bold">{project.name}</h3>
            {(project.website || project.googlePlay || project.appStore) && <p className="flex flex-wrap gap-x-2 text-[10px] text-zinc-700">{project.website && <a href={project.website} target="_blank" rel="noopener noreferrer" className="underline">Project website</a>}{project.googlePlay && <a href={project.googlePlay} target="_blank" rel="noopener noreferrer" className="underline">Google Play</a>}{project.appStore && <a href={project.appStore} target="_blank" rel="noopener noreferrer" className="underline">App Store</a>}</p>}
            {project.bullets.length > 0 && <ul className="mt-1 list-disc space-y-0.5 ps-5">{project.bullets.map((bullet, index) => <li key={`${bullet}-${index}`}>{bullet}</li>)}</ul>}
            {project.technologies.length > 0 && <p className="mt-1"><strong>Technologies:</strong> {project.technologies.join(", ")}</p>}
          </div>)}
        </PreviewSection>}

        {(document.skillGroups.length > 0 || document.keywords.length > 0) && <PreviewSection title="Technical Skills">
          {document.skillGroups.map((group) => <p key={group.title} className="mb-1"><strong>{group.title}:</strong> {group.skills.join(", ")}</p>)}
          {document.keywords.length > 0 && <p><strong>Additional:</strong> {document.keywords.join(", ")}</p>}
        </PreviewSection>}

        {document.certifications.length > 0 && <PreviewSection title="Certifications">
          {document.certifications.map((item) => <p key={item.id} className="mb-1 last:mb-0">{[item.name, item.issuer, item.date].filter(Boolean).join(" | ")}{item.url ? ` | ${item.url}` : ""}</p>)}
        </PreviewSection>}

        {document.languages.length > 0 && <PreviewSection title="Languages">
          {document.languages.map((item) => <p key={item.id} className="mb-1 last:mb-0">{[item.name, item.proficiency].filter(Boolean).join(" - ")}</p>)}
        </PreviewSection>}

        {document.achievements.length > 0 && <PreviewSection title="Additional Achievements"><ul className="list-disc space-y-0.5 ps-5">{document.achievements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></PreviewSection>}
      </article>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-4 first:mt-0"><h2 className="mb-2 border-b border-zinc-400 pb-1 text-xs font-bold uppercase tracking-wide">{title}</h2>{children}</section>;
}

function SelectionRow({
  checked,
  title,
  description,
  period,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  checked: boolean;
  title: string;
  description: string;
  period?: string;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-cyan-400/50 bg-cyan-400/5" : "border-zinc-800 bg-zinc-950/40"}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 accent-cyan-400" aria-label={`Include ${title}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-white">{title || "Untitled"}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-500">{[description, period].filter(Boolean).join(" · ")}</span>
      </span>
      {checked && <span className="flex shrink-0 gap-1">
        <button type="button" disabled={isFirst} onClick={onMoveUp} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-25" aria-label={`Move ${title} up`}><ArrowUp size={14} /></button>
        <button type="button" disabled={isLast} onClick={onMoveDown} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-25" aria-label={`Move ${title} down`}><ArrowDown size={14} /></button>
      </span>}
    </div>
  );
}

function emptyEducation(): CvEducation {
  return { id: `education-${Date.now()}`, institution: "", degree: "", field: "", location: "", startDate: "", endDate: "", gpa: "", details: "" };
}

function emptyCertification(): CvCertification {
  return { id: `certification-${Date.now()}`, name: "", issuer: "", date: "", url: "" };
}

function emptyLanguage(): CvLanguage {
  return { id: `language-${Date.now()}`, name: "", proficiency: "" };
}

function ProjectOverrides({ project, profile, onChange }: { project: CvProjectSource; profile: CvProfile; onChange: (next: CvProfile) => void }) {
  const override = profile.projectOverrides[project.id] ?? { bullets: project.description ? [project.description] : [], technologies: [] };
  const setOverride = (next: Partial<typeof override>) => onChange({ ...profile, projectOverrides: { ...profile.projectOverrides, [project.id]: { ...override, ...next } } });
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-medium text-white">{project.name}</p><p className="mt-1 text-xs text-zinc-600">{project.description || "No portfolio description"}</p></div><span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-300">Selected</span></div>
      <div className="space-y-3">
        {override.bullets.map((bullet, index) => <div key={`${project.id}-bullet-${index}`} className="flex items-start gap-2"><span className="mt-3 text-zinc-600">•</span><textarea rows={2} value={bullet} onChange={(event) => setOverride({ bullets: override.bullets.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} className="min-w-0 flex-1 resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" aria-label={`${project.name} bullet ${index + 1}`} /><button type="button" onClick={() => setOverride({ bullets: override.bullets.filter((_item, itemIndex) => itemIndex !== index) })} className="mt-2 rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove ${project.name} bullet`}><Trash2 size={14} /></button></div>)}
        <div className="flex flex-wrap gap-2"><ActionButton icon={Plus} onClick={() => setOverride({ bullets: [...override.bullets, ""] })} disabled={override.bullets.length >= 4}>Add project bullet</ActionButton><Field label="Technologies (comma separated)" value={override.technologies.join(", ")} onChange={(value) => setOverride({ technologies: value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Flutter, Firebase, REST APIs" /></div>
      </div>
    </div>
  );
}

export function CvBuilder({ source, initialProfile, onSaved }: CvBuilderProps) {
  const [profile, setProfile] = useState<CvProfile>(() => initialProfile ? normalizeCvProfile(initialProfile, source.portfolioUrlFallback) : createDefaultCvProfile(source));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "pdf" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const document = useMemo(() => buildCvDocument(profile, source), [profile, source]);
  const validation = useMemo(() => validateCvDocument(document), [document]);

  useEffect(() => {
    setProfile(initialProfile ? normalizeCvProfile(initialProfile, source.portfolioUrlFallback) : createDefaultCvProfile(source));
  }, [initialProfile, source]);

  const updateProfile = (next: Partial<CvProfile>) => {
    setProfile((current) => ({ ...current, ...next }));
    setMessage("");
    setError("");
  };

  const toggleSelection = (type: "experience" | "project", id: string) => {
    const key = type === "experience" ? "selectedExperienceIds" : "selectedProjectIds";
    const selected = profile[key];
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    if (type === "experience" && !profile.experienceBullets[id]) {
      const experience = source.experiences.find((item) => item.id === id);
      updateProfile({ [key]: next, experienceBullets: { ...profile.experienceBullets, [id]: experience?.description ? [experience.description] : [] } });
      return;
    }
    updateProfile({ [key]: next });
  };

  const moveSelection = (type: "experience" | "project", id: string, direction: -1 | 1) => {
    const key = type === "experience" ? "selectedExperienceIds" : "selectedProjectIds";
    const selected = [...profile[key]];
    const index = selected.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= selected.length) return;
    [selected[index], selected[target]] = [selected[target], selected[index]];
    updateProfile({ [key]: selected });
  };

  const updateExperienceBullets = (id: string, nextBullets: string[]) => {
    updateProfile({ experienceBullets: { ...profile.experienceBullets, [id]: nextBullets.slice(0, 6) } });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveCvProfile(profile);
      onSaved(profile);
      setMessage("CV settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save CV settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: "docx" | "pdf") => {
    if (validation.criticalIssues.length) return;
    setExporting(format);
    setError("");
    try {
      const filename = `${slugify(document.name)}-${slugify(document.targetTitle)}`;
      const generators = await import("../lib/cvGenerators");
      if (format === "docx") await generators.downloadCvDocx(document, `${filename}.docx`);
      else await generators.downloadCvPdf(document, `${filename}.pdf`);
      setMessage(`${format.toUpperCase()} downloaded.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : `Unable to generate ${format.toUpperCase()}.`);
    } finally {
      setExporting("");
    }
  };

  const addBullet = (id: string) => {
    const bullets = profile.experienceBullets[id] ?? [];
    if (bullets.length >= 6) return;
    updateExperienceBullets(id, [...bullets, ""]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-cyan-400 p-3 text-black"><FileText size={21} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Private document workspace</p><h2 className="mt-1 text-xl font-semibold text-white">ATS-friendly CV generator</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Build one clean English resume from your Firebase content. This file stays private to the admin workspace.</p></div></div>
        <div className="flex flex-wrap gap-2"><ActionButton icon={Save} onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving..." : "Save CV"}</ActionButton><ActionButton icon={Download} onClick={() => void handleExport("docx")} disabled={Boolean(validation.criticalIssues.length) || Boolean(exporting)}>{exporting === "docx" ? "Generating..." : "Download DOCX"}</ActionButton><ActionButton variant="primary" icon={Download} onClick={() => void handleExport("pdf")} disabled={Boolean(validation.criticalIssues.length) || Boolean(exporting)}>{exporting === "pdf" ? "Generating..." : "Download PDF"}</ActionButton></div>
      </div>

      {(message || error) && <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-500/40 bg-red-500/5 text-red-200" : "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"}`} role="status"><span className="mt-0.5">{error ? <X size={17} /> : <Check size={17} />}</span><span>{error || message}</span></div>}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,794px)] 2xl:items-start">
        <div className="space-y-6">
          <Card title="Profile and summary" description="Your name and contact details come from the existing Firebase profile/contact modules. Write the role-specific content here.">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2"><Field label="Target job title" value={profile.targetTitle} onChange={(value) => updateProfile({ targetTitle: value })} placeholder="Data Analyst" /><Field label="Portfolio URL" value={profile.portfolioUrl} onChange={(value) => updateProfile({ portfolioUrl: value })} placeholder="https://aliakashi101-tech.github.io/" /></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs leading-5 text-zinc-500"><ShieldCheck className="mb-2 text-cyan-400" size={17} />The exported CV uses standard text and headings only. No profile photo or decorative portfolio UI is included.</div>
              <TextArea label="Professional summary" value={profile.summary} onChange={(value) => updateProfile({ summary: value })} placeholder="Summarize your experience, strongest technologies, and the value you bring to the target role." rows={5} />
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm"><p className="font-medium text-zinc-300">Imported contact data</p><p className="mt-2 text-zinc-500">{[source.email, source.phone, source.location].filter(Boolean).join(" · ") || "Add contact information in the Contact module."}</p><p className="mt-1 break-all text-xs text-zinc-600">{source.links.map((link) => link.url).join(" · ")}</p></div>
              <Field label="Additional ATS keywords (comma separated)" value={profile.additionalKeywords.join(", ")} onChange={(value) => updateProfile({ additionalKeywords: value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Microservices, Agile, CI/CD, system design" />
            </div>
          </Card>

          <Card title="Professional experience" description="Select and order the roles to include. Keep each role to 3–6 concise, factual achievement bullets.">
            <div className="space-y-3">
              {source.experiences.map((experience) => {
                const selectedIndex = profile.selectedExperienceIds.indexOf(experience.id);
                const bullets = profile.experienceBullets[experience.id] ?? [];
                return <div key={experience.id} className="space-y-3"><SelectionRow checked={selectedIndex >= 0} title={[experience.title, experience.company].filter(Boolean).join(" | ")} description={experience.description || "Add achievement bullets below"} period={formatCvPeriod(experience.startDate, experience.endDate)} onToggle={() => toggleSelection("experience", experience.id)} onMoveUp={() => moveSelection("experience", experience.id, -1)} onMoveDown={() => moveSelection("experience", experience.id, 1)} isFirst={selectedIndex <= 0} isLast={selectedIndex < 0 || selectedIndex === profile.selectedExperienceIds.length - 1} />{selectedIndex >= 0 && <div className="ms-7 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-white">Achievement bullets</p><p className="mt-1 text-xs text-zinc-600">Use action + contribution + result when you have verified metrics.</p></div><span className="text-xs text-zinc-600">{bullets.length}/6</span></div><div className="space-y-2">{bullets.map((bullet, bulletIndex) => <div key={`${experience.id}-${bulletIndex}`} className="flex items-start gap-2"><span className="mt-3 text-zinc-600">•</span><textarea rows={2} value={bullet} onChange={(event) => updateExperienceBullets(experience.id, bullets.map((item, index) => index === bulletIndex ? event.target.value : item))} className="min-w-0 flex-1 resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" aria-label={`${experience.title} bullet ${bulletIndex + 1}`} /><button type="button" onClick={() => updateExperienceBullets(experience.id, bullets.filter((_item, index) => index !== bulletIndex))} className="mt-2 rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove ${experience.title} bullet`}><Trash2 size={14} /></button></div>)}</div><div className="mt-3"><ActionButton icon={Plus} onClick={() => addBullet(experience.id)} disabled={bullets.length >= 6}>Add bullet</ActionButton></div></div>}</div>;
              })}
              {!source.experiences.length && <EmptyRow label="Add experience entries in the Experience module first." />}
            </div>
          </Card>

          <Card title="Selected projects" description="Choose the projects that best support the target role and add concise, factual bullets or technology keywords.">
            <div className="space-y-3">
              {source.projects.map((project) => {
                const selectedIndex = profile.selectedProjectIds.indexOf(project.id);
                return <div key={project.id}><SelectionRow checked={selectedIndex >= 0} title={project.name} description={project.description || "No project description"} onToggle={() => toggleSelection("project", project.id)} onMoveUp={() => moveSelection("project", project.id, -1)} onMoveDown={() => moveSelection("project", project.id, 1)} isFirst={selectedIndex <= 0} isLast={selectedIndex < 0 || selectedIndex === profile.selectedProjectIds.length - 1} />{selectedIndex >= 0 && <div className="mt-3"><ProjectOverrides project={project} profile={profile} onChange={setProfile} /></div>}</div>;
              })}
              {!source.projects.length && <EmptyRow label="Add projects in the Projects module first." />}
            </div>
          </Card>

          <Card title="Education" description="Optional structured education records. Start/end months can be left blank, and GPA is optional. Dates are rendered as Month Year for ATS readability.">
            <div className="space-y-4">{profile.education.map((item, index) => <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-medium text-white">Education {index + 1}</p><button type="button" onClick={() => updateProfile({ education: profile.education.filter((_entry, itemIndex) => itemIndex !== index) })} className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove education"><Trash2 size={15} /></button></div><div className="grid gap-4 md:grid-cols-2"><Field label="Institution" value={item.institution} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { institution: value }) })} /><Field label="Degree" value={item.degree} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { degree: value }) })} /><Field label="Field of study" value={item.field} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { field: value }) })} /><Field label="Location" value={item.location} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { location: value }) })} /><Field label="Start month (optional)" type="month" value={item.startDate} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { startDate: value }) })} /><Field label="End month (optional)" type="month" value={item.endDate} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { endDate: value }) })} /><Field label="GPA (optional)" value={item.gpa} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { gpa: value }) })} placeholder="e.g. 3.8/4.0 or 87%" /></div><div className="mt-4"><TextArea label="Details (optional)" value={item.details} onChange={(value) => updateProfile({ education: updateArrayItem(profile.education, index, { details: value }) })} rows={2} /></div></div>)}<ActionButton icon={Plus} onClick={() => updateProfile({ education: [...profile.education, emptyEducation()] })}>Add education</ActionButton></div>
          </Card>

          <Card title="Certifications" description="Add relevant certifications with issuer, date, and optional verification URL.">
            <div className="space-y-4">{profile.certifications.map((item, index) => <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-medium text-white">Certification {index + 1}</p><button type="button" onClick={() => updateProfile({ certifications: profile.certifications.filter((_entry, itemIndex) => itemIndex !== index) })} className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove certification"><Trash2 size={15} /></button></div><div className="grid gap-4 md:grid-cols-2"><Field label="Certification name" value={item.name} onChange={(value) => updateProfile({ certifications: updateArrayItem(profile.certifications, index, { name: value }) })} /><Field label="Issuing organization" value={item.issuer} onChange={(value) => updateProfile({ certifications: updateArrayItem(profile.certifications, index, { issuer: value }) })} /><Field label="Date" type="month" value={item.date} onChange={(value) => updateProfile({ certifications: updateArrayItem(profile.certifications, index, { date: value }) })} /><Field label="Verification URL" value={item.url} onChange={(value) => updateProfile({ certifications: updateArrayItem(profile.certifications, index, { url: value }) })} placeholder="https://..." /></div></div>)}<ActionButton icon={Plus} onClick={() => updateProfile({ certifications: [...profile.certifications, emptyCertification()] })}>Add certification</ActionButton></div>
          </Card>

          <Card title="Languages and achievements" description="Keep these concise and relevant to the target role.">
            <div className="space-y-5"><div><div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium text-zinc-300">Languages</p><ActionButton icon={Plus} onClick={() => updateProfile({ languages: [...profile.languages, emptyLanguage()] })}>Add language</ActionButton></div><div className="space-y-3">{profile.languages.map((item, index) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><Field label="Language" value={item.name} onChange={(value) => updateProfile({ languages: updateArrayItem(profile.languages, index, { name: value }) })} /></div><div className="min-w-0 flex-1"><Field label="Proficiency" value={item.proficiency} onChange={(value) => updateProfile({ languages: updateArrayItem(profile.languages, index, { proficiency: value }) })} placeholder="Native, Fluent, Professional" /></div><button type="button" onClick={() => updateProfile({ languages: profile.languages.filter((_entry, itemIndex) => itemIndex !== index) })} className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove language"><Trash2 size={15} /></button></div>)}</div></div><div><div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium text-zinc-300">Additional achievements</p><ActionButton icon={Plus} onClick={() => updateProfile({ achievements: [...profile.achievements, ""] })}>Add achievement</ActionButton></div><div className="space-y-3">{profile.achievements.map((item, index) => <div key={`achievement-${index}`} className="flex items-start gap-2"><span className="mt-3 text-zinc-600">•</span><textarea rows={2} value={item} onChange={(event) => updateProfile({ achievements: profile.achievements.map((entry, itemIndex) => itemIndex === index ? event.target.value : entry) })} className="min-w-0 flex-1 resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" aria-label={`Achievement ${index + 1}`} /><button type="button" onClick={() => updateProfile({ achievements: profile.achievements.filter((_entry, itemIndex) => itemIndex !== index) })} className="mt-2 rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove achievement"><Trash2 size={14} /></button></div>)}</div></div></div>
          </Card>
        </div>

        <div className="space-y-6 2xl:sticky 2xl:top-28"><CheckList document={document} /><Card title="Live CV preview" description="This preview mirrors the document structure used by the DOCX and PDF exports."><Preview document={document} /></Card></div>
      </div>
    </div>
  );
}
import React from 'react';
