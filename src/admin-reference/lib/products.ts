import type { LocalizedText } from "./siteContent";

export type ProductFeature = {
  title: LocalizedText;
  description: LocalizedText;
};

export type ProductLinkKey = "landing" | "dashboard" | "demoVideo";

export type ProductRecord = {
  id: string;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  role: LocalizedText;
  coverImage?: string;
  gallery: string[];
  features: ProductFeature[];
  techStack: string[];
  links: Partial<Record<ProductLinkKey, string>>;
  demoCredentials?: {
    username: string;
    password: string;
  };
  viewOrder?: number;
  hidden: boolean;
};

export const defaultProductSection = {
  title: { primary: "Products", accent: "I Built" },
  subtitle:
    "SaaS products I design, build, and operate myself from idea to production.",
  linkLabels: {
    landing: "Visit product",
    dashboard: "Demo website",
    demoVideo: "Watch demo",
  },
  demoAccess: {
    title: "Demo website access",
    note: "Use these credentials to explore the live demo.",
    username: "Phone / username",
    password: "Password",
    copy: "Copy",
    copied: "Copied",
  },
  states: {
    loading: "Loading products...",
    error: "Unable to load products right now. Please try again.",
    empty: "Products will appear here once they are published.",
    retry: "Try again",
  },
};

function sanitizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function localizedValue(value: unknown): LocalizedText {
  if (typeof value === "string") return { en: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    en: sanitizeString(record.en),
    ar: sanitizeString(record.ar),
  };
}

function legacyLocalizedValue(data: Record<string, unknown>, key: string) {
  return {
    en: sanitizeString(data[`${key}_en`] ?? data[`${key}En`] ?? data[key]),
    ar: sanitizeString(data[`${key}_ar`] ?? data[`${key}Ar`]),
  };
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function demoCredentialsValue(data: Record<string, unknown>) {
  const raw = data.demo_credentials ?? data.demoCredentials;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const credentials = raw as Record<string, unknown>;
  const username = sanitizeString(credentials.username ?? credentials.phone);
  const password = sanitizeString(credentials.password);
  return username && password ? { username, password } : undefined;
}

export function getLocalizedProductValue(
  value: LocalizedText | undefined,
  language: "en" | "ar",
  fallback = ""
) {
  return value?.[language] ?? value?.[language === "en" ? "ar" : "en"] ?? fallback;
}

export function normalizeProduct(
  id: string,
  data: Record<string, unknown>
): ProductRecord {
  const rawFeatures = Array.isArray(data.features) ? data.features : [];
  const features = rawFeatures.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const feature = item as Record<string, unknown>;
    return [
      {
        title:
          feature.title && typeof feature.title === "object"
            ? localizedValue(feature.title)
            : legacyLocalizedValue(feature, "title"),
        description:
          feature.description && typeof feature.description === "object"
            ? localizedValue(feature.description)
            : legacyLocalizedValue(feature, "description"),
      },
    ];
  });

  const rawLinks = data.links && typeof data.links === "object" ? data.links : {};
  const linksRecord = rawLinks as Record<string, unknown>;
  const links = {
    landing: sanitizeString(linksRecord.landing ?? data.landing_url),
    dashboard: sanitizeString(linksRecord.dashboard ?? data.dashboard_url),
    demoVideo: sanitizeString(linksRecord.demoVideo ?? data.demo_video_url),
  };

  const coverImage = sanitizeString(data.cover_image ?? data.coverImage);
  const gallery = Array.from(
    new Set(
      [coverImage, ...(Array.isArray(data.gallery) ? data.gallery : [])].filter(
        (value): value is string => Boolean(sanitizeString(value))
      )
    )
  );

  const normalized: ProductRecord = {
    id,
    name:
      data.name && typeof data.name === "object"
        ? localizedValue(data.name)
        : legacyLocalizedValue(data, "name"),
    tagline:
      data.tagline && typeof data.tagline === "object"
        ? localizedValue(data.tagline)
        : legacyLocalizedValue(data, "tagline"),
    description:
      data.description && typeof data.description === "object"
        ? localizedValue(data.description)
        : legacyLocalizedValue(data, "description"),
    role:
      data.role && typeof data.role === "object"
        ? localizedValue(data.role)
        : legacyLocalizedValue(data, "role"),
    coverImage: coverImage ?? gallery[0],
    gallery,
    features,
    techStack: Array.isArray(data.tech_stack)
      ? data.tech_stack.filter(
          (value): value is string => Boolean(sanitizeString(value))
        )
      : [],
    links,
    demoCredentials: demoCredentialsValue(data),
    viewOrder: parseNumber(data.view_order ?? data.viewOrder),
    hidden: data.hidden === true,
  };

  return normalized;
}

