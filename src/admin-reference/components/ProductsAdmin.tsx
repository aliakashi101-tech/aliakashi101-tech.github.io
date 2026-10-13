import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useI18n } from "../context/LanguageContext";
import { firebaseApp } from "../lib/firebase";
import {
  normalizeProduct,
  type ProductRecord,
} from "../lib/products";

type LocalizedInput = { en: string; ar: string };

type ProductFeatureForm = {
  title: LocalizedInput;
  description: LocalizedInput;
};

type ProductForm = {
  id?: string;
  name: LocalizedInput;
  tagline: LocalizedInput;
  description: LocalizedInput;
  role: LocalizedInput;
  coverImage: string;
  gallery: string[];
  features: ProductFeatureForm[];
  techStack: string[];
  landingUrl: string;
  dashboardUrl: string;
  demoVideoUrl: string;
  demoUsername: string;
  demoPassword: string;
  viewOrder: string;
  hidden: boolean;
};

type ProductsAdminProps = {
  onDataChanged: () => void;
};

const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const productsCollection = collection(firestore, "products");

function emptyLocalized(): LocalizedInput {
  return { en: "", ar: "" };
}

function localizedFrom(value: { en?: string; ar?: string } | undefined): LocalizedInput {
  return { en: value?.en ?? "", ar: value?.ar ?? "" };
}

function formFromProduct(product: ProductRecord): ProductForm {
  return {
    id: product.id,
    name: localizedFrom(product.name),
    tagline: localizedFrom(product.tagline),
    description: localizedFrom(product.description),
    role: localizedFrom(product.role),
    coverImage: product.coverImage ?? "",
    gallery: [...product.gallery],
    features: product.features.map((feature) => ({
      title: localizedFrom(feature.title),
      description: localizedFrom(feature.description),
    })),
    techStack: [...product.techStack],
    landingUrl: product.links.landing ?? "",
    dashboardUrl: product.links.dashboard ?? "",
    demoVideoUrl: product.links.demoVideo ?? "",
    demoUsername: product.demoCredentials?.username ?? "",
    demoPassword: product.demoCredentials?.password ?? "",
    viewOrder: String(product.viewOrder ?? 1),
    hidden: product.hidden,
  };
}

function formFromData(id: string, data: Record<string, unknown>) {
  return formFromProduct(normalizeProduct(id, data));
}

function buildPayload(form: ProductForm) {
  const gallery = Array.from(new Set([form.coverImage.trim(), ...form.gallery.map((image) => image.trim())].filter(Boolean)));
  const order = Number.parseInt(form.viewOrder, 10);
  return {
    name_en: form.name.en.trim(),
    name_ar: form.name.ar.trim(),
    tagline_en: form.tagline.en.trim(),
    tagline_ar: form.tagline.ar.trim(),
    description_en: form.description.en.trim(),
    description_ar: form.description.ar.trim(),
    role_en: form.role.en.trim(),
    role_ar: form.role.ar.trim(),
    cover_image: form.coverImage.trim() || gallery[0] || "",
    gallery,
    features: form.features.map((feature) => ({
      title_en: feature.title.en.trim(),
      title_ar: feature.title.ar.trim(),
      description_en: feature.description.en.trim(),
      description_ar: feature.description.ar.trim(),
    })),
    tech_stack: form.techStack.map((item) => item.trim()).filter(Boolean),
    landing_url: form.landingUrl.trim(),
    dashboard_url: form.dashboardUrl.trim(),
    demo_video_url: form.demoVideoUrl.trim(),
    ...(form.demoUsername.trim() || form.demoPassword.trim()
      ? {
          demo_credentials: {
            username: form.demoUsername.trim(),
            password: form.demoPassword.trim(),
          },
        }
      : {}),
    ...(Number.isFinite(order) ? { view_order: order } : {}),
    hidden: form.hidden,
    updatedAt: serverTimestamp(),
  };
}

function validateUrl(value: string) {
  if (!value.trim()) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <input
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
      />
    </label>
  );
}

function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: LocalizedInput;
  onChange: (value: LocalizedInput) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-300">{label}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {(["en", "ar"] as const).map((language) =>
          multiline ? (
            <textarea
              key={language}
              value={value[language]}
              dir={language === "ar" ? "rtl" : "ltr"}
              rows={4}
              placeholder={language === "en" ? "English" : "العربية"}
              onChange={(event) => onChange({ ...value, [language]: event.target.value })}
              className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
            />
          ) : (
            <input
              key={language}
              value={value[language]}
              dir={language === "ar" ? "rtl" : "ltr"}
              placeholder={language === "en" ? "English" : "العربية"}
              onChange={(event) => onChange({ ...value, [language]: event.target.value })}
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
            />
          )
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
      <span>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-cyan-400" : "bg-zinc-700"}`}>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" />
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </label>
  );
}

function ProductEditor({
  form,
  saving,
  uploading,
  onChange,
  onSave,
  onDelete,
  onCancel,
  onUploadCover,
  onUploadGallery,
}: {
  form: ProductForm;
  saving: boolean;
  uploading: boolean;
  onChange: (form: ProductForm) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onUploadCover: (file: File) => void;
  onUploadGallery: (files: File[]) => void;
}) {
  const { language } = useI18n();
  const text = (en: string, ar: string) => (language === "ar" ? ar : en);
  const update = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => onChange({ ...form, [key]: value });
  const updateFeature = (index: number, value: ProductFeatureForm) => {
    const features = [...form.features];
    features[index] = value;
    update("features", features);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">{text("Product", "المنتج")}</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{form.id ? text("Edit product", "تعديل المنتج") : text("New product", "منتج جديد")}</h2>
          {form.id && <p className="mt-1 text-xs text-zinc-600">ID: {form.id}</p>}
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl border border-zinc-800 p-2.5 text-zinc-400 hover:border-cyan-400 hover:text-white" aria-label={text("Close editor", "إغلاق المحرر")}>
          <X size={18} />
        </button>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <LocalizedField label={text("Product name", "اسم المنتج")} value={form.name} onChange={(value) => update("name", value)} />
          <LocalizedField label={text("Tagline", "الوصف المختصر")} value={form.tagline} onChange={(value) => update("tagline", value)} />
        </div>
        <LocalizedField label={text("Description", "الوصف")} value={form.description} onChange={(value) => update("description", value)} multiline />
        <LocalizedField label={text("Your role", "دورك في المنتج")} value={form.role} onChange={(value) => update("role", value)} />

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" aria-labelledby="product-media-heading">
          <div>
            <h3 id="product-media-heading" className="text-sm font-semibold text-white">{text("Product media", "صور المنتج")}</h3>
            <p className="mt-1 text-xs text-zinc-500">{text("Upload a cover image and optional gallery screenshots.", "ارفع صورة غلاف وصوراً إضافية اختيارية.")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Field label={text("Cover image URL", "رابط صورة الغلاف")} value={form.coverImage} onChange={(value) => update("coverImage", value)} placeholder="https://..." />
            <label className="inline-flex cursor-pointer items-end gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 hover:border-cyan-400">
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadCover(file); event.target.value = ""; }} />
              <Upload size={16} />{text("Upload cover", "رفع الغلاف")}
            </label>
          </div>
          {form.coverImage && <img src={form.coverImage} alt="" className="h-40 w-full rounded-xl border border-zinc-800 bg-zinc-950 object-contain p-3" />}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 hover:border-cyan-400">
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) onUploadGallery(files); event.target.value = ""; }} />
            <ImagePlus size={16} />{text("Upload gallery images", "رفع صور المعرض")}
          </label>
          {form.gallery.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{form.gallery.map((image) => <div key={image} className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"><img src={image} alt="" className="h-24 w-full object-contain p-2" /><button type="button" onClick={() => update("gallery", form.gallery.filter((item) => item !== image))} className="absolute end-1 top-1 rounded-lg bg-black/80 p-1.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300" aria-label={text("Remove image", "حذف الصورة")}><Trash2 size={14} /></button></div>)}</div>}
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" aria-labelledby="product-features-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 id="product-features-heading" className="text-sm font-semibold text-white">{text("Capabilities", "المميزات")}</h3><p className="mt-1 text-xs text-zinc-500">{text("Highlight the product capabilities visitors should understand first.", "أبرز المميزات التي تريد أن يفهمها الزوار أولاً.")}</p></div>
            <button type="button" onClick={() => update("features", [...form.features, { title: emptyLocalized(), description: emptyLocalized() }])} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-cyan-400"><Plus size={16} />{text("Add capability", "إضافة ميزة")}</button>
          </div>
          <div className="space-y-4">
            {form.features.map((feature, index) => <div key={index} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.18em] text-zinc-600">{text("Capability", "ميزة")} {index + 1}</span><button type="button" onClick={() => update("features", form.features.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Remove capability", "حذف الميزة")}><Trash2 size={15} /></button></div><div className="space-y-4"><LocalizedField label={text("Title", "العنوان")} value={feature.title} onChange={(value) => updateFeature(index, { ...feature, title: value })} /><LocalizedField label={text("Description", "الوصف")} value={feature.description} onChange={(value) => updateFeature(index, { ...feature, description: value })} multiline /></div></div>)}
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label={text("Tech stack", "التقنيات")} value={form.techStack.join(", ")} onChange={(value) => update("techStack", value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="React, TypeScript, NestJS" />
          <Field label={text("View order", "ترتيب العرض")} value={form.viewOrder} type="number" min="1" onChange={(value) => update("viewOrder", value)} />
        </div>

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" aria-labelledby="product-links-heading">
          <div><h3 id="product-links-heading" className="text-sm font-semibold text-white">{text("Product links", "روابط المنتج")}</h3><p className="mt-1 text-xs text-zinc-500">{text("Optional links are shown only when provided.", "تظهر الروابط الاختيارية عند إضافة قيم لها.")}</p></div>
          <div className="grid gap-4 md:grid-cols-3"><Field label={text("Landing page", "الموقع التعريفي")} value={form.landingUrl} onChange={(value) => update("landingUrl", value)} placeholder="https://..." /><Field label={text("Demo website", "الموقع التجريبي")} value={form.dashboardUrl} onChange={(value) => update("dashboardUrl", value)} placeholder="https://..." /><Field label={text("Demo video", "فيديو العرض")} value={form.demoVideoUrl} onChange={(value) => update("demoVideoUrl", value)} placeholder="https://..." /></div>
          <div className="grid gap-4 md:grid-cols-2"><Field label={text("Demo phone / username", "هاتف / اسم مستخدم التجربة")} value={form.demoUsername} onChange={(value) => update("demoUsername", value)} placeholder="010..." /><Field label={text("Demo password", "كلمة مرور التجربة")} value={form.demoPassword} onChange={(value) => update("demoPassword", value)} placeholder="••••••••" /></div>
        </section>

        <Toggle label={text("Hide from public portfolio", "إخفاء من المعرض العام")} checked={form.hidden} onChange={(value) => update("hidden", value)} />
        {uploading && <p className="text-sm text-cyan-300">{text("Uploading image...", "جاري رفع الصورة...")}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4 sm:px-6">
        <div>{form.id && <button type="button" onClick={onDelete} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-500/60 bg-red-500/5 px-4 py-2.5 text-sm text-red-200 hover:bg-red-500/15 disabled:opacity-50"><Trash2 size={16} />{text("Delete", "حذف")}</button>}</div>
        <div className="flex gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:border-cyan-400">{text("Cancel", "إلغاء")}</button><button type="button" onClick={onSave} disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-300 disabled:opacity-50"><Save size={16} />{saving ? text("Saving...", "جاري الحفظ...") : text("Save product", "حفظ المنتج")}</button></div>
      </div>
    </div>
  );
}

export function ProductsAdmin({ onDataChanged }: ProductsAdminProps) {
  const { language } = useI18n();
  const text = useCallback((en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const [rows, setRows] = useState<ProductForm[]>([]);
  const [editor, setEditor] = useState<ProductForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [orderDirty, setOrderDirty] = useState(false);

  const showMessage = useCallback((value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(""), 3600);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const snapshot = await getDocs(productsCollection);
      const nextRows = snapshot.docs
        .map((item) => formFromData(item.id, item.data()))
        .sort((a, b) => {
          const orderA = Number.parseInt(a.viewOrder, 10);
          const orderB = Number.parseInt(b.viewOrder, 10);
          if (Number.isFinite(orderA) && Number.isFinite(orderB)) return orderA - orderB;
          if (Number.isFinite(orderA)) return -1;
          if (Number.isFinite(orderB)) return 1;
          return a.name.en.localeCompare(b.name.en);
        });
      setRows(nextRows);
      setOrderDirty(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text("Unable to load products.", "تعذر تحميل المنتجات."));
    } finally {
      setLoading(false);
    }
  }, [text]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const addProduct = () => setEditor({
    name: emptyLocalized(),
    tagline: emptyLocalized(),
    description: emptyLocalized(),
    role: emptyLocalized(),
    coverImage: "",
    gallery: [],
    features: [],
    techStack: [],
    landingUrl: "",
    dashboardUrl: "",
    demoVideoUrl: "",
    demoUsername: "",
    demoPassword: "",
    viewOrder: String(rows.length + 1),
    hidden: false,
  });

  const saveProduct = async () => {
    if (!editor) return;
    if (!editor.name.en.trim() && !editor.name.ar.trim()) {
      setError(text("Add a product name before saving.", "أضف اسم المنتج قبل الحفظ."));
      return;
    }
    if (![editor.landingUrl, editor.dashboardUrl, editor.demoVideoUrl].every(validateUrl)) {
      setError(text("Check the product links and try again.", "تحقق من روابط المنتج وحاول مرة أخرى."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(editor);
      if (editor.id) await setDoc(doc(firestore, "products", editor.id), payload, { merge: true });
      else await addDoc(productsCollection, payload);
      setEditor(null);
      showMessage(text("Product saved.", "تم حفظ المنتج."));
      await loadProducts();
      onDataChanged();
      window.dispatchEvent(new CustomEvent("admin-data-updated"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text("Unable to save product.", "تعذر حفظ المنتج."));
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!editor?.id || !window.confirm(text("Delete this product?", "هل تريد حذف هذا المنتج؟"))) return;
    setSaving(true);
    try {
      await deleteDoc(doc(firestore, "products", editor.id));
      setEditor(null);
      showMessage(text("Product deleted.", "تم حذف المنتج."));
      await loadProducts();
      onDataChanged();
      window.dispatchEvent(new CustomEvent("admin-data-updated"));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : text("Unable to delete product.", "تعذر حذف المنتج."));
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, gallery: boolean) => {
    if (!editor) return;
    setUploading(true);
    setError("");
    try {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
      const imageRef = storageRef(storage, `products/${editor.id ?? "new"}/${Date.now()}-${safeName}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      setEditor((current) => {
        if (!current) return current;
        return gallery
          ? { ...current, gallery: Array.from(new Set([...current.gallery, url])) }
          : { ...current, coverImage: url, gallery: Array.from(new Set([...current.gallery, url])) };
      });
      showMessage(text("Image uploaded.", "تم رفع الصورة."));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : text("Unable to upload image.", "تعذر رفع الصورة."));
    } finally {
      setUploading(false);
    }
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next.map((row, rowIndex) => ({ ...row, viewOrder: String(rowIndex + 1) })));
    setOrderDirty(true);
  };

  const saveOrder = async () => {
    const rowsWithIds = rows.filter((row): row is ProductForm & { id: string } => Boolean(row.id));
    setSaving(true);
    try {
      const batch = writeBatch(firestore);
      rowsWithIds.forEach((row, index) => batch.set(doc(firestore, "products", row.id), { view_order: index + 1, updatedAt: serverTimestamp() }, { merge: true }));
      await batch.commit();
      setOrderDirty(false);
      showMessage(text("Product order saved.", "تم حفظ ترتيب المنتجات."));
      await loadProducts();
      onDataChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text("Unable to save product order.", "تعذر حفظ ترتيب المنتجات."));
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = useMemo(() => ({ active: text("Published", "منشور"), hidden: text("Hidden", "مخفي") }), [text]);

  if (editor) {
    return <ProductEditor form={editor} saving={saving} uploading={uploading} onChange={setEditor} onSave={() => void saveProduct()} onDelete={() => void deleteProduct()} onCancel={() => setEditor(null)} onUploadCover={(file) => void uploadImage(file, false)} onUploadGallery={(files) => { void files.reduce((promise, file) => promise.then(() => uploadImage(file, true)), Promise.resolve()); }} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <div><h2 className="text-lg font-semibold text-white">{text("Products", "المنتجات")}</h2><p className="mt-1 text-sm text-zinc-500">{text("Showcase SaaS products you build and operate yourself.", "اعرض منتجات SaaS التي تبنيها وتديرها بنفسك.")}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={addProduct} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-300"><Plus size={16} />{text("Add product", "إضافة منتج")}</button><button type="button" onClick={() => void saveOrder()} disabled={!orderDirty || saving} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:border-cyan-400 disabled:opacity-50"><Save size={16} />{text("Save order", "حفظ الترتيب")}</button><button type="button" onClick={() => void loadProducts()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:border-cyan-400 disabled:opacity-50"><RefreshCw size={16} />{text("Refresh", "تحديث")}</button></div>
      </div>

      {(message || error) && <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-500/40 bg-red-500/5 text-red-200" : "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"}`} role="status"><Check size={17} className="mt-0.5 shrink-0" /><span>{error || message}</span></div>}

      {loading ? <div className="h-48 animate-pulse rounded-2xl bg-zinc-900" /> : rows.length ? <div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="min-w-[860px] w-full text-start text-sm"><thead className="bg-zinc-950/80 text-xs uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-4 py-4 font-medium">{text("Product", "المنتج")}</th><th className="px-4 py-4 font-medium">{text("Order", "الترتيب")}</th><th className="px-4 py-4 font-medium">{text("Links", "الروابط")}</th><th className="px-4 py-4 font-medium">{text("Status", "الحالة")}</th><th className="px-4 py-4 text-end font-medium">{text("Actions", "الإجراءات")}</th></tr></thead><tbody className="divide-y divide-zinc-800">{rows.map((row, index) => <tr key={row.id ?? `starter-${index}`} className="bg-zinc-900/40 transition-colors hover:bg-zinc-800/40"><td className="px-4 py-4"><div className="flex items-center gap-3">{row.coverImage ? <img src={row.coverImage} alt="" className="h-11 w-14 rounded-lg border border-zinc-800 bg-zinc-950 object-contain p-1" /> : <span className="flex h-11 w-14 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-700"><ImagePlus size={17} /></span>}<div className="min-w-0"><div className="truncate font-medium text-white">{row.name.en || row.name.ar || text("Unnamed product", "منتج بدون اسم")}</div><div className="truncate text-xs text-zinc-600">{row.name.ar || text("Arabic name not set", "لم تتم إضافة العربية")}</div></div></div></td><td className="px-4 py-4"><div className="flex items-center gap-1"><button type="button" onClick={() => moveProduct(index, -1)} disabled={index === 0} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" aria-label={text("Move up", "تحريك للأعلى")}><ArrowUp size={15} /></button><span className="min-w-7 text-center text-zinc-300">{row.viewOrder || index + 1}</span><button type="button" onClick={() => moveProduct(index, 1)} disabled={index === rows.length - 1} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" aria-label={text("Move down", "تحريك للأسفل")}><ArrowDown size={15} /></button></div></td><td className="px-4 py-4 text-zinc-400">{[row.landingUrl, row.dashboardUrl, row.demoVideoUrl].filter(Boolean).length}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${row.hidden ? "bg-zinc-800 text-zinc-400" : "bg-emerald-400/10 text-emerald-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${row.hidden ? "bg-zinc-500" : "bg-emerald-400"}`} />{row.hidden ? statusLabel.hidden : statusLabel.active}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditor({ ...row })} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"><Pencil size={15} />{text("Edit", "تعديل")}</button></div></td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-500">{text("No products yet.", "لا توجد منتجات بعد.")}</div>}
    </div>
  );
}

import React from 'react';
