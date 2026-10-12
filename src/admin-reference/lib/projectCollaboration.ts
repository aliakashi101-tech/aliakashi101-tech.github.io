export type ProjectCollaboration =
  | "built-solo"
  | "maintained-solo"
  | "team-member";

export const PROJECT_COLLABORATION_OPTIONS: Array<{
  value: ProjectCollaboration;
  label: { en: string; ar: string };
  description: { en: string; ar: string };
}> = [
  {
    value: "built-solo",
    label: { en: "Built entirely solo", ar: "تم بناؤه بالكامل بشكل فردي" },
    description: {
      en: "I designed and built this project independently from start to finish.",
      ar: "قمت بتصميم وبناء هذا المشروع بشكل مستقل من البداية إلى النهاية.",
    },
  },
  {
    value: "maintained-solo",
    label: { en: "Maintaining solo", ar: "تتم صيانته بشكل فردي" },
    description: {
      en: "I independently maintain, improve, and support this project.",
      ar: "أقوم بشكل مستقل بصيانة هذا المشروع وتطويره ودعمه.",
    },
  },
  {
    value: "team-member",
    label: { en: "Contributing as a team member", ar: "المساهمة كعضو في فريق" },
    description: {
      en: "I contributed to this project as part of a collaborative team.",
      ar: "ساهمت في هذا المشروع كجزء من فريق عمل متعاون.",
    },
  },
];

export function isProjectCollaboration(
  value: unknown
): value is ProjectCollaboration {
  return PROJECT_COLLABORATION_OPTIONS.some((option) => option.value === value);
}

export function getProjectCollaborationOption(value: unknown) {
  return PROJECT_COLLABORATION_OPTIONS.find((option) => option.value === value);
}
