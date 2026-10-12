import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useRef } from "react";
import { firebaseApp } from "./firebase";

export type VisitorLanguage = "en" | "ar";
export type VisitorDevice = "mobile" | "tablet" | "desktop" | "unknown";
export type VisitorEventKind = "page_view" | "click";
export type VisitorClickTarget =
  | "section"
  | "contact"
  | "social"
  | "resume"
  | "project"
  | "product";

export type VisitorLocation = {
  country: string;
  city: string;
};

export type VisitorAnalyticsEvent = {
  id?: string;
  kind: VisitorEventKind;
  visitorId: string;
  sessionId: string;
  path: string;
  referrer: string;
  device: VisitorDevice;
  language: VisitorLanguage;
  country: string;
  city: string;
  targetType?: VisitorClickTarget;
  targetId?: string;
  occurredAt?: Timestamp | Date | null;
  expiresAt?: Timestamp | Date | null;
};

const firestore = getFirestore(firebaseApp);
const analyticsEventsCollection = collection(firestore, "analytics_events");
const visitorIdKey = "portfolio-visitor-id";
const sessionIdKey = "portfolio-session-id";
const locationKey = "portfolio-visitor-location";
const retentionDays = 90;
const unknownLocation: VisitorLocation = { country: "unknown", city: "unknown" };

let fallbackVisitorId: string | undefined;
let fallbackSessionId: string | undefined;
let visitorLocationPromise: Promise<VisitorLocation> | undefined;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function getStoredId(
  storage: Storage,
  key: string,
  fallback: "visitor" | "session"
) {
  const existingFallback = fallback === "visitor" ? fallbackVisitorId : fallbackSessionId;

  try {
    const existing = storage.getItem(key);
    if (existing) return existing;

    const nextId = existingFallback ?? createId();
    storage.setItem(key, nextId);
    return nextId;
  } catch {
    const nextId = existingFallback ?? createId();
    if (fallback === "visitor") fallbackVisitorId = nextId;
    else fallbackSessionId = nextId;
    return nextId;
  }
}

function getVisitorId() {
  return getStoredId(window.localStorage, visitorIdKey, "visitor");
}

function getSessionId() {
  return getStoredId(window.sessionStorage, sessionIdKey, "session");
}

function getDevice(): VisitorDevice {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return "tablet";
  if (/mobi|android|iphone|ipod|phone/.test(userAgent)) return "mobile";
  if (userAgent) return "desktop";
  return "unknown";
}

function getReferrer() {
  if (!document.referrer) return "direct";

  try {
    return new URL(document.referrer).hostname.toLowerCase().slice(0, 128) || "direct";
  } catch {
    return "direct";
  }
}

function getPath() {
  return window.location.pathname.slice(0, 200) || "/";
}

function cleanLocationValue(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 128)
    : "unknown";
}

function readCachedLocation() {
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(locationKey) ?? "null") as Partial<VisitorLocation> | null;
    if (cached?.country && cached.city) {
      return {
        country: cleanLocationValue(cached.country),
        city: cleanLocationValue(cached.city),
      };
    }
  } catch {
    // Storage may be unavailable or contain an invalid value.
  }

  return null;
}

async function resolveVisitorLocation(): Promise<VisitorLocation> {
  if (typeof window === "undefined") return unknownLocation;

  const cached = readCachedLocation();
  if (cached) return cached;

  try {
    const response = await fetch("https://ipapi.co/json/", {
      headers: { Accept: "application/json" },
      credentials: "omit",
    });
    if (!response.ok) return unknownLocation;

    const data = (await response.json()) as Record<string, unknown>;
    const location = {
      country: cleanLocationValue(data.country_name ?? data.country),
      city: cleanLocationValue(data.city),
    };

    try {
      window.sessionStorage.setItem(locationKey, JSON.stringify(location));
    } catch {
      // Tracking still works when session storage is unavailable.
    }
    return location;
  } catch {
    return unknownLocation;
  }
}

function getVisitorLocation() {
  visitorLocationPromise ??= resolveVisitorLocation();
  return visitorLocationPromise;
}

function getExpiry() {
  return Timestamp.fromMillis(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
}

function cleanTargetId(targetId: string | undefined) {
  return targetId?.trim().slice(0, 120) || undefined;
}

async function writeEvent(
  kind: VisitorEventKind,
  language: VisitorLanguage,
  target?: { type: VisitorClickTarget; id?: string }
) {
  if (typeof window === "undefined") return;
  const location = await getVisitorLocation();

  await addDoc(analyticsEventsCollection, {
    kind,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    path: getPath(),
    referrer: getReferrer(),
    device: getDevice(),
    language,
    country: location.country,
    city: location.city,
    ...(target
      ? {
          targetType: target.type,
          targetId: cleanTargetId(target.id) ?? "unknown",
        }
      : {}),
    occurredAt: serverTimestamp(),
    expiresAt: getExpiry(),
  });
}

export function trackPageView(language: VisitorLanguage) {
  return writeEvent("page_view", language).catch(() => undefined);
}

export function trackClick(
  language: VisitorLanguage,
  type: VisitorClickTarget,
  id?: string
) {
  return writeEvent("click", language, { type, id }).catch(() => undefined);
}

export function useVisitorAnalytics(language: VisitorLanguage) {
  const pageViewTracked = useRef(false);

  useEffect(() => {
    if (!pageViewTracked.current) {
      pageViewTracked.current = true;
      void trackPageView(language);
    }

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const trackedElement = event.target.closest<HTMLElement>(
        "[data-analytics-target]"
      );
      if (!trackedElement) return;

      const type = trackedElement.dataset.analyticsTarget;
      if (
        type !== "section" &&
        type !== "contact" &&
        type !== "social" &&
        type !== "resume" &&
        type !== "project" &&
        type !== "product"
      ) {
        return;
      }

      void trackClick(language, type, trackedElement.dataset.analyticsId);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [language, pageViewTracked]);
}
