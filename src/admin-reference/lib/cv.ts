import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseApp } from "./firebase";

export type CvEducation = {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
  details: string;
};

export type CvCertification = {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
};

export type CvLanguage = {
  id: string;
  name: string;
  proficiency: string;
};

export type CvProjectOverride = {
  bullets: string[];
  technologies: string[];
};

export type CvProfile = {
  version: 1;
  portfolioUrl: string;
  targetTitle: string;
  summary: string;
  selectedExperienceIds: string[];
  experienceBullets: Record<string, string[]>;
  selectedProjectIds: string[];
  projectOverrides: Record<string, CvProjectOverride>;
  additionalKeywords: string[];
  education: CvEducation[];
  certifications: CvCertification[];
  languages: CvLanguage[];
  achievements: string[];
  updatedAt?: unknown;
};

export type CvExperienceSource = {
  id: string;
  title: string;
  company: string;
  companyLink?: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type CvProjectSource = {
  id: string;
  name: string;
  description: string;
  website?: string;
  appStore?: string;
  googlePlay?: string;
  hidden?: boolean;
};

export type CvSkillGroupSource = {
  title: string;
  skills: string[];
};

export type CvSourceData = {
  name: string;
  portfolioUrlFallback: string;
  targetTitleFallback: string;
  summaryFallback: string;
  email: string;
  phone: string;
  location: string;
  links: Array<{ label: string; url: string }>;
  skillGroups: CvSkillGroupSource[];
  experiences: CvExperienceSource[];
  projects: CvProjectSource[];
};

export type CvDocumentExperience = CvExperienceSource & {
  bullets: string[];
};

export type CvDocumentProject = CvProjectSource & {
  bullets: string[];
  technologies: string[];
};

export type CvDocument = {
  name: string;
  targetTitle: string;
  portfolioUrl: string;
  summary: string;
  email: string;
  phone: string;
  location: string;
  links: Array<{ label: string; url: string }>;
  skillGroups: CvSkillGroupSource[];
  keywords: string[];
  experiences: CvDocumentExperience[];
  projects: CvDocumentProject[];
  education: CvEducation[];
  certifications: CvCertification[];
  languages: CvLanguage[];
  achievements: string[];
};

export type CvCheck = {
  id: string;
  label: string;
  detail: string;
  severity: "critical" | "advisory";
  passed: boolean;
};

export type CvValidation = {
  checks: CvCheck[];
  criticalIssues: CvCheck[];
  advisoryIssues: CvCheck[];
  score: number;
};

const firestore = getFirestore(firebaseApp);
const cvDocument = doc(firestore, "cv_profiles", "master");

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyCvProfile(): CvProfile {
  return {
    version: 1,
    portfolioUrl: "",
    targetTitle: "",
    summary: "",
    selectedExperienceIds: [],
    experienceBullets: {},
    selectedProjectIds: [],
    projectOverrides: {},
    additionalKeywords: [],
    education: [],
    certifications: [],
    languages: [],
    achievements: [],
  };
}

export function createDefaultCvProfile(source: CvSourceData): CvProfile {
  const profile = createEmptyCvProfile();
  profile.portfolioUrl = source.portfolioUrlFallback;
  profile.targetTitle = source.targetTitleFallback;
  profile.summary = source.summaryFallback;
  profile.selectedExperienceIds = source.experiences.map((experience) => experience.id);
  profile.experienceBullets = Object.fromEntries(
    source.experiences.map((experience) => [
      experience.id,
      experience.description ? [experience.description] : [],
    ])
  );
  profile.selectedProjectIds = source.projects
    .filter((project) => !project.hidden)
    .slice(0, 4)
    .map((project) => project.id);
  profile.projectOverrides = Object.fromEntries(
    source.projects.map((project) => [
      project.id,
      {
        bullets: project.description ? [project.description] : [],
        technologies: [],
      },
    ])
  );
  return profile;
}

function normalizeEducation(value: unknown): CvEducation[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      id: asString(record.id) || createId("education"),
      institution: asString(record.institution),
      degree: asString(record.degree),
      field: asString(record.field),
      location: asString(record.location),
      startDate: asString(record.startDate),
      endDate: asString(record.endDate),
      gpa: asString(record.gpa),
      details: asString(record.details),
    };
  });
}

function normalizeCertifications(value: unknown): CvCertification[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      id: asString(record.id) || createId("certification"),
      name: asString(record.name),
      issuer: asString(record.issuer),
      date: asString(record.date),
      url: asString(record.url),
    };
  });
}

function normalizeLanguages(value: unknown): CvLanguage[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      id: asString(record.id) || createId("language"),
      name: asString(record.name),
      proficiency: asString(record.proficiency),
    };
  });
}

export function normalizeCvProfile(value: unknown, portfolioUrlFallback = ""): CvProfile {
  const record = asRecord(value);
  const bulletsRecord = asRecord(record.experienceBullets);
  const overridesRecord = asRecord(record.projectOverrides);
  const experienceBullets = Object.fromEntries(
    Object.entries(bulletsRecord).map(([id, bullets]) => [id, asStringArray(bullets)])
  );
  const projectOverrides = Object.fromEntries(
    Object.entries(overridesRecord).map(([id, override]) => {
      const item = asRecord(override);
      return [
        id,
        {
          bullets: asStringArray(item.bullets),
          technologies: asStringArray(item.technologies),
        },
      ];
    })
  );

  return {
    version: 1,
    portfolioUrl: asString(record.portfolioUrl) || portfolioUrlFallback,
    targetTitle: asString(record.targetTitle),
    summary: asString(record.summary),
    selectedExperienceIds: asStringArray(record.selectedExperienceIds),
    experienceBullets,
    selectedProjectIds: asStringArray(record.selectedProjectIds),
    projectOverrides,
    additionalKeywords: asStringArray(record.additionalKeywords),
    education: normalizeEducation(record.education),
    certifications: normalizeCertifications(record.certifications),
    languages: normalizeLanguages(record.languages),
    achievements: asStringArray(record.achievements),
    updatedAt: record.updatedAt,
  };
}

export async function loadCvProfile() {
  const snapshot = await getDoc(cvDocument);
  return snapshot.exists() ? normalizeCvProfile(snapshot.data()) : null;
}

export async function saveCvProfile(profile: CvProfile) {
  await setDoc(
    cvDocument,
    {
      ...profile,
      version: 1,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildCvDocument(profile: CvProfile, source: CvSourceData): CvDocument {
  const experienceMap = new Map(source.experiences.map((item) => [item.id, item]));
  const projectMap = new Map(source.projects.map((item) => [item.id, item]));
  const selectedExperienceIds = profile.selectedExperienceIds;
  const selectedProjectIds = profile.selectedProjectIds;
  const experiences = selectedExperienceIds.flatMap((id) => {
    const experience = experienceMap.get(id);
    if (!experience) return [];
    return [{
      ...experience,
      bullets: (profile.experienceBullets[id] ?? []).map((bullet) => bullet.trim()).filter(Boolean).slice(0, 6),
    }];
  });
  const projects = selectedProjectIds.flatMap((id) => {
    const project = projectMap.get(id);
    if (!project) return [];
    const override = profile.projectOverrides[id] ?? { bullets: [], technologies: [] };
    return [{
      ...project,
      bullets: override.bullets.map((bullet) => bullet.trim()).filter(Boolean).slice(0, 4),
      technologies: unique(override.technologies).slice(0, 12),
    }];
  });

  return {
    name: source.name,
    targetTitle: profile.targetTitle || source.targetTitleFallback,
    portfolioUrl: profile.portfolioUrl,
    summary: profile.summary,
    email: source.email,
    phone: source.phone,
    location: source.location,
    links: [
      ...source.links.filter((link) => link.url.trim()),
      ...(profile.portfolioUrl.trim()
        ? [{ label: "Portfolio", url: profile.portfolioUrl.trim() }]
        : []),
    ],
    skillGroups: source.skillGroups
      .map((group) => ({ title: group.title.trim(), skills: unique(group.skills) }))
      .filter((group) => group.title || group.skills.length),
    keywords: unique(profile.additionalKeywords),
    experiences,
    projects,
    education: profile.education.filter((item) => item.institution || item.degree || item.field),
    certifications: profile.certifications.filter((item) => item.name || item.issuer),
    languages: profile.languages.filter((item) => item.name),
    achievements: profile.achievements.filter(Boolean),
  };
}

function hasDate(value: string) {
  return Boolean(value && /^\d{4}(-\d{2})?/.test(value));
}

export function formatCvDate(value: string) {
  if (!value) return "";
  const normalized = /^\d{4}$/.test(value)
    ? `${value}-01-01`
    : /^\d{4}-\d{2}$/.test(value)
      ? `${value}-01`
      : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

export function formatCvPeriod(startDate: string, endDate: string) {
  const start = formatCvDate(startDate);
  const end = endDate ? formatCvDate(endDate) : "Present";
  if (!start && !endDate) return "Date unavailable";
  return `${start || "Date unavailable"} - ${end}`;
}

export function validateCvDocument(document: CvDocument): CvValidation {
  const checks: CvCheck[] = [
    {
      id: "name",
      label: "Full name",
      detail: "Add your full name to the profile data.",
      severity: "critical",
      passed: Boolean(document.name.trim()),
    },
    {
      id: "target-title",
      label: "Target job title",
      detail: "Use the exact title you want recruiters to match.",
      severity: "critical",
      passed: Boolean(document.targetTitle.trim()),
    },
    {
      id: "summary",
      label: "Professional summary",
      detail: "Write a concise, role-specific summary of at least 40 characters.",
      severity: "critical",
      passed: document.summary.trim().length >= 40,
    },
    {
      id: "email",
      label: "Email address",
      detail: "Add a professional email address in Contact settings.",
      severity: "critical",
      passed: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(document.email),
    },
    {
      id: "phone",
      label: "Phone number",
      detail: "Add a phone number in Contact settings.",
      severity: "critical",
      passed: document.phone.replace(/\D/g, "").length >= 7,
    },
    {
      id: "experience",
      label: "Professional experience",
      detail: "Select at least one experience entry.",
      severity: "critical",
      passed: document.experiences.length > 0,
    },
    {
      id: "experience-bullets",
      label: "Achievement bullets",
      detail: "Add at least one plain-text achievement bullet to every selected role.",
      severity: "critical",
      passed: document.experiences.length > 0 && document.experiences.every((item) => item.bullets.length > 0),
    },
    {
      id: "experience-dates",
      label: "Experience dates",
      detail: "Add year/month dates to each selected role.",
      severity: "advisory",
      passed: document.experiences.length > 0 && document.experiences.every((item) => hasDate(item.startDate)),
    },
    {
      id: "skills",
      label: "Technical skills",
      detail: "Include at least five searchable technical skills or keywords.",
      severity: "critical",
      passed: unique([
        ...document.skillGroups.flatMap((group) => group.skills),
        ...document.keywords,
      ]).length >= 5,
    },
    {
      id: "bullet-depth",
      label: "Bullet depth",
      detail: "Aim for 3–6 bullets per role so your impact is clear.",
      severity: "advisory",
      passed: document.experiences.length > 0 && document.experiences.every((item) => item.bullets.length >= 3),
    },
    {
      id: "profile-link",
      label: "Professional profile link",
      detail: "Add LinkedIn, GitHub, or portfolio URL when available.",
      severity: "advisory",
      passed: document.links.some((link) => /^https?:\/\//i.test(link.url)),
    },
  ];
  const criticalIssues = checks.filter((check) => check.severity === "critical" && !check.passed);
  const advisoryIssues = checks.filter((check) => check.severity === "advisory" && !check.passed);
  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  return { checks, criticalIssues, advisoryIssues, score };
}
