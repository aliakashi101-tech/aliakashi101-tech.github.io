import { doc, getDoc, getFirestore, setDoc, serverTimestamp } from "firebase/firestore";
import { firebaseApp } from "./firebase";

export type SupportedLanguage = "en" | "ar";

export type LocalizedText = {
  en?: string;
  ar?: string;
};

export type SiteContentKey =
  | "profile"
  | "about"
  | "skills"
  | "contact"
  | "settings";

export type SiteContentMap = Partial<Record<SiteContentKey, Record<string, unknown>>>;

const firestore = getFirestore(firebaseApp);
const collectionName = "site_content";

export async function loadSiteContent(): Promise<SiteContentMap> {
  const keys: SiteContentKey[] = [
    "profile",
    "about",
    "skills",
    "contact",
    "settings",
  ];

  const entries = await Promise.all(
    keys.map(async (key) => {
      const snapshot = await getDoc(doc(firestore, collectionName, key));
      if (!snapshot.exists()) return [key, undefined] as const;

      const data = { ...snapshot.data() } as Record<string, unknown>;
      delete data.updatedAt;
      return [key, data] as const;
    })
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [SiteContentKey, Record<string, unknown>] =>
      Boolean(entry[1])
    )
  );
}

export async function saveSiteContent(
  key: SiteContentKey,
  data: Record<string, unknown>
) {
  await setDoc(
    doc(firestore, collectionName, key),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function localizeSiteContent(
  value: unknown,
  language: SupportedLanguage
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => localizeSiteContent(item, language));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  if ("en" in record || "ar" in record) {
    const selected = record[language] ?? record[language === "en" ? "ar" : "en"];
    return selected === undefined ? "" : localizeSiteContent(selected, language);
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      localizeSiteContent(child, language),
    ])
  );
}

export function deepMerge<T extends Record<string, any>>(
  base: T,
  override: Record<string, unknown>
): T {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

export function getLocalizedField(value: unknown, fallback = "") {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  return (
    (typeof record.en === "string" && record.en) ||
    (typeof record.ar === "string" && record.ar) ||
    fallback
  );
}
