import { useEffect, useState } from 'react';
import { useVisitorAnalytics } from './admin-reference/lib/visitorAnalytics';

export default function PublicAnalytics() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('portfolio-language') === 'ar' ? 'ar' : 'en'; }
    catch { return 'en'; }
  });
  useEffect(() => {
    document.querySelectorAll('#nav-links a[href^="#"]').forEach((link) => {
      link.dataset.analyticsTarget = 'section';
      link.dataset.analyticsId = link.getAttribute('href')?.slice(1) || 'unknown';
    });
    document.querySelectorAll('#contact a, .nav-resume, .resume').forEach((link) => {
      const href = link.getAttribute('href') || '';
      link.dataset.analyticsTarget = /drive\.google\.com/.test(href) ? 'resume' : /mailto:|tel:|wa\.me|t\.me|linkedin\.com|github\.com/.test(href) ? 'social' : 'contact';
      link.dataset.analyticsId = href.slice(0, 120);
    });
    const updateLanguage = (event) => setLanguage(event.detail === 'ar' ? 'ar' : 'en');
    window.addEventListener('portfolio-language-change', updateLanguage);
    return () => window.removeEventListener('portfolio-language-change', updateLanguage);
  }, []);
  useVisitorAnalytics(language);
  return null;
}
