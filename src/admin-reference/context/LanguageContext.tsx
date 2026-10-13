import React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { deepMerge, loadSiteContent, localizeSiteContent } from '../lib/siteContent';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

export const translations = {
  en: {
    navigation: { links: [
      { label: 'About', href: '#about' }, { label: 'Experience', href: '#experience' },
      { label: 'Websites', href: '#websites' }, { label: 'Projects', href: '#projects' },
      { label: 'Skills', href: '#skills' }, { label: 'Contact', href: '#contact' },
    ], toggleLabel: 'العربية', toggleAria: 'Switch to Arabic' },
    hero: {
      greeting: 'Hi, I am', name: { first: 'Ali', last: 'Akashi' },
      description: 'I turn complex data into clear insights and useful tools, using Python, SQL, machine learning, NLP, and data visualization.',
      specialties: [], connector: 'and', extra: '',
      primaryCta: 'Explore my work', secondaryCta: 'Let’s connect', resumeButton: 'View Resume',
      imageAlt: 'Portrait of Ali Akashi',
    },
    about: {
      title: 'Curious about data.', highlight: 'Focused on outcomes.',
      paragraphs: [
        'I’m an aspiring data analyst and Ajman University graduate with hands-on experience in e-commerce operations, machine learning for NLP, and dashboard development.',
        'At Taif Tec, I worked on product management and content organization for the Dukany platform and built Python tools that translated system logs into performance metrics. I enjoy making complex information easier to act on.',
      ],
      highlights: ['UAE Golden Visa holder', 'Arabic native · English fluent', 'Bachelor of Data Analytics', 'Based in Dubai, UAE'],
      stats: [
        { value: '95%', label: 'Sentiment model accuracy' }, { value: '5 mo.', label: 'IT internship at Taif Tec' },
        { value: '2025', label: 'Data Analytics graduate' }, { value: '2', label: 'Featured web projects' },
      ],
    },
    experience: { title: { primary: 'Learning by', accent: 'building.' }, subtitle: 'Applying data and technology to real operational work.', states: {}, entries: [] },
    products: { title: { primary: 'Products', accent: '' }, subtitle: 'Products and tools I have built.', linkLabels: {}, states: {} },
    projects: { title: { primary: 'University', accent: 'projects' }, subtitle: 'Applied analytics projects completed at Ajman University.', entries: [], labels: {}, states: {}, linkLabels: {}, gallery: {}, mostDownloaded: {} },
    skills: {
      title: { primary: 'Tools for thoughtful', accent: 'analysis.' },
      subtitle: 'Technical strengths and continuing education.',
      tracks: [
        { id: 'data-analysis', title: 'Data analysis', description: 'Python, SQL, statistical modeling, data management, and log analysis.', level: 'Advanced', experienceLevel: 3, proficiency: 85, skills: ['Python', 'SQL', 'Pandas', 'Data cleaning'] },
        { id: 'machine-learning', title: 'Machine learning & NLP', description: 'Text preprocessing, deep learning, and model evaluation.', level: 'Applied', experienceLevel: 2, proficiency: 75, skills: ['TensorFlow', 'Keras', 'NLP', 'Model evaluation'] },
        { id: 'visualization', title: 'Data visualization', description: 'Clear dashboards and data storytelling.', level: 'Applied', experienceLevel: 2, proficiency: 75, skills: ['Tableau', 'Dashboards', 'Data storytelling'] },
      ], categories: [],
    },
    contact: {
      title: 'Let’s Work', highlight: 'Together',
      description: 'Interested in analytics, machine learning, or a project that could use a data-minded approach? I’d be glad to connect.',
      info: { emailLabel: 'Email', emailValue: 'ali.akashi101@gmail.com', phoneLabel: 'Phone', phoneValue: '+971 50 872 6975', locationLabel: 'Location', locationValue: 'Dubai, United Arab Emirates' },
      socialHeading: 'Connect with me', ctaTitle: 'Let’s connect', ctaDescription: 'Get in touch about analytics, machine learning, or your next project.', ctaButton: 'Email Ali', emailButton: 'Email Ali', whatsappButton: 'WhatsApp', resumeButton: 'View Resume', footerNote: 'Ali Akashi. All rights reserved.',
    },
    settings: {},
  },
  ar: {
    navigation: { links: [
      { label: 'نبذة عني', href: '#about' }, { label: 'الخبرة', href: '#experience' },
      { label: 'المواقع', href: '#websites' }, { label: 'المشاريع', href: '#projects' },
      { label: 'المهارات', href: '#skills' }, { label: 'تواصل', href: '#contact' },
    ], toggleLabel: 'English', toggleAria: 'التبديل إلى الإنجليزية' },
    hero: {
      greeting: 'مرحباً، أنا', name: { first: 'علي', last: 'عكايشي' },
      description: 'أحوّل البيانات المعقدة إلى رؤى واضحة وأدوات عملية باستخدام Python وSQL وتعلّم الآلة ومعالجة اللغة الطبيعية وتصوير البيانات.',
      specialties: [], connector: 'و', extra: '',
      primaryCta: 'استكشف أعمالي', secondaryCta: 'لنتواصل', resumeButton: 'عرض السيرة الذاتية',
      imageAlt: 'صورة علي عكايشي',
    },
    about: {
      title: 'شغوف بالبيانات.', highlight: 'أركّز على النتائج.',
      paragraphs: [
        'أنا محلل بيانات طموح وخريج جامعة عجمان، ولدي خبرة عملية في عمليات التجارة الإلكترونية وتعلّم الآلة لمعالجة اللغة الطبيعية وتطوير لوحات المعلومات.',
        'عملت في Taif Tec على إدارة المنتجات وتنظيم المحتوى لمنصة Dukany، وطوّرت أدوات Python لتحويل سجلات النظام إلى مؤشرات أداء. أستمتع بتبسيط المعلومات المعقدة وتحويلها إلى خطوات عملية.',
      ],
      highlights: ['حامل الإقامة الذهبية لدولة الإمارات', 'العربية لغتي الأم والإنجليزية بطلاقة', 'بكالوريوس تحليلات البيانات', 'أقيم في دبي، الإمارات'],
      stats: [
        { value: '95٪', label: 'دقة نموذج تحليل المشاعر' }, { value: '5 أشهر', label: 'تدريب تقنية المعلومات في Taif Tec' },
        { value: '2025', label: 'خريج تحليلات البيانات' }, { value: '2', label: 'موقعان مميزان' },
      ],
    },
    experience: { title: { primary: 'التعلّم من', accent: 'خلال التطبيق.' }, subtitle: 'توظيف البيانات والتقنية في أعمال تشغيلية واقعية.', states: {}, entries: [] },
    products: { title: { primary: 'المنتجات', accent: '' }, subtitle: 'المنتجات والأدوات التي بنيتها.', linkLabels: {}, states: {} },
    projects: { title: { primary: 'مشاريع', accent: 'جامعية' }, subtitle: 'مشاريع تطبيقية في التحليلات أنجزتها في جامعة عجمان.', entries: [], labels: {}, states: {}, linkLabels: {}, gallery: {}, mostDownloaded: {} },
    skills: {
      title: { primary: 'أدوات لتحليل', accent: 'مدروس.' },
      subtitle: 'مهاراتي التقنية ومواصلة التعلّم.',
      tracks: [
        { id: 'data-analysis', title: 'تحليل البيانات', description: 'Python وSQL والنمذجة الإحصائية وإدارة البيانات وتحليل السجلات.', level: 'متقدم', experienceLevel: 3, proficiency: 85, skills: ['Python', 'SQL', 'Pandas', 'تنظيف البيانات'] },
        { id: 'machine-learning', title: 'تعلّم الآلة ومعالجة اللغة', description: 'معالجة النصوص والتعلّم العميق وتقييم النماذج.', level: 'تطبيقي', experienceLevel: 2, proficiency: 75, skills: ['TensorFlow', 'Keras', 'معالجة اللغة', 'تقييم النماذج'] },
        { id: 'visualization', title: 'تصوير البيانات', description: 'لوحات معلومات واضحة وسرد البيانات.', level: 'تطبيقي', experienceLevel: 2, proficiency: 75, skills: ['Tableau', 'لوحات المعلومات', 'سرد البيانات'] },
      ], categories: [],
    },
    contact: {
      title: 'لنعمل', highlight: 'معاً',
      description: 'هل تهتم بتحليلات البيانات أو تعلّم الآلة أو لديك مشروع يستفيد من التفكير التحليلي؟ يسعدني التواصل معك.',
      info: { emailLabel: 'البريد الإلكتروني', emailValue: 'ali.akashi101@gmail.com', phoneLabel: 'الهاتف', phoneValue: '+971 50 872 6975', locationLabel: 'الموقع', locationValue: 'دبي، الإمارات العربية المتحدة' },
      socialHeading: 'تواصل معي', ctaTitle: 'لنتواصل', ctaDescription: 'تواصل معي حول تحليلات البيانات أو تعلّم الآلة أو مشروعك القادم.', ctaButton: 'راسل علي', emailButton: 'راسل علي', whatsappButton: 'واتساب', resumeButton: 'عرض السيرة الذاتية', footerNote: 'علي أكاشي. جميع الحقوق محفوظة.',
    },
    settings: {},
  },
} as const;

interface I18nContextValue {
  language: Language;
  direction: Direction;
  t: <T = string>(path: string) => T;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getNestedValue(obj: Record<string, any>, path: string) {
  return path.split('.').reduce((value, key) => value && typeof value === 'object' ? value[key] : undefined, obj);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(() => translations);
  const [language, setLanguageState] = useState<Language>(() => {
    try { return localStorage.getItem('portfolio-admin-language') === 'ar' ? 'ar' : 'en'; }
    catch { return 'en'; }
  });
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const remote = await loadSiteContent();
        if (!mounted) return;
        const next: any = { en: translations.en, ar: translations.ar };
        for (const [key, value] of Object.entries(remote)) {
          if (!value) continue;
          for (const lang of ['en', 'ar'] as const) {
            const localized = localizeSiteContent(value, lang) as Record<string, unknown>;
            const destination = key === 'profile' ? 'hero' : key;
            next[lang] = deepMerge(next[lang], { [destination]: localized });
          }
        }
        setContent(next);
      } catch (error) { console.warn('Unable to load editable portfolio content', error); }
    };
    const refresh = () => void hydrate();
    void hydrate();
    window.addEventListener('admin-data-updated', refresh);
    return () => { mounted = false; window.removeEventListener('admin-data-updated', refresh); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem('portfolio-admin-language', language); } catch {}
  }, [direction, language]);

  const t = useCallback(<T,>(path: string): T => (getNestedValue(content[language] as any, path) ?? path) as T, [content, language]);
  const setLanguage = useCallback((value: Language) => setLanguageState(value), []);
  const toggleLanguage = useCallback(() => setLanguageState((current) => current === 'en' ? 'ar' : 'en'), []);
  const value = useMemo(() => ({ language, direction, t, setLanguage, toggleLanguage }), [language, direction, t, setLanguage, toggleLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within a LanguageProvider');
  return context;
}
