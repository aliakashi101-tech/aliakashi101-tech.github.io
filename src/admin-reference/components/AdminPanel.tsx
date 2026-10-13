import React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Eye,
  FileText,
  FolderKanban,
  Globe2,
  ImagePlus,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { firebaseApp } from "../lib/firebase";
import {
  loadSiteContent,
  saveSiteContent,
  type SiteContentKey,
} from "../lib/siteContent";
import {
  loadCvProfile,
  type CvProfile,
  type CvSourceData,
} from "../lib/cv";
import { translations, useI18n } from "../context/LanguageContext";
import {
  isProjectCollaboration,
  PROJECT_COLLABORATION_OPTIONS,
  type ProjectCollaboration,
} from "../lib/projectCollaboration";
import { VisitorAnalytics } from "./VisitorAnalytics";
import { CvBuilder } from "./CvBuilder";
import { ProductsAdmin } from "./ProductsAdmin";
import { WebsitesAdmin } from "./WebsitesAdmin";
import { starterProjects } from "../../projectData";

const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const experienceCollection = collection(firestore, "experience");
const projectsCollection = collection(firestore, "projects");

type LocalizedInput = { en: string; ar: string };

type ExperienceForm = {
  id?: string;
  jobTitleEn: string;
  jobTitleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  companyEn: string;
  companyAr: string;
  companyLink: string;
  image: string;
  startDate: string;
  endDate: string;
  updatedAt?: unknown;
};

type ProjectForm = {
  id?: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  photos: string[];
  viewOrder: string;
  appStore: string;
  appStoreVisible: boolean;
  googlePlay: string;
  googlePlayVisible: boolean;
  googleDrive: string;
  googleDriveVisible: boolean;
  website: string;
  websiteVisible: boolean;
  appInstalls: string;
  collaboration: ProjectCollaboration | "";
  hidden: boolean;
  legacy: boolean;
  updatedAt?: unknown;
};

type SkillCategory = {
  id: string;
  title: LocalizedInput;
  items: LocalizedInput[];
};

type SkillTrack = {
  id: string;
  title: LocalizedInput;
  description: LocalizedInput;
  level: LocalizedInput;
  experienceLevel: number;
  proficiency: number;
  skills: LocalizedInput[];
};

type SocialLink = {
  id: string;
  name: LocalizedInput;
  url: string;
  icon: string;
};

type SiteDrafts = {
  profile: Record<string, any>;
  about: Record<string, any>;
  skills: Record<string, any> & { tracks: SkillTrack[]; categories: SkillCategory[] };
  contact: Record<string, any> & { socialLinks: SocialLink[] };
  settings: Record<string, any>;
};

type AdminModule =
  | "overview"
  | "profile"
  | "about"
  | "experience"
  | "products"
  | "websites"
  | "projects"
  | "skills"
  | "contact"
  | "cv"
  | "analytics"
  | "settings";

type DrawerState =
  | { type: "experience"; form: ExperienceForm }
  | null;

type AdminPanelProps = {
  onBack: () => void;
  onDataChanged: () => void;
  userEmail: string;
  onSignOut: () => Promise<void>;
};

const moduleDefinitions: Array<{
  key: AdminModule;
  label: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: LucideIcon;
}> = [
  {
    key: "overview",
    label: { en: "Overview", ar: "نظرة عامة" },
    description: { en: "Manage your portfolio", ar: "إدارة محتوى معرضك" },
    icon: LayoutDashboard,
  },
  {
    key: "profile",
    label: { en: "Profile / Hero", ar: "الملف الشخصي" },
    description: { en: "Intro and identity", ar: "المقدمة والهوية" },
    icon: CircleUserRound,
  },
  {
    key: "about",
    label: { en: "About", ar: "نبذة عني" },
    description: { en: "Your story and stats", ar: "قصتك وإحصائياتك" },
    icon: FileText,
  },
  {
    key: "experience",
    label: { en: "Experience", ar: "الخبرات" },
    description: { en: "Work history", ar: "السجل المهني" },
    icon: BriefcaseBusiness,
  },
  {
    key: "products",
    label: { en: "Products", ar: "المنتجات" },
    description: { en: "Founder-built SaaS", ar: "منتجات SaaS بنيتها" },
    icon: Sparkles,
  },
  {
    key: "websites",
    label: { en: "Websites", ar: "مواقع الويب" },
    description: { en: "Selected website work", ar: "أعمال المواقع المختارة" },
    icon: Monitor,
  },
  {
    key: "projects",
    label: { en: "Projects", ar: "المشاريع" },
    description: { en: "Published work", ar: "أعمالك المنشورة" },
    icon: FolderKanban,
  },
  {
    key: "skills",
    label: { en: "Skills", ar: "المهارات" },
    description: { en: "Technical toolkit", ar: "مهاراتك التقنية" },
    icon: ListChecks,
  },
  {
    key: "contact",
    label: { en: "Contact & Social", ar: "التواصل والمنصات" },
    description: { en: "Contact details and links", ar: "بيانات التواصل والروابط" },
    icon: Globe2,
  },
  {
    key: "cv",
    label: { en: "CV Generator", ar: "منشئ السيرة الذاتية" },
    description: { en: "Build an ATS-ready resume", ar: "أنشئ سيرة مناسبة لأنظمة التوظيف" },
    icon: FileText,
  },
  {
    key: "analytics",
    label: { en: "Visitor analytics", ar: "تحليلات الزوار" },
    description: { en: "Traffic and engagement", ar: "الزيارات والتفاعل" },
    icon: Activity,
  },
  {
    key: "settings",
    label: { en: "Settings", ar: "الإعدادات" },
    description: { en: "Visibility and navigation", ar: "الظهور والتنقل" },
    icon: Settings,
  },
];

const defaultSocialLinks = (): SocialLink[] => [
  {
    id: "github",
    name: { en: "GitHub", ar: "GitHub" },
    url: "https://github.com/aliakashi101-tech",
    icon: "github",
  },
  {
    id: "linkedin",
    name: { en: "LinkedIn", ar: "LinkedIn" },
    url: "https://www.linkedin.com/in/ali-akashi-5460a9352/",
    icon: "linkedin",
  },
  {
    id: "email",
    name: { en: "Email", ar: "البريد الإلكتروني" },
    url: "mailto:ali.akashi101@gmail.com",
    icon: "mail",
  },
  {
    id: "phone",
    name: { en: "Phone", ar: "الهاتف" },
    url: "tel:+971508726975",
    icon: "phone",
  },
  {
    id: "whatsapp",
    name: { en: "WhatsApp", ar: "واتساب" },
    url: "https://wa.me/971508726975",
    icon: "whatsapp",
  },
  {
    id: "telegram",
    name: { en: "Telegram", ar: "تيليجرام" },
    url: "https://t.me/+971508726975",
    icon: "telegram",
  },
];

function localized(en = "", ar = ""): LocalizedInput {
  return { en, ar };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asProficiency(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function asExperienceLevel(value: unknown, fallback = 1) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(4, Math.max(1, Math.round(parsed)));
}

function experienceLevelFromProficiency(value: unknown, fallback = 1) {
  const proficiency = asProficiency(value, fallback * 25);
  if (proficiency >= 90) return 4;
  if (proficiency >= 75) return 3;
  if (proficiency >= 50) return 2;
  return 1;
}

function readString(data: Record<string, any>, keys: string | string[]) {
  const candidates = Array.isArray(keys) ? keys : [keys];
  for (const key of candidates) {
    if (typeof data[key] === "string") return data[key];
  }
  return "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function toDateInput(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return "";
}

function formatDate(value: unknown) {
  if (!value) return "—";
  let date: Date | null = null;
  if (value instanceof Timestamp) date = value.toDate();
  else if (value instanceof Date) date = value;
  else if (typeof value === "string" || typeof value === "number") date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createProjectForm(viewOrder = "1"): ProjectForm {
  return {
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    image: "",
    photos: [],
    viewOrder,
    appStore: "",
    appStoreVisible: true,
    googlePlay: "",
    googlePlayVisible: true,
    googleDrive: "",
    googleDriveVisible: true,
    website: "",
    websiteVisible: true,
    appInstalls: "",
    collaboration: "",
    hidden: false,
    legacy: false,
  };
}

function toLocalizedDefaults(enValue: any, arValue: any): any {
  if (Array.isArray(enValue) || Array.isArray(arValue)) {
    const enArray = Array.isArray(enValue) ? enValue : [];
    const arArray = Array.isArray(arValue) ? arValue : [];
    const length = Math.max(enArray.length, arArray.length);
    return Array.from({ length }, (_, index) =>
      toLocalizedDefaults(enArray[index], arArray[index])
    );
  }

  if (isRecord(enValue) || isRecord(arValue)) {
    const keys = new Set([
      ...Object.keys(isRecord(enValue) ? enValue : {}),
      ...Object.keys(isRecord(arValue) ? arValue : {}),
    ]);
    return Object.fromEntries(
      Array.from(keys).map((key) => [
        key,
        toLocalizedDefaults(enValue?.[key], arValue?.[key]),
      ])
    );
  }

  return localized(
    enValue === undefined || enValue === null ? "" : String(enValue),
    arValue === undefined || arValue === null ? "" : String(arValue)
  );
}

function defaultSiteContent(): SiteDrafts {
  const en = translations.en as any;
  const ar = translations.ar as any;
  return {
    profile: {
      ...toLocalizedDefaults(en.hero, ar.hero),
      imageUrl: "/profile.jpg",
      imageVisible: false,
      resumeUrl:
        "https://drive.google.com/file/d/1YLKrw9ptBd9kVzUQLTof7zOql0vpCURJ/view?usp=sharing",
    },
    about: toLocalizedDefaults(en.about, ar.about),
    skills: {
      ...toLocalizedDefaults(en.skills, ar.skills),
      enabled: true,
      tracks: (toLocalizedDefaults(en.skills?.tracks, ar.skills?.tracks) ?? []).map(
        (track: any, index: number) => ({
          id: asString(track?.id, `track-${index + 1}`),
          title: track.title ?? localized(),
          description: track.description ?? localized(),
          level: track.level ?? localized(),
          experienceLevel: asExperienceLevel(track.experienceLevel, experienceLevelFromProficiency(track.proficiency)),
          proficiency: asProficiency(track.proficiency),
          skills: (track.skills ?? []).map((skill: any) =>
            isRecord(skill) && ("en" in skill || "ar" in skill)
              ? skill
              : localized(String(skill ?? ""), String(skill ?? ""))
          ),
        })
      ),
      categories: (Array.isArray(en.skills?.categories) || Array.isArray(ar.skills?.categories)
        ? toLocalizedDefaults(en.skills?.categories, ar.skills?.categories)
        : []
      ).map((category: any, index: number) => ({
        id: `category-${index + 1}`,
        title: category.title ?? localized(),
        items: (category.items ?? []).map((item: any) =>
          isRecord(item) && ("en" in item || "ar" in item)
            ? item
            : localized(String(item ?? ""), String(item ?? ""))
        ),
      })),
    },
    contact: {
      ...toLocalizedDefaults(en.contact, ar.contact),
      resumeUrl:
        "https://drive.google.com/file/d/1YLKrw9ptBd9kVzUQLTof7zOql0vpCURJ/view?usp=sharing",
      socialLinks: defaultSocialLinks(),
    },
    settings: {
      defaultLanguage: "en",
      navigation: {
        links: toLocalizedDefaults(en.navigation.links, ar.navigation.links),
      },
      sectionVisibility: {
        about: true,
        experience: true,
        products: true,
        websites: true,
        projects: true,
        skills: true,
        contact: true,
      },
    },
  };
}

function normalizeLocalized(value: unknown, fallback = localized()): LocalizedInput {
  if (isRecord(value) && ("en" in value || "ar" in value)) {
    return { en: asString(value.en, fallback.en), ar: asString(value.ar, fallback.ar) };
  }
  if (typeof value === "string") return { en: value, ar: fallback.ar };
  return fallback;
}

function normalizeLocalizedArray(value: unknown, fallback: LocalizedInput[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => normalizeLocalized(item));
}

function normalizeSiteDrafts(remote: Partial<Record<SiteContentKey, Record<string, any>>>) {
  const defaults = defaultSiteContent();
  const profile = { ...defaults.profile, ...(remote.profile ?? {}) };
  profile.greeting = normalizeLocalized(remote.profile?.greeting, defaults.profile.greeting);
  profile.description = normalizeLocalized(remote.profile?.description, defaults.profile.description);
  profile.connector = normalizeLocalized(remote.profile?.connector, defaults.profile.connector);
  profile.extra = normalizeLocalized(remote.profile?.extra, defaults.profile.extra);
  profile.primaryCta = normalizeLocalized(remote.profile?.primaryCta, defaults.profile.primaryCta);
  profile.secondaryCta = normalizeLocalized(remote.profile?.secondaryCta, defaults.profile.secondaryCta);
  profile.resumeButton = normalizeLocalized(remote.profile?.resumeButton, defaults.profile.resumeButton);
  profile.imageAlt = normalizeLocalized(remote.profile?.imageAlt, defaults.profile.imageAlt);
  profile.name = {
    first: normalizeLocalized(remote.profile?.name?.first, defaults.profile.name.first),
    last: normalizeLocalized(remote.profile?.name?.last, defaults.profile.name.last),
  };
  profile.specialties = normalizeLocalizedArray(remote.profile?.specialties, defaults.profile.specialties);
  profile.imageUrl = asString(remote.profile?.imageUrl, defaults.profile.imageUrl);
  profile.imageVisible = remote.profile?.imageVisible === true;
  profile.resumeUrl = asString(remote.profile?.resumeUrl, defaults.profile.resumeUrl);

  const about = { ...defaults.about, ...(remote.about ?? {}) };
  about.title = normalizeLocalized(remote.about?.title, defaults.about.title);
  about.highlight = normalizeLocalized(remote.about?.highlight, defaults.about.highlight);
  about.paragraphs = normalizeLocalizedArray(remote.about?.paragraphs, defaults.about.paragraphs);
  about.highlights = normalizeLocalizedArray(remote.about?.highlights, defaults.about.highlights);
  about.stats = Array.isArray(remote.about?.stats)
    ? remote.about.stats.map((stat: any, index: number) => ({
        value: normalizeLocalized(stat?.value, defaults.about.stats[index]?.value ?? localized()),
        label: normalizeLocalized(stat?.label, defaults.about.stats[index]?.label ?? localized()),
      }))
    : defaults.about.stats;

  const skillsRemote = remote.skills ?? {};
  const skills = {
    ...defaults.skills,
    ...skillsRemote,
    title: {
      primary: normalizeLocalized(skillsRemote.title?.primary, defaults.skills.title.primary),
      accent: normalizeLocalized(skillsRemote.title?.accent, defaults.skills.title.accent),
    },
    subtitle: normalizeLocalized(skillsRemote.subtitle, defaults.skills.subtitle),
    enabled: skillsRemote.enabled !== false,
    tracks: Array.isArray(skillsRemote.tracks)
      ? skillsRemote.tracks.map((track: any, index: number) => {
          const fallback = defaults.skills.tracks[index] ?? {
            id: `track-${index + 1}`,
            title: localized(),
            description: localized(),
            level: localized(),
            experienceLevel: 1,
            proficiency: 0,
            skills: [],
          };
          return {
            id: asString(track?.id, fallback.id),
            title: normalizeLocalized(track?.title, fallback.title),
            description: normalizeLocalized(track?.description, fallback.description),
            level: normalizeLocalized(track?.level, fallback.level),
            experienceLevel: asExperienceLevel(track?.experienceLevel, experienceLevelFromProficiency(track?.proficiency, fallback.experienceLevel)),
            proficiency: asProficiency(track?.proficiency, fallback.proficiency),
            skills: normalizeLocalizedArray(track?.skills, fallback.skills),
          };
        })
      : defaults.skills.tracks,
    categories: Array.isArray(skillsRemote.categories)
      ? skillsRemote.categories.map((category: any, index: number) => ({
          id: asString(category?.id, `category-${index + 1}`),
          title: normalizeLocalized(category?.title, localized()),
          items: normalizeLocalizedArray(category?.items),
        }))
      : defaults.skills.categories,
  };

  const contactRemote = remote.contact ?? {};
  const contact = {
    ...defaults.contact,
    ...contactRemote,
    title: normalizeLocalized(contactRemote.title, defaults.contact.title),
    highlight: normalizeLocalized(contactRemote.highlight, defaults.contact.highlight),
    description: normalizeLocalized(contactRemote.description, defaults.contact.description),
    socialHeading: normalizeLocalized(contactRemote.socialHeading, defaults.contact.socialHeading),
    resumeButton: normalizeLocalized(contactRemote.resumeButton, defaults.contact.resumeButton),
    ctaTitle: normalizeLocalized(contactRemote.ctaTitle, defaults.contact.ctaTitle),
    ctaDescription: normalizeLocalized(contactRemote.ctaDescription, defaults.contact.ctaDescription),
    ctaButton: normalizeLocalized(contactRemote.ctaButton, defaults.contact.ctaButton),
    footerNote: normalizeLocalized(contactRemote.footerNote, defaults.contact.footerNote),
    resumeUrl: asString(contactRemote.resumeUrl, defaults.contact.resumeUrl),
    info: {
      emailLabel: normalizeLocalized(contactRemote.info?.emailLabel, defaults.contact.info.emailLabel),
      emailValue: normalizeLocalized(contactRemote.info?.emailValue, defaults.contact.info.emailValue),
      phoneLabel: normalizeLocalized(contactRemote.info?.phoneLabel, defaults.contact.info.phoneLabel),
      phoneValue: normalizeLocalized(contactRemote.info?.phoneValue, defaults.contact.info.phoneValue),
      locationLabel: normalizeLocalized(contactRemote.info?.locationLabel, defaults.contact.info.locationLabel),
      locationValue: normalizeLocalized(contactRemote.info?.locationValue, defaults.contact.info.locationValue),
    },
    socialLinks: Array.isArray(contactRemote.socialLinks)
      ? contactRemote.socialLinks.map((link: any, index: number) => ({
          id: asString(link?.id, `link-${index + 1}`),
          name: normalizeLocalized(link?.name, localized()),
          url: asString(link?.url),
          icon: asString(link?.icon, "link"),
        }))
      : defaults.contact.socialLinks,
  };

  const settingsRemote = remote.settings ?? {};
  const remoteNavigationLinks = Array.isArray(settingsRemote.navigation?.links)
    ? settingsRemote.navigation.links.map((link: any, index: number) => ({
        id: asString(link?.id, `nav-${index + 1}`),
        label: normalizeLocalized(link?.label, localized()),
        href: asString(link?.href, "#"),
        visible: link?.visible !== false,
      }))
    : [];
  const navigationLinks = remoteNavigationLinks.length
    ? [
        ...remoteNavigationLinks,
        ...defaults.settings.navigation.links.filter(
          (link: any) => !remoteNavigationLinks.some((item: any) => item.href === link.href)
        ),
      ]
    : defaults.settings.navigation.links;
  return {
    profile,
    about,
    skills,
    contact,
    settings: {
      ...defaults.settings,
      ...settingsRemote,
      defaultLanguage: settingsRemote.defaultLanguage === "ar" ? "ar" : "en",
      navigation: {
        links: navigationLinks,
      },
      sectionVisibility: {
        ...defaults.settings.sectionVisibility,
        ...(settingsRemote.sectionVisibility ?? {}),
      },
    },
  } as SiteDrafts;
}

function buildExperienceForm(id: string | undefined, data: Record<string, any>): ExperienceForm {
  return {
    id,
    jobTitleEn: readString(data, ["job_title_en", "jobTitleEn", "jobTitle", "role"]).trim(),
    jobTitleAr: readString(data, ["job_title_ar", "jobTitleAr"]).trim(),
    descriptionEn: readString(data, ["description_en", "description", "desc"]).trim(),
    descriptionAr: readString(data, "description_ar").trim(),
    companyEn: readString(data, ["company_en", "companyEn", "company"]).trim(),
    companyAr: readString(data, "company_ar").trim(),
    companyLink: readString(data, ["company_link", "companyLink"]).trim(),
    image: readString(data, ["image", "image_url", "imageUrl"]).trim(),
    startDate: toDateInput(data.start_date ?? data.startDate),
    endDate: toDateInput(data.end_date ?? data.endDate),
    updatedAt: data.updatedAt,
  };
}

function buildProjectForm(id: string | undefined, data: Record<string, any>): ProjectForm {
  const rawOrder = data.view_order ?? data.viewOrder;
  const rawInstalls = data.app_installs ?? data.appInstalls;
  const image = readString(data, ["image", "image_url", "imageUrl"]).trim();
  const photos = readStringArray(data.photos);
  return {
    id,
    nameEn: readString(data, ["name_en", "nameEn", "name"]).trim(),
    nameAr: readString(data, ["name_ar", "nameAr"]).trim(),
    descriptionEn: readString(data, ["description_en", "description", "short_description"]).trim(),
    descriptionAr: readString(data, "description_ar").trim(),
    image,
    photos: photos.length > 0 ? photos : image ? [image] : [],
    viewOrder: rawOrder === undefined || rawOrder === null ? "" : String(rawOrder),
    appStore: readString(data, ["app_store", "appStore"]).trim(),
    appStoreVisible: data.app_store_visible !== false,
    googlePlay: readString(data, ["google_play", "googlePlay"]).trim(),
    googlePlayVisible: data.google_play_visible !== false,
    googleDrive: readString(data, ["google_drive", "googleDrive"]).trim(),
    googleDriveVisible: data.google_drive_visible !== false,
    website: readString(data, ["website", "website_url", "websiteUrl"]).trim(),
    websiteVisible: data.website_visible !== false,
    appInstalls: rawInstalls === undefined || rawInstalls === null ? "" : String(rawInstalls),
    collaboration: isProjectCollaboration(data.collaboration)
      ? data.collaboration
      : isProjectCollaboration(data.collaboration_tag)
        ? data.collaboration_tag
        : "",
    hidden: data.hidden === true,
    legacy: data.legacy === true,
    updatedAt: data.updatedAt,
  };
}

function buildExperiencePayload(form: ExperienceForm) {
  const payload: Record<string, unknown> = {
    job_title_en: form.jobTitleEn.trim(),
    job_title_ar: form.jobTitleAr.trim(),
    description_en: form.descriptionEn.trim(),
    description_ar: form.descriptionAr.trim(),
    company_en: form.companyEn.trim(),
    company_ar: form.companyAr.trim(),
    company_link: form.companyLink.trim(),
    image: form.image.trim(),
    updatedAt: serverTimestamp(),
  };
  if (form.startDate) payload.start_date = new Date(form.startDate);
  if (form.endDate) payload.end_date = new Date(form.endDate);
  return payload;
}

function buildProjectPayload(form: ProjectForm) {
  const photos = Array.from(new Set([form.image.trim(), ...form.photos.map((photo) => photo.trim())].filter(Boolean)));
  const image = form.image.trim() || photos[0] || "";
  const payload: Record<string, unknown> = {
    name_en: form.nameEn.trim(),
    name_ar: form.nameAr.trim(),
    description_en: form.descriptionEn.trim(),
    description_ar: form.descriptionAr.trim(),
    image,
    photos,
    app_store: form.appStore.trim(),
    app_store_visible: form.appStoreVisible,
    google_play: form.googlePlay.trim(),
    google_play_visible: form.googlePlayVisible,
    google_drive: form.googleDrive.trim(),
    google_drive_visible: form.googleDriveVisible,
    website: form.website.trim(),
    website_visible: form.websiteVisible,
    collaboration: form.collaboration,
    hidden: form.hidden,
    legacy: form.legacy,
    updatedAt: serverTimestamp(),
  };
  const installs = Number.parseInt(form.appInstalls.replace(/,/g, ""), 10);
  const order = Number.parseInt(form.viewOrder, 10);
  if (Number.isFinite(installs)) payload.app_installs = installs;
  if (Number.isFinite(order)) payload.view_order = order;
  return payload;
}

function updatePath(value: any, path: string[], nextValue: unknown): any {
  if (path.length === 0) return nextValue;
  const [head, ...rest] = path;
  const clone = Array.isArray(value) ? [...value] : { ...(value ?? {}) };
  clone[head] = updatePath(clone[head], rest, nextValue);
  return clone;
}

function Button({
  children,
  variant = "secondary",
  icon: Icon,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: LucideIcon;
}) {
  const variants = {
    primary: "bg-cyan-400 text-black hover:bg-cyan-300",
    secondary: "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-cyan-400 hover:text-white",
    danger: "border border-red-500/60 bg-red-500/5 text-red-200 hover:bg-red-500/15",
    ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-white",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  onKeyDown,
  type = "text",
  placeholder,
  required,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-300">
        {label} {required && <span className="text-cyan-400">*</span>}
      </span>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
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

function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
}: {
  label: string;
  value: LocalizedInput;
  onChange: (value: LocalizedInput) => void;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-300">
        {label} {required && <span className="text-cyan-400">*</span>}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(["en", "ar"] as const).map((language) =>
          multiline ? (
            <textarea
              key={language}
              value={value[language]}
              dir={language === "ar" ? "rtl" : "ltr"}
              rows={4}
              required={required}
              placeholder={language === "en" ? "English" : "العربية"}
              aria-label={`${label} (${language.toUpperCase()})`}
              onChange={(event) => onChange({ ...value, [language]: event.target.value })}
              className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-cyan-400"
            />
          ) : (
            <input
              key={language}
              value={value[language]}
              dir={language === "ar" ? "rtl" : "ltr"}
              required={required}
              placeholder={language === "en" ? "English" : "العربية"}
              aria-label={`${label} (${language.toUpperCase()})`}
              onChange={(event) => onChange({ ...value, [language]: event.target.value })}
              className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-cyan-400"
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
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-cyan-400" : "bg-zinc-700"}`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </span>
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label, icon: Icon = FileText }: { label: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
      <Icon className="mx-auto mb-3 text-zinc-600" size={28} />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function StatusPill({ hidden, label }: { hidden: boolean; label: { active: string; hidden: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${hidden ? "bg-zinc-800 text-zinc-400" : "bg-emerald-400/10 text-emerald-300"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${hidden ? "bg-zinc-500" : "bg-emerald-400"}`} />
      {hidden ? label.hidden : label.active}
    </span>
  );
}

export function AdminPanel({ onBack, onDataChanged, userEmail, onSignOut }: AdminPanelProps) {
  const { language, direction, toggleLanguage } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = direction === "rtl";
  const text = useCallback((en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const defaults = useMemo(() => defaultSiteContent(), []);

  const activeModule = useMemo<AdminModule>(() => {
    const routeModule = location.pathname.split("/").filter(Boolean)[1] as AdminModule | undefined;
    return moduleDefinitions.some((item) => item.key === routeModule) ? routeModule! : "overview";
  }, [location.pathname]);

  const projectRoute = useMemo<{ kind: "new" | "edit"; id?: string } | null>(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments[1] !== "projects") return null;
    if (segments[2] === "new") return { kind: "new" };
    if (segments[2] && segments[3] === "edit") {
      try {
        return { kind: "edit", id: decodeURIComponent(segments[2]) };
      } catch {
        return { kind: "edit", id: segments[2] };
      }
    }
    return null;
  }, [location.pathname]);

  const [experienceRows, setExperienceRows] = useState<ExperienceForm[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectForm[]>([]);
  const [cvProfile, setCvProfile] = useState<CvProfile | null>(null);
  const [siteDrafts, setSiteDrafts] = useState<SiteDrafts>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [projectEditor, setProjectEditor] = useState<ProjectForm | null>(null);
  const [projectPhotoUrl, setProjectPhotoUrl] = useState("");
  const [orderDirty, setOrderDirty] = useState(false);
  const [activeSkillTrackIndex, setActiveSkillTrackIndex] = useState(0);
  const skillTabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const showMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 3600);
  }, []);

  const notifyChange = useCallback(() => {
    onDataChanged();
    window.dispatchEvent(new CustomEvent("admin-data-updated"));
  }, [onDataChanged]);

  const cvSource = useMemo<CvSourceData>(() => {
    const profileName = siteDrafts.profile.name ?? {};
    const firstName = profileName.first?.en ?? "";
    const lastName = profileName.last?.en ?? "";
    const contactInfo = siteDrafts.contact.info ?? {};
    const links = (siteDrafts.contact.socialLinks ?? [])
      .map((link: SocialLink) => ({
        label: link.name.en || link.name.ar || link.id,
        url: link.url,
      }))
      .filter((link) => /^https?:\/\//i.test(link.url));

    return {
      name: `${firstName} ${lastName}`.trim(),
      portfolioUrlFallback: "https://aliakashi101-tech.github.io/",
      targetTitleFallback: "Data Analyst",
      summaryFallback: [
        siteDrafts.about.paragraphs?.[0]?.en,
        siteDrafts.profile.description?.en,
      ].filter(Boolean).join(" ").trim(),
      email: contactInfo.emailValue?.en ?? "",
      phone: contactInfo.phoneValue?.en ?? "",
      location: contactInfo.locationValue?.en ?? "",
      links,
      skillGroups: siteDrafts.skills.tracks.map((track: SkillTrack) => ({
        title: track.title.en || track.title.ar || "",
        skills: track.skills.map((skill) => skill.en || skill.ar || ""),
      })),
      experiences: experienceRows.flatMap((row) => row.id ? [{
        id: row.id,
        title: row.jobTitleEn,
        company: row.companyEn,
        companyLink: row.companyLink || undefined,
        startDate: row.startDate,
        endDate: row.endDate,
        description: row.descriptionEn,
      }] : []),
      projects: projectRows.map((row) => ({
        id: row.id ?? `${row.nameEn}-${row.viewOrder}`,
        name: row.nameEn,
        description: row.descriptionEn,
        website: row.websiteVisible ? row.website || undefined : undefined,
        appStore: row.appStoreVisible ? row.appStore || undefined : undefined,
        googlePlay: row.googlePlayVisible ? row.googlePlay || undefined : undefined,
        hidden: row.hidden,
      })),
    };
  }, [experienceRows, projectRows, siteDrafts]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [experienceSnapshot, projectsSnapshot, remoteContent, remoteCvProfile] = await Promise.all([
        getDocs(experienceCollection),
        getDocs(projectsCollection),
        loadSiteContent(),
        loadCvProfile(),
      ]);
      setExperienceRows(
        experienceSnapshot.docs
          .map((snapshot) => buildExperienceForm(snapshot.id, snapshot.data()))
          .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
      );
      setProjectRows(
        projectsSnapshot.docs
          .map((snapshot) => buildProjectForm(snapshot.id, snapshot.data()))
          .sort((a, b) => {
            const orderA = Number.parseInt(a.viewOrder, 10);
            const orderB = Number.parseInt(b.viewOrder, 10);
            if (Number.isFinite(orderA) && Number.isFinite(orderB)) return orderA - orderB;
            if (Number.isFinite(orderA)) return -1;
            if (Number.isFinite(orderB)) return 1;
            return a.nameEn.localeCompare(b.nameEn);
          })
      );
      setCvProfile(remoteCvProfile);
      setSiteDrafts(normalizeSiteDrafts(remoteContent));
      setOrderDirty(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text("Unable to load dashboard data.", "تعذر تحميل بيانات لوحة التحكم."));
    } finally {
      setLoading(false);
    }
  }, [text]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setProjectPhotoUrl("");
  }, [projectRoute?.kind, projectRoute?.id]);

  useEffect(() => {
    if (!projectRoute) {
      setProjectEditor(null);
      return;
    }

    if (projectRoute.kind === "new") {
      setProjectEditor((current) => current ?? createProjectForm(String(projectRows.length + 1)));
      return;
    }

    const project = projectRows.find((row) => row.id === projectRoute.id);
    if (project) {
      setProjectEditor((current) => current?.id === project.id ? current : { ...project });
    } else if (!loading) {
      setProjectEditor(null);
    }
  }, [loading, projectRoute, projectRows]);

  const filteredExperiences = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return experienceRows;
    return experienceRows.filter((row) => `${row.jobTitleEn} ${row.jobTitleAr} ${row.companyEn} ${row.companyAr}`.toLowerCase().includes(query));
  }, [experienceRows, search]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projectRows;
    return projectRows.filter((row) => `${row.nameEn} ${row.nameAr} ${row.descriptionEn} ${row.descriptionAr}`.toLowerCase().includes(query));
  }, [projectRows, search]);

  const updateDrawer = useCallback((nextForm: ExperienceForm) => {
    setDrawer((current) => {
      if (!current) return current;
      return { type: "experience", form: nextForm };
    });
  }, []);

  const updateProjectEditor = useCallback((nextForm: ProjectForm) => {
    setProjectEditor(nextForm);
  }, []);

  const updateSiteDraft = useCallback((key: SiteContentKey, path: string[], value: unknown) => {
    setSiteDrafts((current) => ({
      ...current,
      [key]: updatePath(current[key], path, value),
    } as SiteDrafts));
  }, []);

  const validateUrl = (value: string) => {
    if (!value.trim()) return true;
    try {
      const url = value.startsWith("mailto:") || value.startsWith("tel:") ? value : new URL(value).toString();
      return Boolean(url);
    } catch {
      return false;
    }
  };

  const saveExperience = async (form: ExperienceForm) => {
    if (!form.jobTitleEn.trim() && !form.jobTitleAr.trim()) {
      setError(text("Add a job title before saving.", "أضف المسمى الوظيفي قبل الحفظ."));
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError(text("The end date must be after the start date.", "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء."));
      return;
    }
    if (!validateUrl(form.companyLink)) {
      setError(text("Enter a valid company link.", "أدخل رابط شركة صحيحاً."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildExperiencePayload(form);
      if (form.id) await setDoc(doc(firestore, "experience", form.id), payload, { merge: true });
      else await addDoc(experienceCollection, payload);
      setDrawer(null);
      showMessage(text("Experience saved.", "تم حفظ الخبرة."));
      await loadData();
      notifyChange();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text("Unable to save experience.", "تعذر حفظ الخبرة."));
    } finally {
      setSaving(false);
    }
  };

  const deleteExperience = async (form: ExperienceForm) => {
    if (!form.id || !window.confirm(text("Delete this experience entry?", "هل تريد حذف هذه الخبرة؟"))) return;
    setSaving(true);
    try {
      await deleteDoc(doc(firestore, "experience", form.id));
      setDrawer(null);
      showMessage(text("Experience deleted.", "تم حذف الخبرة."));
      await loadData();
      notifyChange();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : text("Unable to delete experience.", "تعذر حذف الخبرة."));
    } finally {
      setSaving(false);
    }
  };

  const saveProject = async (form: ProjectForm) => {
    if (!form.nameEn.trim() && !form.nameAr.trim()) {
      setError(text("Add a project name before saving.", "أضف اسم المشروع قبل الحفظ."));
      return;
    }
    if (!validateUrl(form.appStore) || !validateUrl(form.googlePlay) || !validateUrl(form.googleDrive) || !validateUrl(form.website)) {
      setError(text("Check the project links and try again.", "تحقق من روابط المشروع وحاول مرة أخرى."));
      return;
    }
    if (form.appInstalls && (!Number.isFinite(Number(form.appInstalls.replace(/,/g, ""))) || Number(form.appInstalls.replace(/,/g, "")) < 0)) {
      setError(text("Install count must be a positive number.", "يجب أن يكون عدد التثبيتات رقماً موجباً."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildProjectPayload(form);
      if (form.id) await setDoc(doc(firestore, "projects", form.id), payload, { merge: true });
      else await addDoc(projectsCollection, payload);
      setProjectEditor(null);
      navigate("/admin/projects");
      showMessage(text("Project saved.", "تم حفظ المشروع."));
      await loadData();
      notifyChange();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text("Unable to save project.", "تعذر حفظ المشروع."));
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (form: ProjectForm) => {
    if (!form.id || !window.confirm(text("Delete this project?", "هل تريد حذف هذا المشروع؟"))) return;
    setSaving(true);
    try {
      await deleteDoc(doc(firestore, "projects", form.id));
      setProjectEditor(null);
      navigate("/admin/projects");
      showMessage(text("Project deleted.", "تم حذف المشروع."));
      await loadData();
      notifyChange();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : text("Unable to delete project.", "تعذر حذف المشروع."));
    } finally {
      setSaving(false);
    }
  };

  const saveOrder = async () => {
    const validRows = projectRows.filter((row) => row.id);
    setSaving(true);
    try {
      const batch = writeBatch(firestore);
      validRows.forEach((row, index) => {
        batch.set(doc(firestore, "projects", row.id!), {
          view_order: index + 1,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
      setOrderDirty(false);
      showMessage(text("Project order saved.", "تم حفظ ترتيب المشاريع."));
      await loadData();
      notifyChange();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text("Unable to save project order.", "تعذر حفظ ترتيب المشاريع."));
    } finally {
      setSaving(false);
    }
  };

  const importStarterProjects = async () => {
    if (projectRows.length || !starterProjects.length) return;
    setSaving(true);
    setError("");
    try {
      const batch = writeBatch(firestore);
      starterProjects.forEach(({ id, ...data }) => {
        batch.set(doc(firestore, "projects", id), { ...data, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      showMessage(text("Current portfolio projects imported.", "تم استيراد المشاريع الحالية."));
      await loadData();
      notifyChange();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : text("Unable to import current projects.", "تعذر استيراد المشاريع الحالية."));
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, collectionName: string, form: ExperienceForm | ProjectForm) => {
    setUploading(true);
    setError("");
    try {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
      const imageRef = storageRef(storage, `${collectionName}/${form.id ?? "new"}/${Date.now()}-${safeName}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      if (collectionName === "projects") {
        updateProjectEditor({ ...(form as ProjectForm), image: url });
      } else {
        updateDrawer({ ...(form as ExperienceForm), image: url });
      }
      showMessage(text("Image uploaded.", "تم رفع الصورة."));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : text("Unable to upload image.", "تعذر رفع الصورة."));
    } finally {
      setUploading(false);
    }
  };

  const uploadProjectPhotos = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
        const imageRef = storageRef(storage, `projects/${projectEditor?.id ?? "new"}/${createId("photo")}-${safeName}`);
        await uploadBytes(imageRef, file);
        const url = await getDownloadURL(imageRef);
        setProjectEditor((current) => {
          if (!current) return current;
          const photos = Array.from(new Set([...current.photos, url]));
          return {
            ...current,
            photos,
            image: current.image || url,
          };
        });
      }
      showMessage(text("Project photos uploaded.", "تم رفع صور المشروع."));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : text("Unable to upload project photos.", "تعذر رفع صور المشروع."));
    } finally {
      setUploading(false);
    }
  };

  const uploadProfileImage = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size >= 10 * 1024 * 1024) {
      setError(text("Choose an image smaller than 10 MB.", "اختر صورة يقل حجمها عن 10 ميجابايت."));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
      const imageRef = storageRef(storage, `site_content/profile/${Date.now()}-${safeName}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      updateSiteDraft("profile", ["imageUrl"], url);
      updateSiteDraft("profile", ["imageVisible"], true);
      showMessage(text("Profile image uploaded.", "تم رفع صورة الملف الشخصي."));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : text("Unable to upload image.", "تعذر رفع الصورة."));
    } finally {
      setUploading(false);
    }
  };

  const saveSingleton = async (key: SiteContentKey) => {
    setSaving(true);
    setError("");
    try {
      const payload = key === "skills"
        ? {
            ...siteDrafts.skills,
            tracks: siteDrafts.skills.tracks.map((track: SkillTrack) => ({
              ...track,
              experienceLevel: asExperienceLevel(track.experienceLevel),
              proficiency: asProficiency(track.proficiency),
            })),
          }
        : siteDrafts[key];
      await saveSiteContent(key, payload);
      showMessage(text("Changes saved.", "تم حفظ التغييرات."));
      notifyChange();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text("Unable to save changes.", "تعذر حفظ التغييرات."));
    } finally {
      setSaving(false);
    }
  };

  const addExperience = () => setDrawer({ type: "experience", form: { jobTitleEn: "", jobTitleAr: "", descriptionEn: "", descriptionAr: "", companyEn: "", companyAr: "", companyLink: "", image: "", startDate: "", endDate: "" } });
  const addProject = () => {
    setProjectEditor(createProjectForm(String(projectRows.length + 1)));
    navigate("/admin/projects/new");
    setSearch("");
    setShowMobileNav(false);
  };

  const updateProjectOrder = (id: string, directionValue: -1 | 1) => {
    setProjectRows((current) => {
      const index = current.findIndex((row) => row.id === id);
      const target = index + directionValue;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((row, rowIndex) => ({ ...row, viewOrder: String(rowIndex + 1) }));
    });
    setOrderDirty(true);
  };

  const setProjectCover = (form: ProjectForm, photo: string) => {
    updateProjectEditor({
      ...form,
      image: photo,
      photos: Array.from(new Set([...form.photos, photo])),
    });
  };

  const addProjectPhotoUrl = (form: ProjectForm) => {
    const photoUrl = projectPhotoUrl.trim();
    if (!photoUrl) return;
    if (!validateUrl(photoUrl)) {
      setError(text("Enter a valid image URL.", "أدخل رابط صورة صحيحاً."));
      return;
    }

    const photos = Array.from(new Set([form.image, ...form.photos, photoUrl].filter(Boolean)));
    updateProjectEditor({
      ...form,
      photos,
      image: form.image || photoUrl,
    });
    setProjectPhotoUrl("");
    setError("");
  };

  const removeProjectPhoto = (form: ProjectForm, photo: string) => {
    const photos = form.photos.filter((item) => item !== photo);
    updateProjectEditor({
      ...form,
      photos,
      image: form.image === photo ? photos[0] ?? "" : form.image,
    });
  };

  const goTo = (module: AdminModule) => {
    navigate(module === "overview" ? "/admin" : `/admin/${module}`);
    setSearch("");
    setShowMobileNav(false);
  };

  const currentDefinition = moduleDefinitions.find((item) => item.key === activeModule) ?? moduleDefinitions[0];

  const renderOverview = () => {
    const publishedProjects = projectRows.filter((project) => !project.hidden).length;
    const recentExperience = [...experienceRows].sort((a, b) => String(b.updatedAt ?? b.startDate).localeCompare(String(a.updatedAt ?? a.startDate))).slice(0, 4);
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: text("Total projects", "إجمالي المشاريع"), value: projectRows.length, icon: FolderKanban, tone: "text-cyan-300" },
            { label: text("Published projects", "المشاريع المنشورة"), value: publishedProjects, icon: Eye, tone: "text-emerald-300" },
            { label: text("Experience entries", "سجلات الخبرة"), value: experienceRows.length, icon: BriefcaseBusiness, tone: "text-violet-300" },
            { label: text("Development tracks", "المسارات التقنية"), value: siteDrafts.skills.tracks.length, icon: ListChecks, tone: "text-amber-300" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-black/10">
              <div className="mb-5 flex items-center justify-between">
                <span className={`rounded-xl bg-zinc-950 p-2.5 ${stat.tone}`}><stat.icon size={19} /></span>
                <Activity className="text-zinc-700" size={18} />
              </div>
              <p className="text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <SectionCard title={text("Quick actions", "إجراءات سريعة")} description={text("Jump straight into the work you do most often.", "ابدأ مباشرة بالمهام الأكثر استخداماً.")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { goTo("projects"); addProject(); }} className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-start transition-colors hover:border-cyan-400/60">
                <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300"><Plus size={20} /></span>
                <span><span className="block font-medium text-white">{text("Add project", "إضافة مشروع")}</span><span className="mt-1 block text-xs text-zinc-500">{text("Create a portfolio item", "إنشاء عنصر جديد")}</span></span>
                {isRTL ? <ArrowLeft className="ms-auto text-zinc-600 transition-transform group-hover:-translate-x-1" size={17} /> : <ArrowRight className="ms-auto text-zinc-600 transition-transform group-hover:translate-x-1" size={17} />}
              </button>
              <button type="button" onClick={() => { goTo("experience"); addExperience(); }} className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-start transition-colors hover:border-cyan-400/60">
                <span className="rounded-xl bg-violet-400/10 p-3 text-violet-300"><BriefcaseBusiness size={20} /></span>
                <span><span className="block font-medium text-white">{text("Add experience", "إضافة خبرة")}</span><span className="mt-1 block text-xs text-zinc-500">{text("Add a new role", "إضافة دور وظيفي")}</span></span>
                {isRTL ? <ArrowLeft className="ms-auto text-zinc-600 transition-transform group-hover:-translate-x-1" size={17} /> : <ArrowRight className="ms-auto text-zinc-600 transition-transform group-hover:translate-x-1" size={17} />}
              </button>
            </div>
          </SectionCard>

          <SectionCard title={text("Recent experience", "أحدث الخبرات")} description={text("Your latest entries at a glance.", "أحدث السجلات المضافة.")}>
            <div className="space-y-3">
              {recentExperience.length ? recentExperience.map((row) => (
                <button key={row.id ?? row.jobTitleEn} type="button" onClick={() => { goTo("experience"); setDrawer({ type: "experience", form: { ...row } }); }} className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-start transition-colors hover:border-zinc-800 hover:bg-zinc-950/60">
                  <span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><BriefcaseBusiness size={16} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-100">{row.jobTitleEn || row.jobTitleAr || text("Untitled role", "دور بدون اسم")}</span><span className="block truncate text-xs text-zinc-500">{row.companyEn || row.companyAr || text("Company not set", "لم تحدد الشركة")}</span></span>
                  <Pencil className="text-zinc-600" size={15} />
                </button>
              )) : <EmptyState label={text("No experience entries yet.", "لا توجد خبرات بعد.")} icon={BriefcaseBusiness} />}
            </div>
          </SectionCard>
        </div>

        <SectionCard title={text("Content health", "حالة المحتوى")} description={text("Keep both languages ready before publishing.", "تأكد من جاهزية اللغتين قبل النشر.")}>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: text("Profile copy", "نص الملف الشخصي"), complete: Boolean(siteDrafts.profile.description?.en && siteDrafts.profile.description?.ar) },
              { label: text("About copy", "نص النبذة"), complete: Boolean(siteDrafts.about.paragraphs?.length) },
              { label: text("Contact details", "بيانات التواصل"), complete: Boolean(siteDrafts.contact.info?.emailValue?.en) },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                <span className={`rounded-full p-1.5 ${item.complete ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}><Check size={15} /></span>
                <span className="text-sm text-zinc-300">{item.label}</span>
                <span className="ms-auto text-xs text-zinc-600">{item.complete ? text("Ready", "جاهز") : text("Review", "مراجعة")}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderProfile = () => {
    const draft = siteDrafts.profile;
    return (
      <div className="space-y-6">
        <SectionCard title={text("Profile and hero", "الملف الشخصي والمقدمة")} description={text("Control the first impression visitors see.", "تحكم في الانطباع الأول لدى الزوار.")}>
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <LocalizedField label={text("Greeting", "التحية")} value={draft.greeting} onChange={(value) => updateSiteDraft("profile", ["greeting"], value)} />
              <LocalizedField label={text("Extra introduction", "التعريف الإضافي")} value={draft.extra} onChange={(value) => updateSiteDraft("profile", ["extra"], value)} multiline />
              <LocalizedField label={text("First name", "الاسم الأول")} value={draft.name.first} onChange={(value) => updateSiteDraft("profile", ["name", "first"], value)} required />
              <LocalizedField label={text("Last name", "اسم العائلة")} value={draft.name.last} onChange={(value) => updateSiteDraft("profile", ["name", "last"], value)} required />
            </div>
            <LocalizedField label={text("Hero description", "وصف المقدمة")} value={draft.description} onChange={(value) => updateSiteDraft("profile", ["description"], value)} multiline required />
            <div className="grid gap-5 md:grid-cols-2">
              <LocalizedField label={text("Connector", "أداة الربط")} value={draft.connector} onChange={(value) => updateSiteDraft("profile", ["connector"], value)} />
              <LocalizedField label={text("Resume button", "زر السيرة الذاتية")} value={draft.resumeButton} onChange={(value) => updateSiteDraft("profile", ["resumeButton"], value)} />
              <LocalizedField label={text("Primary CTA", "الزر الأساسي")} value={draft.primaryCta} onChange={(value) => updateSiteDraft("profile", ["primaryCta"], value)} />
              <LocalizedField label={text("Secondary CTA", "الزر الثانوي")} value={draft.secondaryCta} onChange={(value) => updateSiteDraft("profile", ["secondaryCta"], value)} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-300">{text("Specialties", "التخصصات")}</p>
                {[0, 1].map((index) => <LocalizedField key={index} label={`${text("Specialty", "تخصص")} ${index + 1}`} value={draft.specialties[index] ?? localized()} onChange={(value) => updateSiteDraft("profile", ["specialties", String(index)], value)} />)}
              </div>
              <div className="space-y-5">
                <div className="space-y-3"><p className="text-sm font-medium text-zinc-300">{text("Portrait image", "صورة الملف الشخصي")}</p><div className="flex flex-wrap gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 hover:border-cyan-400"><input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProfileImage(file); event.target.value = ""; }} /><Upload size={16} />{uploading ? text("Uploading...", "جاري الرفع...") : text("Upload image", "رفع صورة")}</label><span className="self-center text-xs text-zinc-600">{text("or paste a URL", "أو ألصق رابطاً")}</span><button type="button" disabled={!draft.imageUrl} onClick={() => { updateSiteDraft("profile", ["imageUrl"], ""); updateSiteDraft("profile", ["imageVisible"], false); }} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2.5 text-sm text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">{text("Remove image", "إزالة الصورة")}</button></div><Field label={text("Image URL", "رابط الصورة")} value={draft.imageUrl} onChange={(value) => updateSiteDraft("profile", ["imageUrl"], value)} /></div>
                <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={draft.imageVisible === true} onChange={(event) => updateSiteDraft("profile", ["imageVisible"], event.target.checked)} className="accent-cyan-400" />{text("Show portrait on public website", "إظهار الصورة الشخصية على الموقع")}</label>
                <Field label={text("Resume URL", "رابط السيرة الذاتية")} value={draft.resumeUrl} onChange={(value) => updateSiteDraft("profile", ["resumeUrl"], value)} />
                <LocalizedField label={text("Image alt text", "النص البديل للصورة")} value={draft.imageAlt} onChange={(value) => updateSiteDraft("profile", ["imageAlt"], value)} />
                {draft.imageVisible === true && draft.imageUrl && <img src={draft.imageUrl} alt="" className="h-40 w-full rounded-xl border border-zinc-800 object-cover" />}
              </div>
            </div>
          </div>
        </SectionCard>
        <div className="flex justify-end"><Button variant="primary" icon={Save} onClick={() => void saveSingleton("profile")} disabled={saving}>{text("Save profile", "حفظ الملف الشخصي")}</Button></div>
      </div>
    );
  };

  const renderAbout = () => {
    const draft = siteDrafts.about;
    return (
      <div className="space-y-6">
        <SectionCard title={text("About section", "قسم نبذة عني")} description={text("Tell visitors who you are and what you bring.", "عرّف الزوار بخبرتك وما تقدمه.")}>
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2"><LocalizedField label={text("Title", "العنوان")} value={draft.title} onChange={(value) => updateSiteDraft("about", ["title"], value)} /><LocalizedField label={text("Highlight", "الكلمة المميزة")} value={draft.highlight} onChange={(value) => updateSiteDraft("about", ["highlight"], value)} /></div>
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white">{text("Paragraphs", "الفقرات")}</h3><Button icon={Plus} onClick={() => updateSiteDraft("about", ["paragraphs"], [...(draft.paragraphs ?? []), localized()])}>{text("Add paragraph", "إضافة فقرة")}</Button></div>
            <div className="space-y-4">{(draft.paragraphs ?? []).map((paragraph: LocalizedInput, index: number) => <div key={index} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.18em] text-zinc-600">{text("Paragraph", "فقرة")} {index + 1}</span><button type="button" onClick={() => updateSiteDraft("about", ["paragraphs"], draft.paragraphs.filter((_: unknown, itemIndex: number) => itemIndex !== index))} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Remove paragraph", "حذف الفقرة")}><Trash2 size={15} /></button></div><LocalizedField label="" value={paragraph} onChange={(value) => updateSiteDraft("about", ["paragraphs", String(index)], value)} multiline /></div>)}</div>
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white">{text("Highlights", "النقاط المميزة")}</h3><Button icon={Plus} onClick={() => updateSiteDraft("about", ["highlights"], [...(draft.highlights ?? []), localized()])}>{text("Add highlight", "إضافة نقطة")}</Button></div>
            <div className="space-y-3">{(draft.highlights ?? []).map((highlight: LocalizedInput, index: number) => <div key={index} className="flex items-end gap-2"><div className="min-w-0 flex-1"><LocalizedField label={`${text("Highlight", "نقطة")} ${index + 1}`} value={highlight} onChange={(value) => updateSiteDraft("about", ["highlights", String(index)], value)} /></div><button type="button" onClick={() => updateSiteDraft("about", ["highlights"], draft.highlights.filter((_: unknown, itemIndex: number) => itemIndex !== index))} className="mb-1 rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Remove highlight", "حذف النقطة")}><Trash2 size={15} /></button></div>)}</div>
          </div>
        </SectionCard>
        <SectionCard title={text("Stats", "الإحصائيات")} description={text("The numbers shown beside your About copy.", "الأرقام الظاهرة بجانب نبذة عنك.")}>
          <div className="space-y-4">{(draft.stats ?? []).map((stat: { value: LocalizedInput; label: LocalizedInput }, index: number) => <div key={index} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.18em] text-zinc-600">{text("Stat", "إحصائية")} {index + 1}</span><button type="button" onClick={() => updateSiteDraft("about", ["stats"], draft.stats.filter((_: unknown, itemIndex: number) => itemIndex !== index))} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Remove stat", "حذف الإحصائية")}><Trash2 size={15} /></button></div><div className="grid gap-4 md:grid-cols-2"><LocalizedField label={text("Value", "القيمة")} value={stat.value} onChange={(value) => updateSiteDraft("about", ["stats", String(index), "value"], value)} /><LocalizedField label={text("Label", "التسمية")} value={stat.label} onChange={(value) => updateSiteDraft("about", ["stats", String(index), "label"], value)} /></div></div>)}<Button icon={Plus} onClick={() => updateSiteDraft("about", ["stats"], [...(draft.stats ?? []), { value: localized(), label: localized() }])}>{text("Add stat", "إضافة إحصائية")}</Button></div>
        </SectionCard>
        <div className="flex justify-end"><Button variant="primary" icon={Save} onClick={() => void saveSingleton("about")} disabled={saving}>{text("Save About", "حفظ النبذة")}</Button></div>
      </div>
    );
  };

  const renderExperience = () => (
    <CollectionLayout title={text("Experience", "الخبرات")} description={text("Create and maintain your professional timeline.", "أنشئ وحدث مسارك المهني.")} search={search} setSearch={setSearch} onRefresh={() => void loadData()} onAdd={addExperience} addLabel={text("Add experience", "إضافة خبرة")} refreshLabel={text("Refresh", "تحديث")} searchPlaceholder={text("Search roles or companies...", "ابحث عن دور أو شركة...")}>
      {filteredExperiences.length ? <div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="min-w-[760px] w-full text-start text-sm"><thead className="bg-zinc-950/80 text-xs uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-4 py-4 font-medium">{text("Role", "الدور")}</th><th className="px-4 py-4 font-medium">{text("Company", "الشركة")}</th><th className="px-4 py-4 font-medium">{text("Period", "الفترة")}</th><th className="px-4 py-4 font-medium">{text("Updated", "التحديث")}</th><th className="px-4 py-4 text-end font-medium">{text("Actions", "الإجراءات")}</th></tr></thead><tbody className="divide-y divide-zinc-800">{filteredExperiences.map((row) => <tr key={row.id} className="bg-zinc-900/40 transition-colors hover:bg-zinc-800/40"><td className="px-4 py-4"><div className="font-medium text-white">{row.jobTitleEn || row.jobTitleAr || text("Untitled role", "دور بدون اسم")}</div><div className="mt-1 text-xs text-zinc-600">{row.jobTitleAr || text("Arabic title not set", "لم تتم إضافة العربية")}</div></td><td className="px-4 py-4 text-zinc-300">{row.companyEn || row.companyAr || "—"}</td><td className="px-4 py-4 text-zinc-400">{row.startDate || row.endDate ? `${row.startDate || "…"} → ${row.endDate || text("Present", "حتى الآن")}` : "—"}</td><td className="px-4 py-4 text-zinc-500">{formatDate(row.updatedAt)}</td><td className="px-4 py-4"><div className="flex justify-end gap-2"><Button variant="ghost" icon={Pencil} onClick={() => setDrawer({ type: "experience", form: { ...row } })}>{text("Edit", "تعديل")}</Button><Button variant="danger" icon={Trash2} onClick={() => void deleteExperience(row)}>{text("Delete", "حذف")}</Button></div></td></tr>)}</tbody></table></div> : <EmptyState label={search ? text("No matching experience entries.", "لا توجد نتائج مطابقة.") : text("No experience entries yet.", "لا توجد خبرات بعد.")} icon={BriefcaseBusiness} />}
    </CollectionLayout>
  );

  const renderProjects = () => (
    <CollectionLayout title={text("Projects", "المشاريع")} description={text("Manage published work, links, order, and visibility.", "أدر أعمالك وروابطها وترتيبها وظهورها.")} search={search} setSearch={setSearch} onRefresh={() => void loadData()} onAdd={addProject} addLabel={text("Add project", "إضافة مشروع")} refreshLabel={text("Refresh", "تحديث")} searchPlaceholder={text("Search projects...", "ابحث عن مشروع...")} extraAction={<div className="flex flex-wrap gap-2">{projectRows.length === 0 && <Button variant="secondary" icon={FolderKanban} onClick={() => void importStarterProjects()} disabled={saving}>{text("Import current projects", "استيراد المشاريع الحالية")}</Button>}<Button variant="secondary" icon={ArrowUpDown} onClick={() => void saveOrder()} disabled={!orderDirty || saving}>{text("Save order", "حفظ الترتيب")}</Button></div>}>
      {filteredProjects.length ? <div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="min-w-[900px] w-full text-start text-sm"><thead className="bg-zinc-950/80 text-xs uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-4 py-4 font-medium">{text("Project", "المشروع")}</th><th className="px-4 py-4 font-medium">{text("Order", "الترتيب")}</th><th className="px-4 py-4 font-medium">{text("Installs", "التثبيتات")}</th><th className="px-4 py-4 font-medium">{text("Status", "الحالة")}</th><th className="px-4 py-4 text-end font-medium">{text("Actions", "الإجراءات")}</th></tr></thead><tbody className="divide-y divide-zinc-800">{filteredProjects.map((row, index) => <tr key={row.id ?? `${row.nameEn}-${index}`} className="bg-zinc-900/40 transition-colors hover:bg-zinc-800/40"><td className="px-4 py-4"><div className="flex items-center gap-3">{row.image ? <img src={row.image} alt="" className="h-11 w-14 rounded-lg border border-zinc-800 object-cover" /> : <span className="flex h-11 w-14 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-700"><ImagePlus size={17} /></span>}<div className="min-w-0"><div className="truncate font-medium text-white">{row.nameEn || row.nameAr || text("Unnamed project", "مشروع بدون اسم")}</div><div className="truncate text-xs text-zinc-600">{row.nameAr || text("Arabic name not set", "لم تتم إضافة العربية")}</div></div></div></td><td className="px-4 py-4"><div className="flex items-center gap-1"><button type="button" onClick={() => row.id && updateProjectOrder(row.id, -1)} disabled={index === 0} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" aria-label={text("Move up", "تحريك للأعلى")}><ChevronLeft className={isRTL ? "rotate-180" : "-rotate-90"} size={15} /></button><span className="min-w-7 text-center text-zinc-300">{row.viewOrder || index + 1}</span><button type="button" onClick={() => row.id && updateProjectOrder(row.id, 1)} disabled={index === filteredProjects.length - 1} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" aria-label={text("Move down", "تحريك للأسفل")}><ChevronRight className={isRTL ? "rotate-180" : "rotate-90"} size={15} /></button></div></td><td className="px-4 py-4 text-zinc-300">{row.appInstalls ? Number(row.appInstalls).toLocaleString() : "—"}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><StatusPill hidden={row.hidden} label={{ active: text("Published", "منشور"), hidden: text("Hidden", "مخفي") }} />{row.legacy && <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">{text("Legacy", "قديم")}</span>}</div></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><Button variant="ghost" icon={Pencil} onClick={() => row.id && navigate(`/admin/projects/${encodeURIComponent(row.id)}/edit`)}>{text("Edit", "تعديل")}</Button><Button variant="danger" icon={Trash2} onClick={() => void deleteProject(row)}>{text("Delete", "حذف")}</Button></div></td></tr>)}</tbody></table></div> : <EmptyState label={search ? text("No matching projects.", "لا توجد مشاريع مطابقة.") : text("No projects yet.", "لا توجد مشاريع بعد.")} icon={FolderKanban} />}
    </CollectionLayout>
  );

  const renderSkills = () => {
    const draft = siteDrafts.skills;
    const tracks = draft.tracks ?? [];
    const selectedTrackIndex = tracks.length
      ? Math.min(activeSkillTrackIndex, tracks.length - 1)
      : 0;
    const selectedTrack = tracks[selectedTrackIndex];

    const getTrackLabel = (track: SkillTrack) =>
      track.title[language] || track.title.en || track.title.ar || text("Untitled track", "مسار بدون اسم");

    const selectTrack = (index: number, moveFocus = false) => {
      setActiveSkillTrackIndex(index);
      if (moveFocus) {
        window.requestAnimationFrame(() => skillTabRefs.current[index]?.focus());
      }
    };

    const handleTrackTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!tracks.length) return;

      let nextIndex: number | null = null;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tracks.length - 1;

      const movingForward = isRTL ? event.key === "ArrowLeft" : event.key === "ArrowRight";
      const movingBackward = isRTL ? event.key === "ArrowRight" : event.key === "ArrowLeft";
      if (movingForward) nextIndex = (index + 1) % tracks.length;
      if (movingBackward) nextIndex = (index - 1 + tracks.length) % tracks.length;

      if (nextIndex === null) return;
      event.preventDefault();
      selectTrack(nextIndex, true);
    };

    const addTrack = () => {
      const nextTracks = [
        ...tracks,
        {
          id: createId("track"),
          title: localized(),
          description: localized(),
          level: localized(),
          experienceLevel: 1,
          proficiency: 25,
          skills: [],
        },
      ];
      updateSiteDraft("skills", ["tracks"], nextTracks);
      setActiveSkillTrackIndex(nextTracks.length - 1);
    };

    const removeTrack = () => {
      const nextTracks = tracks.filter((_: SkillTrack, index: number) => index !== selectedTrackIndex);
      updateSiteDraft("skills", ["tracks"], nextTracks);
      setActiveSkillTrackIndex(Math.max(0, Math.min(selectedTrackIndex, nextTracks.length - 1)));
    };

    return (
      <div className="space-y-6">
        <SectionCard title={text("Development tracks", "مسارات التطوير")} description={text("Organize the paths, experience levels, and skills shown on your public portfolio.", "نظم مسارات وخبرات ومهارات التطوير الظاهرة في معرضك العام.")}>
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2"><LocalizedField label={text("Section title", "عنوان القسم")} value={draft.title.primary} onChange={(value) => updateSiteDraft("skills", ["title", "primary"], value)} /><LocalizedField label={text("Title highlight", "الكلمة المميزة")} value={draft.title.accent} onChange={(value) => updateSiteDraft("skills", ["title", "accent"], value)} /></div>
            <LocalizedField label={text("Subtitle", "العنوان الفرعي")} value={draft.subtitle} onChange={(value) => updateSiteDraft("skills", ["subtitle"], value)} multiline />
            <Toggle label={text("Show tracks on public portfolio", "إظهار المسارات في المعرض العام")} checked={draft.enabled !== false} onChange={(value) => updateSiteDraft("skills", ["enabled"], value)} />
          </div>
        </SectionCard>
        <SectionCard title={text("Development tracks", "مسارات التطوير")} description={text("Add tracks and edit each level and skill in both languages.", "أضف المسارات وعدل كل مستوى ومهارة باللغتين.")}>
          <div className="space-y-6">
            <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="tablist" aria-label={text("Development tracks", "مسارات التطوير")} dir={direction}>
              <div className="flex min-w-max gap-2">
                {tracks.map((track: SkillTrack, trackIndex: number) => {
                  const isActive = trackIndex === selectedTrackIndex;
                  const tabId = `admin-skills-tab-${track.id || trackIndex}`;
                  const panelId = `admin-skills-panel-${track.id || trackIndex}`;
                  return (
                    <button
                      key={tabId}
                      ref={(element) => { skillTabRefs.current[trackIndex] = element; }}
                      id={tabId}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={panelId}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => selectTrack(trackIndex)}
                      onKeyDown={(event) => handleTrackTabKeyDown(event, trackIndex)}
                      className={`flex min-w-[190px] items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors sm:min-w-[220px] ${isActive ? "border-cyan-400/60 bg-cyan-400/10 text-white" : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${isActive ? "bg-cyan-400 text-black" : "bg-black text-zinc-500"}`}>
                        {String(trackIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{getTrackLabel(track)}</span>
                        <span className="mt-1 block text-xs text-zinc-600">{track.level[language] || track.level.en || track.level.ar || text("No level", "بدون مستوى")}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTrack ? (
              <div id={`admin-skills-panel-${selectedTrack.id || selectedTrackIndex}`} role="tabpanel" aria-labelledby={`admin-skills-tab-${selectedTrack.id || selectedTrackIndex}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 sm:p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">{text("Selected track", "المسار المحدد")}</p>
                    <p className="mt-1 text-sm text-zinc-500">{getTrackLabel(selectedTrack)}</p>
                  </div>
                  <Button variant="danger" icon={Trash2} onClick={removeTrack}>{text("Delete track", "حذف المسار")}</Button>
                </div>

                <div className="space-y-5">
                  <LocalizedField label={`${text("Track", "مسار")} ${selectedTrackIndex + 1}`} value={selectedTrack.title} onChange={(value) => updateSiteDraft("skills", ["tracks", String(selectedTrackIndex), "title"], value)} />
                  <LocalizedField label={text("Description", "الوصف")} value={selectedTrack.description} onChange={(value) => updateSiteDraft("skills", ["tracks", String(selectedTrackIndex), "description"], value)} multiline />
                  <div className="grid gap-5 md:grid-cols-2">
                    <LocalizedField label={text("Experience level", "مستوى الخبرة")} value={selectedTrack.level} onChange={(value) => updateSiteDraft("skills", ["tracks", String(selectedTrackIndex), "level"], value)} />
                    <Field
                      label={text("Experience level (1–4)", "مستوى الخبرة (1–4)")}
                      value={String(selectedTrack.experienceLevel)}
                      type="number"
                      min="1"
                      max="4"
                      step="1"
                      onChange={(value) => updateSiteDraft("skills", ["tracks", String(selectedTrackIndex), "experienceLevel"], asExperienceLevel(value))}
                    />
                  </div>
                  <div dir="ltr">
                    <div className="mb-2 flex items-center justify-between text-xs font-medium">
                      <span className="uppercase tracking-[0.18em] text-zinc-500">{text("Level scale", "مقياس الخبرة")}</span>
                      <span className="text-cyan-400">{selectedTrack.experienceLevel} / 4</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1" role="progressbar" aria-label={text("Experience level", "مستوى الخبرة")} aria-valuemin={1} aria-valuemax={4} aria-valuenow={selectedTrack.experienceLevel}>
                      {Array.from({ length: 4 }, (_, levelIndex) => (
                        <span key={levelIndex} className={`h-3 rounded-sm ${levelIndex < selectedTrack.experienceLevel ? "bg-cyan-400" : "bg-zinc-800"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-zinc-200">{text("Skills", "المهارات")}</h4>
                      <Button icon={Plus} onClick={() => updateSiteDraft("skills", ["tracks", String(selectedTrackIndex), "skills"], [...selectedTrack.skills, localized()])}>{text("Add skill", "إضافة مهارة")}</Button>
                    </div>
                    {selectedTrack.skills.map((skill, skillIndex) => (
                      <div key={skillIndex} className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <LocalizedField label={`${text("Skill", "مهارة")} ${skillIndex + 1}`} value={skill} onChange={(value) => updateSiteDraft("skills", ["tracks", String(selectedTrackIndex), "skills", String(skillIndex)], value)} />
                        </div>
                        <button type="button" onClick={() => updateSiteDraft("skills", ["tracks", String(selectedTrackIndex), "skills"], selectedTrack.skills.filter((_: LocalizedInput, index: number) => index !== skillIndex))} className="mb-1 rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Delete skill", "حذف المهارة")}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState label={text("No tracks yet. Add your first track below.", "لا توجد مسارات بعد. أضف أول مسار أدناه.")} icon={ListChecks} />
            )}

            <Button icon={Plus} onClick={addTrack}>{text("Add track", "إضافة مسار")}</Button>
          </div>
        </SectionCard>
        <div className="flex justify-end"><Button variant="primary" icon={Save} onClick={() => void saveSingleton("skills")} disabled={saving}>{text("Save skills", "حفظ المهارات")}</Button></div>
      </div>
    );
  };

  const renderContact = () => {
    const draft = siteDrafts.contact;
    return (
      <div className="space-y-6">
        <SectionCard title={text("Contact content", "محتوى التواصل")} description={text("Keep your contact details and call to action current.", "حافظ على تحديث بيانات التواصل والدعوة للإجراء.")}>
          <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><LocalizedField label={text("Title", "العنوان")} value={draft.title} onChange={(value) => updateSiteDraft("contact", ["title"], value)} /><LocalizedField label={text("Highlight", "الكلمة المميزة")} value={draft.highlight} onChange={(value) => updateSiteDraft("contact", ["highlight"], value)} /></div><LocalizedField label={text("Description", "الوصف")} value={draft.description} onChange={(value) => updateSiteDraft("contact", ["description"], value)} multiline /><div className="grid gap-5 md:grid-cols-2"><LocalizedField label={text("Social heading", "عنوان المنصات") } value={draft.socialHeading} onChange={(value) => updateSiteDraft("contact", ["socialHeading"], value)} /><LocalizedField label={text("Resume button", "زر السيرة الذاتية")} value={draft.resumeButton} onChange={(value) => updateSiteDraft("contact", ["resumeButton"], value)} /><Field label={text("Resume URL", "رابط السيرة الذاتية")} value={draft.resumeUrl} onChange={(value) => updateSiteDraft("contact", ["resumeUrl"], value)} /></div></div>
        </SectionCard>
        <SectionCard title={text("Contact information", "بيانات التواصل")}><div className="grid gap-5 md:grid-cols-2"><LocalizedField label={text("Email label", "عنوان البريد")} value={draft.info.emailLabel} onChange={(value) => updateSiteDraft("contact", ["info", "emailLabel"], value)} /><LocalizedField label={text("Email", "البريد الإلكتروني")} value={draft.info.emailValue} onChange={(value) => updateSiteDraft("contact", ["info", "emailValue"], value)} /><LocalizedField label={text("Phone label", "عنوان الهاتف")} value={draft.info.phoneLabel} onChange={(value) => updateSiteDraft("contact", ["info", "phoneLabel"], value)} /><LocalizedField label={text("Phone", "الهاتف")} value={draft.info.phoneValue} onChange={(value) => updateSiteDraft("contact", ["info", "phoneValue"], value)} /><LocalizedField label={text("Location label", "عنوان الموقع")} value={draft.info.locationLabel} onChange={(value) => updateSiteDraft("contact", ["info", "locationLabel"], value)} /><LocalizedField label={text("Location", "الموقع")} value={draft.info.locationValue} onChange={(value) => updateSiteDraft("contact", ["info", "locationValue"], value)} /></div></SectionCard>
        <SectionCard title={text("Social links", "روابط المنصات")} description={text("These links appear in the hero and contact sections.", "تظهر هذه الروابط في المقدمة وقسم التواصل.")}><div className="space-y-4">{draft.socialLinks.map((link: SocialLink, index: number) => <div key={link.id} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 md:grid-cols-[1fr_1.2fr_.6fr_auto]"><LocalizedField label={text("Name", "الاسم")} value={link.name} onChange={(value) => updateSiteDraft("contact", ["socialLinks", String(index), "name"], value)} /><Field label={text("URL", "الرابط")} value={link.url} onChange={(value) => updateSiteDraft("contact", ["socialLinks", String(index), "url"], value)} /><Field label={text("Icon", "الأيقونة")} value={link.icon} onChange={(value) => updateSiteDraft("contact", ["socialLinks", String(index), "icon"], value)} /><button type="button" onClick={() => updateSiteDraft("contact", ["socialLinks"], draft.socialLinks.filter((_: SocialLink, itemIndex: number) => itemIndex !== index))} className="self-end rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Delete social link", "حذف رابط المنصة")}><Trash2 size={16} /></button></div>)}<Button icon={Plus} onClick={() => updateSiteDraft("contact", ["socialLinks"], [...draft.socialLinks, { id: createId("link"), name: localized(), url: "", icon: "link" }])}>{text("Add social link", "إضافة رابط")}</Button></div></SectionCard>
        <SectionCard title={text("Contact CTA and footer", "دعوة التواصل والتذييل")}><div className="space-y-5"><LocalizedField label={text("CTA title", "عنوان الدعوة") } value={draft.ctaTitle} onChange={(value) => updateSiteDraft("contact", ["ctaTitle"], value)} /><LocalizedField label={text("CTA description", "وصف الدعوة")} value={draft.ctaDescription} onChange={(value) => updateSiteDraft("contact", ["ctaDescription"], value)} multiline /><LocalizedField label={text("CTA button", "زر الدعوة")} value={draft.ctaButton} onChange={(value) => updateSiteDraft("contact", ["ctaButton"], value)} /><LocalizedField label={text("Footer note", "نص التذييل")} value={draft.footerNote} onChange={(value) => updateSiteDraft("contact", ["footerNote"], value)} /></div></SectionCard>
        <div className="flex justify-end"><Button variant="primary" icon={Save} onClick={() => void saveSingleton("contact")} disabled={saving}>{text("Save contact", "حفظ التواصل")}</Button></div>
      </div>
    );
  };

  const renderSettings = () => {
    const draft = siteDrafts.settings;
    const navigationLinks = draft.navigation.links ?? [];
    return (
      <div className="space-y-6">
        <SectionCard title={text("Portfolio settings", "إعدادات المعرض")} description={text("Control defaults and which sections are visible.", "تحكم في اللغة الافتراضية والأقسام الظاهرة.")}><div className="space-y-4"><label className="flex max-w-sm flex-col gap-2 text-sm font-medium text-zinc-300">{text("Default language", "اللغة الافتراضية")}<div className="relative"><select value={draft.defaultLanguage} onChange={(event) => updateSiteDraft("settings", ["defaultLanguage"], event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400"><option value="en">English</option><option value="ar">العربية</option></select><ChevronDown className="pointer-events-none absolute end-3 top-3.5 text-zinc-500" size={16} /></div></label><div className="grid gap-3 md:grid-cols-2">{Object.entries(draft.sectionVisibility).map(([key, value]) => <Toggle key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} checked={value !== false} onChange={(checked) => updateSiteDraft("settings", ["sectionVisibility", key], checked)} />)}</div></div></SectionCard>
        <SectionCard title={text("Navigation links", "روابط التنقل")} description={text("Change labels and order without touching source code.", "غيّر التسميات والترتيب دون تعديل الكود.")}><div className="space-y-4">{navigationLinks.map((link: any, index: number) => <div key={link.id ?? index} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 md:grid-cols-[1fr_.7fr_auto]"><LocalizedField label={text("Label", "التسمية")} value={link.label} onChange={(value) => updateSiteDraft("settings", ["navigation", "links", String(index), "label"], value)} /><Field label="Href" value={link.href} onChange={(value) => updateSiteDraft("settings", ["navigation", "links", String(index), "href"], value)} /><div className="flex items-end gap-2"><Toggle label={text("Visible", "ظاهر")} checked={link.visible !== false} onChange={(checked) => updateSiteDraft("settings", ["navigation", "links", String(index), "visible"], checked)} /><button type="button" onClick={() => updateSiteDraft("settings", ["navigation", "links"], navigationLinks.filter((_: any, itemIndex: number) => itemIndex !== index))} className="mb-1 rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Delete navigation link", "حذف رابط التنقل")}><Trash2 size={16} /></button></div></div>)}<Button icon={Plus} onClick={() => updateSiteDraft("settings", ["navigation", "links"], [...navigationLinks, { id: createId("nav"), label: localized(), href: "#", visible: true }])}>{text("Add navigation link", "إضافة رابط تنقل")}</Button></div></SectionCard>
        <div className="flex justify-end"><Button variant="primary" icon={Save} onClick={() => void saveSingleton("settings")} disabled={saving}>{text("Save settings", "حفظ الإعدادات")}</Button></div>
      </div>
    );
  };

  const renderModule = () => {
    if (loading) return <div className="grid gap-4 sm:grid-cols-2"><div className="h-36 animate-pulse rounded-2xl bg-zinc-900" /><div className="h-36 animate-pulse rounded-2xl bg-zinc-900" /><div className="h-56 animate-pulse rounded-2xl bg-zinc-900 sm:col-span-2" /></div>;
    switch (activeModule) {
      case "profile": return renderProfile();
      case "about": return renderAbout();
      case "experience": return renderExperience();
      case "products": return <ProductsAdmin onDataChanged={notifyChange} />;
      case "websites": return <WebsitesAdmin onDataChanged={notifyChange} />;
      case "projects":
        return projectRoute
          ? projectEditor
            ? renderProjectEditor(projectEditor)
            : <EmptyState label={text("Project could not be found.", "تعذر العثور على المشروع.")} icon={FolderKanban} />
          : renderProjects();
      case "skills": return renderSkills();
      case "contact": return renderContact();
      case "cv": return <CvBuilder source={cvSource} initialProfile={cvProfile} onSaved={(nextProfile) => setCvProfile(nextProfile)} />;
      case "analytics": return <VisitorAnalytics />;
      case "settings": return renderSettings();
      default: return renderOverview();
    }
  };

  const renderProjectEditor = (projectForm: ProjectForm) => {
    const photos = Array.from(new Set([projectForm.image, ...projectForm.photos].filter(Boolean)));
    const updateProjectField = (field: string, value: string | boolean) =>
      updateProjectEditor({ ...projectForm, [field]: value });

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">{text("Project", "المشروع")}</p>
              <h2 className="mt-1 text-xl font-semibold text-white">{projectForm.id ? text("Edit project", "تعديل المشروع") : text("New project", "مشروع جديد")}</h2>
              {projectForm.id && <p className="mt-1 text-xs text-zinc-600">ID: {projectForm.id}</p>}
            </div>
            <button type="button" onClick={() => navigate("/admin/projects")} className="rounded-xl border border-zinc-800 p-2.5 text-zinc-400 hover:border-cyan-400 hover:text-white" aria-label={text("Back to projects", "العودة إلى المشاريع")}><ArrowLeft className={isRTL ? "rotate-180" : ""} size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={text("Project name (EN)", "اسم المشروع (EN)")} value={projectForm.nameEn} onChange={(value) => updateProjectField("nameEn", value)} required />
                <Field label={text("Project name (AR)", "اسم المشروع (AR)")} value={projectForm.nameAr} onChange={(value) => updateProjectField("nameAr", value)} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={text("View order", "ترتيب العرض")} type="number" min="1" value={projectForm.viewOrder} onChange={(value) => updateProjectField("viewOrder", value)} />
                <Field label={text("App installs", "عدد التثبيتات")} value={projectForm.appInstalls} onChange={(value) => updateProjectField("appInstalls", value)} placeholder="e.g. 25,000" />
              </div>
              <label className="flex min-w-0 flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-300">{text("Collaboration tag", "وسم التعاون")}</span>
                <div className="relative">
                  <select
                    value={projectForm.collaboration}
                    onChange={(event) => updateProjectField("collaboration", event.target.value as ProjectCollaboration | "")}
                    className="min-h-11 w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pe-10 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">{text("No collaboration tag", "بدون وسم تعاون")}</option>
                    {PROJECT_COLLABORATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label[language]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-3.5 text-zinc-500" size={16} />
                </div>
                {projectForm.collaboration && (
                  <span className="text-xs leading-5 text-zinc-500">
                    {PROJECT_COLLABORATION_OPTIONS.find((option) => option.value === projectForm.collaboration)?.description[language]}
                  </span>
                )}
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                <TextArea label={text("Description (EN)", "الوصف (EN)")} value={projectForm.descriptionEn} onChange={(value) => updateProjectField("descriptionEn", value)} />
                <TextArea label={text("Description (AR)", "الوصف (AR)")} value={projectForm.descriptionAr} onChange={(value) => updateProjectField("descriptionAr", value)} />
              </div>

              <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" aria-labelledby="project-photos-heading">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 id="project-photos-heading" className="text-sm font-semibold text-white">{text("Project photos", "صور المشروع")}</h3>
                    <p className="mt-1 text-xs text-zinc-500">{text("Upload photos or add image URLs, then choose a cover and manage each image.", "ارفع الصور أو أضف روابطها، ثم اختر صورة الغلاف وأدر كل صورة بشكل مستقل.")}</p>
                  </div>
                  {uploading && <span className="text-xs text-cyan-300">{text("Uploading...", "جاري الرفع...")}</span>}
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 hover:border-cyan-400">
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) void uploadProjectPhotos(files); event.target.value = ""; }} />
                    <Upload size={16} />{text("Upload photos", "رفع الصور")}
                  </label>
                  <span className="self-center text-xs text-zinc-600">{text("Up to 10 MB per image", "حتى 10 ميجابايت لكل صورة")}</span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Field
                      label={text("Add photo URL", "إضافة رابط صورة")}
                      value={projectPhotoUrl}
                      onChange={setProjectPhotoUrl}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addProjectPhotoUrl(projectForm);
                        }
                      }}
                      placeholder="https://..."
                    />
                  </div>
                  <Button type="button" icon={Plus} onClick={() => addProjectPhotoUrl(projectForm)} disabled={!projectPhotoUrl.trim() || uploading}>
                    {text("Add URL", "إضافة الرابط")}
                  </Button>
                </div>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.map((photo) => (
                      <div key={photo} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                        <img src={photo} alt="" className="h-28 w-full object-cover" />
                        <div className="flex items-center justify-between gap-2 p-2">
                          <button type="button" onClick={() => setProjectCover(projectForm, photo)} className={`inline-flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2 py-1.5 text-xs transition-colors ${projectForm.image === photo ? "bg-cyan-400 text-black" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`} aria-label={projectForm.image === photo ? text("Selected cover image", "صورة الغلاف المحددة") : text("Set as cover image", "تعيين كصورة غلاف")}>
                            {projectForm.image === photo && <Check size={13} />}{projectForm.image === photo ? text("Cover", "الغلاف") : text("Set cover", "تعيين الغلاف")}
                          </button>
                          <button type="button" onClick={() => removeProjectPhoto(projectForm, photo)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Remove project photo", "حذف صورة المشروع")}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-600">{text("No project photos yet.", "لا توجد صور للمشروع بعد.")}</div>
                )}
              </section>

              <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" aria-labelledby="project-links-heading">
                <div>
                  <h3 id="project-links-heading" className="text-sm font-semibold text-white">{text("Project links", "روابط المشروع")}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{text("Each link can be shown or hidden independently on the public portfolio.", "يمكن إظهار أو إخفاء كل رابط بشكل مستقل في المعرض العام.")}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"><Field label="App Store" value={projectForm.appStore} onChange={(value) => updateProjectField("appStore", value)} placeholder="https://..." /><Toggle label={text("Show App Store link", "إظهار رابط App Store")} checked={projectForm.appStoreVisible} onChange={(value) => updateProjectField("appStoreVisible", value)} /></div>
                  <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"><Field label="Google Play" value={projectForm.googlePlay} onChange={(value) => updateProjectField("googlePlay", value)} placeholder="https://..." /><Toggle label={text("Show Google Play link", "إظهار رابط Google Play")} checked={projectForm.googlePlayVisible} onChange={(value) => updateProjectField("googlePlayVisible", value)} /></div>
                  <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"><Field label="Google Drive" value={projectForm.googleDrive} onChange={(value) => updateProjectField("googleDrive", value)} placeholder="https://..." /><Toggle label={text("Show Google Drive link", "إظهار رابط Google Drive")} checked={projectForm.googleDriveVisible} onChange={(value) => updateProjectField("googleDriveVisible", value)} /></div>
                  <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"><div className="flex items-center gap-2 text-sm font-medium text-zinc-300"><Globe2 size={16} className="text-cyan-400" />{text("Website", "الموقع الإلكتروني")}</div><Field label={text("Website link", "رابط الموقع الإلكتروني")} value={projectForm.website} onChange={(value) => updateProjectField("website", value)} placeholder="https://..." /><Toggle label={text("Show Website link", "إظهار رابط الموقع الإلكتروني")} checked={projectForm.websiteVisible} onChange={(value) => updateProjectField("websiteVisible", value)} /></div>
                </div>
              </section>

              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label={text("Hide from portfolio", "إخفاء من المعرض")} checked={projectForm.hidden} onChange={(value) => updateProjectField("hidden", value)} />
                <Toggle label={text("Legacy project", "مشروع قديم")} checked={projectForm.legacy} onChange={(value) => updateProjectField("legacy", value)} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4 sm:px-6">
            <div>{projectForm.id && <Button variant="danger" icon={Trash2} disabled={saving} onClick={() => void deleteProject(projectForm)}>{text("Delete", "حذف")}</Button>}</div>
            <div className="flex gap-2"><Button onClick={() => navigate("/admin/projects")}>{text("Cancel", "إلغاء")}</Button><Button variant="primary" icon={Save} disabled={saving || uploading} onClick={() => void saveProject(projectForm)}>{saving ? text("Saving...", "جاري الحفظ...") : text("Save changes", "حفظ التغييرات")}</Button></div>
          </div>
        </div>
      </div>
    );
  };

  const renderDrawer = () => {
    if (!drawer) return null;
    const isExperience = drawer.type === "experience";
    const form = drawer.form as ExperienceForm & ProjectForm;
    if (!isExperience) return null;
    const update = (field: string, value: string | boolean) => updateDrawer({ ...form, [field]: value } as ExperienceForm & ProjectForm);
    return (
      <div className="fixed inset-0 z-[80] flex justify-end bg-black/75 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawer(null); }}>
        <aside className={`flex h-full w-full max-w-2xl flex-col border-zinc-800 bg-zinc-950 shadow-2xl ${isRTL ? "border-s" : "border-e"}`} role="dialog" aria-modal="true" aria-label={isExperience ? text("Experience editor", "محرر الخبرة") : text("Project editor", "محرر المشروع")}>
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4 sm:px-6"><div><p className="text-xs uppercase tracking-[0.18em] text-cyan-400">{isExperience ? text("Experience", "الخبرة") : text("Project", "المشروع")}</p><h2 className="mt-1 text-xl font-semibold text-white">{form.id ? text("Edit entry", "تعديل السجل") : text("New entry", "سجل جديد")}</h2>{form.id && <p className="mt-1 text-xs text-zinc-600">ID: {form.id}</p>}</div><button type="button" onClick={() => setDrawer(null)} className="rounded-xl border border-zinc-800 p-2.5 text-zinc-400 hover:border-cyan-400 hover:text-white" aria-label={text("Close editor", "إغلاق المحرر")}><X size={18} /></button></div>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6"><div className="space-y-5">{isExperience ? <><div className="grid gap-5 md:grid-cols-2"><Field label={text("Job title (EN)", "المسمى الوظيفي (EN)")} value={(form as ExperienceForm).jobTitleEn} onChange={(value) => update("jobTitleEn", value)} required /><Field label={text("Job title (AR)", "المسمى الوظيفي (AR)")} value={(form as ExperienceForm).jobTitleAr} onChange={(value) => update("jobTitleAr", value)} /></div><div className="grid gap-5 md:grid-cols-2"><Field label={text("Company (EN)", "الشركة (EN)")} value={(form as ExperienceForm).companyEn} onChange={(value) => update("companyEn", value)} /><Field label={text("Company (AR)", "الشركة (AR)")} value={(form as ExperienceForm).companyAr} onChange={(value) => update("companyAr", value)} /></div><Field label={text("Company link", "رابط الشركة")} value={(form as ExperienceForm).companyLink} onChange={(value) => update("companyLink", value)} placeholder="https://..." /><div className="grid gap-5 md:grid-cols-2"><Field label={text("Start date", "تاريخ البدء")} type="date" value={(form as ExperienceForm).startDate} onChange={(value) => update("startDate", value)} /><Field label={text("End date", "تاريخ الانتهاء")} type="date" value={(form as ExperienceForm).endDate} onChange={(value) => update("endDate", value)} /></div><div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-zinc-300">{text("Image", "الصورة")}</p>{uploading && <span className="text-xs text-cyan-300">{text("Uploading...", "جاري الرفع...")}</span>}</div><div className="flex flex-wrap gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 hover:border-cyan-400"><input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "experience", form as ExperienceForm); event.target.value = ""; }} /><Upload size={16} />{text("Upload file", "رفع ملف")}</label><div className="min-w-[240px] flex-1"><Field label={text("Image URL", "رابط الصورة")} value={(form as ExperienceForm).image} onChange={(value) => update("image", value)} /></div></div>{(form as ExperienceForm).image && <img src={(form as ExperienceForm).image} alt="" className="h-40 w-full rounded-xl border border-zinc-800 object-cover" />}</div><div className="grid gap-5 md:grid-cols-2"><TextArea label={text("Description (EN)", "الوصف (EN)")} value={(form as ExperienceForm).descriptionEn} onChange={(value) => update("descriptionEn", value)} /><TextArea label={text("Description (AR)", "الوصف (AR)")} value={(form as ExperienceForm).descriptionAr} onChange={(value) => update("descriptionAr", value)} /></div></> : <><div className="grid gap-5 md:grid-cols-2"><Field label={text("Project name (EN)", "اسم المشروع (EN)")} value={(form as ProjectForm).nameEn} onChange={(value) => update("nameEn", value)} required /><Field label={text("Project name (AR)", "اسم المشروع (AR)")} value={(form as ProjectForm).nameAr} onChange={(value) => update("nameAr", value)} /></div><div className="grid gap-5 md:grid-cols-2"><Field label={text("View order", "ترتيب العرض")} type="number" min="1" value={(form as ProjectForm).viewOrder} onChange={(value) => update("viewOrder", value)} /><Field label={text("App installs", "عدد التثبيتات")} value={(form as ProjectForm).appInstalls} onChange={(value) => update("appInstalls", value)} placeholder="e.g. 25,000" /></div><div className="grid gap-5 md:grid-cols-2"><TextArea label={text("Description (EN)", "الوصف (EN)")} value={(form as ProjectForm).descriptionEn} onChange={(value) => update("descriptionEn", value)} /><TextArea label={text("Description (AR)", "الوصف (AR)")} value={(form as ProjectForm).descriptionAr} onChange={(value) => update("descriptionAr", value)} /></div><div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-zinc-300">{text("Image", "الصورة")}</p>{uploading && <span className="text-xs text-cyan-300">{text("Uploading...", "جاري الرفع...")}</span>}</div><div className="flex flex-wrap gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 hover:border-cyan-400"><input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "projects", form as ProjectForm); event.target.value = ""; }} /><Upload size={16} />{text("Upload file", "رفع ملف")}</label><div className="min-w-[240px] flex-1"><Field label={text("Image URL", "رابط الصورة")} value={(form as ProjectForm).image} onChange={(value) => update("image", value)} /></div></div>{(form as ProjectForm).image && <img src={(form as ProjectForm).image} alt="" className="h-40 w-full rounded-xl border border-zinc-800 object-cover" />}</div><div className="grid gap-5 md:grid-cols-3"><Field label="App Store" value={(form as ProjectForm).appStore} onChange={(value) => update("appStore", value)} /><Field label="Google Play" value={(form as ProjectForm).googlePlay} onChange={(value) => update("googlePlay", value)} /><Field label="Google Drive" value={(form as ProjectForm).googleDrive} onChange={(value) => update("googleDrive", value)} /></div><div className="grid gap-3 md:grid-cols-2"><Toggle label={text("Hide from portfolio", "إخفاء من المعرض")} checked={(form as ProjectForm).hidden} onChange={(value) => update("hidden", value)} /><Toggle label={text("Legacy project", "مشروع قديم")} checked={(form as ProjectForm).legacy} onChange={(value) => update("legacy", value)} /></div></>}</div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4 sm:px-6"><div>{form.id && <Button variant="danger" icon={Trash2} disabled={saving} onClick={() => void (isExperience ? deleteExperience(form as ExperienceForm) : deleteProject(form as ProjectForm))}>{text("Delete", "حذف")}</Button>}</div><div className="flex gap-2"><Button onClick={() => setDrawer(null)}>{text("Cancel", "إلغاء")}</Button><Button variant="primary" icon={Save} disabled={saving || uploading} onClick={() => void (isExperience ? saveExperience(form as ExperienceForm) : saveProject(form as ProjectForm))}>{saving ? text("Saving...", "جاري الحفظ...") : text("Save changes", "حفظ التغييرات")}</Button></div></div>
        </aside>
      </div>
    );
  };

  return (
    <section className="admin-reference-scope min-h-screen bg-black text-white" dir={direction} lang={language}>
      <div className="flex min-h-screen">
        {showMobileNav && <button type="button" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setShowMobileNav(false)} aria-label={text("Close menu", "إغلاق القائمة")} />}
        <aside className={`fixed inset-y-0 z-50 flex w-[280px] flex-col border-zinc-800 bg-zinc-950 transition-transform duration-200 lg:static lg:translate-x-0 ${isRTL ? "right-0 border-s" : "left-0 border-e"} ${showMobileNav ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}`}>
          <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-sm font-black text-black">AA</div><div className="min-w-0"><p className="truncate font-semibold text-white">Ali Akashi</p><p className="truncate text-xs text-zinc-500">{text("Portfolio admin", "إدارة المعرض")}</p></div><button type="button" onClick={() => setShowMobileNav(false)} className="ms-auto rounded-lg p-2 text-zinc-500 hover:text-white lg:hidden" aria-label={text("Close menu", "إغلاق القائمة")}><X size={18} /></button></div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={text("Admin navigation", "تنقل لوحة التحكم")}>
            {moduleDefinitions.map((item) => { const active = item.key === activeModule; return <button key={item.key} type="button" onClick={() => goTo(item.key)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition-colors ${active ? "bg-cyan-400 text-black" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}><item.icon size={18} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{text(item.label.en, item.label.ar)}</span><span className={`block truncate text-[11px] ${active ? "text-black/60" : "text-zinc-600 group-hover:text-zinc-500"}`}>{text(item.description.en, item.description.ar)}</span></span>{active ? <Check size={16} /> : isRTL ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}</button>; })}
          </nav>
          <div className="border-t border-zinc-800 p-4"><button type="button" onClick={onBack} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"><ArrowLeft className={isRTL ? "rotate-180" : ""} size={17} />{text("Back to portfolio", "العودة للمعرض")}</button><div className="mt-2 flex items-center gap-3 rounded-xl bg-zinc-900/70 px-3 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-cyan-300">{userEmail.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-xs text-zinc-400" title={userEmail}>{userEmail}</span><button type="button" onClick={() => void onSignOut()} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label={text("Sign out", "تسجيل الخروج")}><LogOut size={16} /></button></div></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setShowMobileNav(true)} className="rounded-xl border border-zinc-800 p-2.5 text-zinc-300 hover:border-cyan-400 hover:text-white lg:hidden" aria-label={text("Open menu", "فتح القائمة")}><Menu size={18} /></button><div className="min-w-0"><p className="text-xs uppercase tracking-[0.22em] text-cyan-400">{text("Admin workspace", "مساحة الإدارة")}</p><h1 className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl">{text(currentDefinition.label.en, currentDefinition.label.ar)}</h1></div></div><div className="flex items-center gap-2 sm:gap-3"><button type="button" onClick={toggleLanguage} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 hover:border-cyan-400 hover:text-white" aria-label={text("Switch to Arabic", "التبديل إلى الإنجليزية")}><Globe2 size={16} />{language === "en" ? "العربية" : "EN"}</button><Button variant="secondary" icon={RefreshCw} onClick={() => void loadData()} disabled={loading}>{text("Refresh", "تحديث")}</Button></div></div></header>
          <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="max-w-2xl text-sm leading-6 text-zinc-500">{text(currentDefinition.description.en, currentDefinition.description.ar)}</p></div>{activeModule !== "overview" && <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-500">{userEmail}</span>}</div>{(message || error) && <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-500/40 bg-red-500/5 text-red-200" : "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"}`} role="status">{error ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <Check size={17} className="mt-0.5 shrink-0" />}<span>{error || message}</span>{error && <button type="button" onClick={() => setError("")} className="ms-auto text-zinc-500 hover:text-white" aria-label={text("Dismiss error", "إغلاق الخطأ")}><X size={16} /></button>}</div>}{renderModule()}</main>
        </div>
      </div>
      {drawer && renderDrawer()}
    </section>
  );
}

function CollectionLayout({
  title,
  description,
  search,
  setSearch,
  onRefresh,
  onAdd,
  addLabel,
  refreshLabel,
  searchPlaceholder,
  extraAction,
  children,
}: {
  title: string;
  description: string;
  search: string;
  setSearch: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  addLabel: string;
  refreshLabel: string;
  searchPlaceholder: string;
  extraAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5"><div><h2 className="text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-zinc-500">{description}</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2"><Button variant="primary" icon={Plus} onClick={onAdd}>{addLabel}</Button>{extraAction}<Button icon={RefreshCw} onClick={onRefresh}>{refreshLabel}</Button></div><label className="relative min-w-0 sm:w-72"><Search className="absolute start-3 top-3 text-zinc-600" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 ps-10 pe-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400" /></label></div></div>
      {children}
    </div>
  );
}
