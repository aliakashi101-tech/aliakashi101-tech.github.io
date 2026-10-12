export const starterProjects = [
  {
    id: 'customer-review-sentiment-analysis',
    name_en: 'Customer Review Sentiment Analysis',
    name_ar: 'تحليل مشاعر تقييمات العملاء',
    description_en: 'Developed a deep-learning model to classify customer reviews. Used Python, TensorFlow, and NLP libraries for text preprocessing and model building. Achieved 95% accuracy, evaluated with precision, recall, and F1 score.',
    description_ar: 'طوّرت نموذج تعلّم عميق لتصنيف تقييمات العملاء. استخدمت Python وTensorFlow ومكتبات معالجة اللغة الطبيعية لتنظيف النصوص وبناء النموذج. حقق النموذج دقة 95%، وقيّمته باستخدام مقاييس الدقة والاسترجاع ودرجة F1.',
    tags_en: ['Python', 'TensorFlow', 'NLP', '95% accuracy'],
    tags_ar: ['Python', 'TensorFlow', 'معالجة اللغة الطبيعية', 'دقة 95%'],
    image: '', photos: [], view_order: 1, app_store: '', app_store_visible: true,
    google_play: '', google_play_visible: true, google_drive: '', google_drive_visible: true,
    website: '', website_visible: true, app_installs: '', collaboration_label_en: '',
    collaboration_label_ar: '', collaboration_description_en: '', collaboration_description_ar: '',
    hidden: false, legacy: false,
  },
  {
    id: 'interactive-data-visualization',
    name_en: 'Interactive Data Visualization',
    name_ar: 'تصوير تفاعلي للبيانات',
    description_en: 'Built a Tableau dashboard with dynamic charts and interactive filters to help explore complex datasets, surface trends, and communicate actionable insights.',
    description_ar: 'أنشأت لوحة معلومات باستخدام Tableau تتضمن مخططات ديناميكية وفلاتر تفاعلية لاستكشاف مجموعات البيانات المعقدة وإظهار الاتجاهات وتوضيح الرؤى القابلة للتنفيذ.',
    tags_en: ['Tableau', 'Dashboards', 'Data storytelling'],
    tags_ar: ['Tableau', 'لوحات المعلومات', 'سرد البيانات'],
    image: '', photos: [], view_order: 2, app_store: '', app_store_visible: true,
    google_play: '', google_play_visible: true, google_drive: '', google_drive_visible: true,
    website: '', website_visible: true, app_installs: '', collaboration_label_en: '',
    collaboration_label_ar: '', collaboration_description_en: '', collaboration_description_ar: '',
    hidden: false, legacy: false,
  },
];

export function localize(project, field, language) {
  return project[`${field}_${language}`] || project[`${field}_en`] || '';
}
