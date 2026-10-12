import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Eye,
  Globe2,
  Languages,
  MousePointerClick,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { firebaseApp } from "../lib/firebase";
import {
  type VisitorAnalyticsEvent,
  type VisitorClickTarget,
  type VisitorDevice,
  type VisitorLanguage,
} from "../lib/visitorAnalytics";
import { useI18n } from "../context/LanguageContext";

type AnalyticsEventRecord = Omit<VisitorAnalyticsEvent, "id" | "occurredAt" | "expiresAt"> & {
  id: string;
  occurredAt: Date;
};

type CountItem = {
  label: string;
  value: number;
};

export type VisitorAnalyticsSummary = {
  uniqueVisitors: number;
  sessions: number;
  pageViews: number;
  clicks: number;
  dailyTrend: Array<{ key: string; label: string; value: number }>;
  referrers: CountItem[];
  countries: CountItem[];
  cities: CountItem[];
  devices: CountItem[];
  languages: CountItem[];
  clickTargets: CountItem[];
};

const firestore = getFirestore(firebaseApp);
const analyticsEventsCollection = collection(firestore, "analytics_events");
const rangeOptions = [7, 30, 90] as const;
const maxEventsPerKind = 5000;

type RangeDays = (typeof rangeOptions)[number];

function toDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;

  if (value && typeof value === "object") {
    const candidate = value as { toDate?: unknown };
    if (typeof candidate.toDate === "function") {
      const date = candidate.toDate();
      return date instanceof Date ? date : null;
    }
  }

  return null;
}

function toEventRecord(id: string, data: Record<string, unknown>): AnalyticsEventRecord | null {
  const occurredAt = toDate(data.occurredAt);
  const kind = data.kind === "page_view" || data.kind === "click" ? data.kind : null;
  const visitorId = typeof data.visitorId === "string" ? data.visitorId : "";
  const sessionId = typeof data.sessionId === "string" ? data.sessionId : "";

  if (!occurredAt || !kind || !visitorId || !sessionId) return null;

  const device: VisitorDevice =
    data.device === "mobile" ||
    data.device === "tablet" ||
    data.device === "desktop" ||
    data.device === "unknown"
      ? data.device
      : "unknown";
  const language: VisitorLanguage = data.language === "ar" ? "ar" : "en";
  const targetType: VisitorClickTarget | undefined =
    data.targetType === "section" ||
    data.targetType === "contact" ||
    data.targetType === "social" ||
    data.targetType === "resume" ||
    data.targetType === "project" ||
    data.targetType === "product"
      ? data.targetType
      : undefined;

  return {
    id,
    kind,
    visitorId,
    sessionId,
    path: typeof data.path === "string" ? data.path : "/",
    referrer: typeof data.referrer === "string" ? data.referrer : "direct",
    device,
    language,
    country: typeof data.country === "string" ? data.country : "unknown",
    city: typeof data.city === "string" ? data.city : "unknown",
    targetType,
    targetId: typeof data.targetId === "string" ? data.targetId : undefined,
    occurredAt,
  };
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function aggregateVisitorEvents(
  events: AnalyticsEventRecord[],
  rangeDays: RangeDays,
  language: VisitorLanguage
): VisitorAnalyticsSummary {
  const pageViews = events.filter((event) => event.kind === "page_view");
  const clicks = events.filter((event) => event.kind === "click");
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (rangeDays - 1));

  const dailyValues = new Map<string, number>();
  for (let index = 0; index < rangeDays; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    dailyValues.set(dayKey(date), 0);
  }

  pageViews.forEach((event) => {
    const key = dayKey(event.occurredAt);
    if (dailyValues.has(key)) dailyValues.set(key, (dailyValues.get(key) ?? 0) + 1);
  });

  const dailyTrend = Array.from(dailyValues.entries()).map(([key, value]) => {
    const date = new Date(`${key}T12:00:00`);
    return {
      key,
      value,
      label: date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
      }),
    };
  });

  return {
    uniqueVisitors: new Set(pageViews.map((event) => event.visitorId)).size,
    sessions: new Set(pageViews.map((event) => event.sessionId)).size,
    pageViews: pageViews.length,
    clicks: clicks.length,
    dailyTrend,
    referrers: countBy(pageViews.map((event) => event.referrer || "direct")).slice(0, 8),
    countries: countBy(pageViews.map((event) => event.country || "unknown")).slice(0, 8),
    cities: countBy(pageViews.map((event) => event.city || "unknown")).slice(0, 8),
    devices: countBy(pageViews.map((event) => event.device)).slice(0, 8),
    languages: countBy(pageViews.map((event) => event.language)).slice(0, 8),
    clickTargets: countBy(
      clicks.map((event) => `${event.targetType ?? "other"}:${event.targetId ?? "unknown"}`)
    ).slice(0, 8),
  };
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  formatNumber,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  tone: string;
  formatNumber: (value: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10">
      <div className="mb-5 flex items-center justify-between">
        <span className={`rounded-xl bg-zinc-950 p-2.5 ${tone}`}>
          <Icon size={19} />
        </span>
        <Activity className="text-zinc-700" size={18} />
      </div>
      <p className="text-3xl font-semibold text-white">{formatNumber(value)}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function RankingCard({
  title,
  items,
  emptyLabel,
  formatLabel,
  formatNumber,
}: {
  title: string;
  items: CountItem[];
  emptyLabel: string;
  formatLabel?: (label: string) => string;
  formatNumber: (value: number) => string;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-5 space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-zinc-300">{formatLabel ? formatLabel(item.label) : item.label}</span>
                <span className="shrink-0 text-zinc-500">{formatNumber(item.value)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-950">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${Math.max((item.value / maximum) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-600">
            {emptyLabel}
          </p>
        )}
      </div>
    </section>
  );
}

function formatDevice(label: string, text: (en: string, ar: string) => string) {
  if (label === "mobile") return text("Mobile", "هاتف محمول");
  if (label === "tablet") return text("Tablet", "جهاز لوحي");
  if (label === "desktop") return text("Desktop", "سطح المكتب");
  return text("Unknown", "غير معروف");
}

function formatLanguage(label: string, text: (en: string, ar: string) => string) {
  return label === "ar" ? text("Arabic", "العربية") : text("English", "الإنجليزية");
}

function formatClickTarget(label: string, text: (en: string, ar: string) => string) {
  const separatorIndex = label.indexOf(":");
  if (separatorIndex === -1) return label;

  const type = label.slice(0, separatorIndex);
  const target = label.slice(separatorIndex + 1);
  const typeLabel =
    type === "section"
      ? text("Section", "قسم")
      : type === "project"
        ? text("Project", "مشروع")
        : type === "product"
          ? text("Product", "منتج")
        : type === "social"
          ? text("Social", "منصة")
          : type === "resume"
            ? text("Resume", "السيرة الذاتية")
            : type === "contact"
              ? text("Contact", "تواصل")
              : text("Other", "أخرى");
  return `${typeLabel}: ${target}`;
}

export function VisitorAnalytics() {
  const { language, direction } = useI18n();
  const isArabic = language === "ar";
  const text = useCallback((en: string, ar: string) => (isArabic ? ar : en), [isArabic]);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [events, setEvents] = useState<AnalyticsEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (rangeDays - 1));
    const start = Timestamp.fromDate(startDate);
    const end = Timestamp.fromDate(new Date());

    try {
      const buildQuery = (kind: "page_view" | "click") =>
        query(
          analyticsEventsCollection,
          where("kind", "==", kind),
          where("occurredAt", ">=", start),
          where("occurredAt", "<=", end),
          orderBy("occurredAt", "desc"),
          limit(maxEventsPerKind)
        );

      const [pageViewSnapshot, clickSnapshot] = await Promise.all([
        getDocs(buildQuery("page_view")),
        getDocs(buildQuery("click")),
      ]);
      const nextEvents = [...pageViewSnapshot.docs, ...clickSnapshot.docs]
        .map((snapshot) => toEventRecord(snapshot.id, snapshot.data() as Record<string, unknown>))
        .filter((event): event is AnalyticsEventRecord => Boolean(event))
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

      setEvents(nextEvents);
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : text("Unable to load visitor analytics.", "تعذر تحميل تحليلات الزوار.")
      );
    } finally {
      setLoading(false);
    }
  }, [rangeDays, text]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const summary = useMemo(
    () => aggregateVisitorEvents(events, rangeDays, language),
    [events, language, rangeDays]
  );
  const formatNumber = (value: number) => value.toLocaleString(isArabic ? "ar-EG" : "en-US");
  const maxDailyViews = Math.max(...summary.dailyTrend.map((item) => item.value), 1);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-zinc-900" />)}
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-900 sm:col-span-2 xl:col-span-4" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            {text("Private visitor trends from the last 90 days of available event data.", "اتجاهات الزوار الخاصة من بيانات الأحداث المتاحة لآخر 90 يوماً.")}
          </p>
          {lastUpdated && (
            <p className="mt-2 text-xs text-zinc-600">
              {text("Updated", "آخر تحديث")} {lastUpdated.toLocaleTimeString(isArabic ? "ar-EG" : "en-US")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
            <CalendarDays size={16} className="text-cyan-400" />
            <span className="text-xs text-zinc-500">{text("Range", "الفترة")}</span>
            {rangeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRangeDays(option)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${rangeDays === option ? "bg-cyan-400 text-black" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
              >
                {option}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:border-cyan-400 hover:text-white"
          >
            <RefreshCw size={16} />
            {text("Refresh", "تحديث")}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-200" role="alert">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={text("Unique visitors", "الزوار الفريدون")} value={summary.uniqueVisitors} icon={Users} tone="text-cyan-300" formatNumber={formatNumber} />
        <MetricCard label={text("Sessions", "الجلسات")} value={summary.sessions} icon={Activity} tone="text-violet-300" formatNumber={formatNumber} />
        <MetricCard label={text("Page views", "مشاهدات الصفحات")} value={summary.pageViews} icon={Eye} tone="text-emerald-300" formatNumber={formatNumber} />
        <MetricCard label={text("Tracked clicks", "النقرات المسجلة")} value={summary.clicks} icon={MousePointerClick} tone="text-amber-300" formatNumber={formatNumber} />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">{text("Daily page views", "مشاهدات الصفحات اليومية")}</h2>
            <p className="mt-1 text-xs text-zinc-500">{text(`${rangeDays}-day traffic trend`, `اتجاه الزيارات خلال ${rangeDays} يوماً`)}</p>
          </div>
          <Activity className="text-zinc-700" size={18} />
        </div>
        {summary.pageViews ? (
          <div className="mt-8 flex h-56 items-end gap-1 overflow-x-auto pb-7 sm:gap-2">
            {summary.dailyTrend.map((item) => (
              <div key={item.key} className="group relative flex h-full min-w-[9px] flex-1 items-end justify-center sm:min-w-[14px]">
                <div
                  className="w-full rounded-t-md bg-cyan-400/80 transition-all group-hover:bg-cyan-300"
                  style={{ height: `${Math.max((item.value / maxDailyViews) * 100, item.value ? 4 : 1)}%` }}
                  title={`${item.label}: ${formatNumber(item.value)}`}
                />
                {(item.key === summary.dailyTrend[0]?.key || item.key === summary.dailyTrend[summary.dailyTrend.length - 1]?.key || item.value === maxDailyViews) && (
                  <span className="absolute top-full mt-2 whitespace-nowrap text-[10px] text-zinc-600">{item.label}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-zinc-800 px-4 py-12 text-center text-sm text-zinc-600">
            {text("No page views in this period.", "لا توجد مشاهدات صفحات خلال هذه الفترة.")}
          </p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <RankingCard title={text("Top referrers", "أكثر مصادر الإحالة")} items={summary.referrers} emptyLabel={text("No referrer data yet.", "لا توجد بيانات إحالة بعد.")} formatNumber={formatNumber} />
        <RankingCard title={text("Visitor countries", "دول الزوار")} items={summary.countries} emptyLabel={text("No country data yet.", "لا توجد بيانات دول بعد.")} formatNumber={formatNumber} />
        <RankingCard title={text("Visitor cities", "مدن الزوار")} items={summary.cities} emptyLabel={text("No city data yet.", "لا توجد بيانات مدن بعد.")} formatNumber={formatNumber} />
        <RankingCard title={text("Device types", "أنواع الأجهزة")} items={summary.devices} emptyLabel={text("No device data yet.", "لا توجد بيانات أجهزة بعد.")} formatLabel={(label) => formatDevice(label, text)} formatNumber={formatNumber} />
        <RankingCard title={text("Visitor language", "لغة الزوار")} items={summary.languages} emptyLabel={text("No language data yet.", "لا توجد بيانات لغة بعد.")} formatLabel={(label) => formatLanguage(label, text)} formatNumber={formatNumber} />
        <RankingCard title={text("Top tracked clicks", "أكثر النقرات المسجلة")} items={summary.clickTargets} emptyLabel={text("No clicks in this period.", "لا توجد نقرات خلال هذه الفترة.")} formatLabel={(label) => formatClickTarget(label, text)} formatNumber={formatNumber} />
      </div>

      <p className="flex items-center gap-2 text-xs text-zinc-600">
        <Globe2 size={14} />
        <Languages size={14} />
        {text("Visitor IDs are random browser/session identifiers; only the country and city returned by the location provider are stored. No IP addresses or full referrer URLs are stored here.", "معرّفات الزوار عشوائية للمتصفح والجلسة؛ يتم تخزين الدولة والمدينة فقط من مزود تحديد الموقع. لا يتم تخزين عناوين IP أو روابط الإحالة الكاملة هنا.")}
      </p>
    </div>
  );
}
