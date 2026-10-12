import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isFirebaseConfigured } from './firebaseApp';
import { starterProjects, localize } from './projectData';
import portfolioMarkup from './portfolio.html?raw';
import { initializeLegacyPage } from './legacyInteractions';
import './app.css';

const AdminApp = lazy(() => import('./AdminApp').then((module) => ({ default: module.AdminApp })));

function currentLanguage() {
  try { return localStorage.getItem('portfolio-language') === 'ar' ? 'ar' : 'en'; }
  catch { return 'en'; }
}

function ProjectLinks({ project, language }) {
  const links = [
    ['app_store', 'App Store'], ['google_play', 'Google Play'],
    ['google_drive', 'Google Drive'], ['website', language === 'ar' ? 'الموقع' : 'Website'],
  ].filter(([key]) => project[`${key}_visible`] !== false && project[key]);
  if (!links.length) return null;
  return <div className="firebase-project-links">{links.map(([key, label]) => <a key={key} href={project[key]} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}</div>;
}

function ProjectGallery({ project, name, language }) {
  const photos = [...new Set([project.image, ...(project.photos || [])].filter(Boolean))];
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  useEffect(() => setActive(0), [project.id]);
  useEffect(() => {
    if (!photos.length) return;
    const onKey = (event) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft') setActive((index) => (index - 1 + photos.length) % photos.length);
      if (event.key === 'ArrowRight') setActive((index) => (index + 1) % photos.length);
    };
    if (!lightboxOpen) return undefined;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, lightboxOpen, photos.length]);
  const hasImage = Boolean(photos[0]);
  return <>
    {hasImage && <button className="firebase-project-image" type="button" onClick={() => { setActive(0); setLightboxOpen(true); }} aria-label={language === 'ar' ? `عرض صور ${name}` : `View ${name} photos`}><img src={photos[0]} alt={name} loading="lazy" /></button>}
    {photos.length > 1 && <div className="firebase-project-thumbs">{photos.slice(1).map((photo, index) => <button key={photo} type="button" onClick={() => { setActive(index + 1); setLightboxOpen(true); }} aria-label={`${name} ${index + 2}`}><img src={photo} alt="" loading="lazy" /></button>)}</div>}
    {lightboxOpen && photos.length > 0 && <div className="firebase-lightbox" role="dialog" aria-modal="true" aria-label={name} onMouseDown={(event) => { if (event.target === event.currentTarget) setLightboxOpen(false); }}>
      <button className="firebase-lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label={language === 'ar' ? 'إغلاق' : 'Close'}>×</button>
      {photos.length > 1 && <button type="button" onClick={() => setActive((active - 1 + photos.length) % photos.length)} aria-label={language === 'ar' ? 'السابق' : 'Previous'}>‹</button>}
      <img src={photos[0]} alt={name} />
      {photos.length > 1 && <button type="button" onClick={() => setActive((active + 1) % photos.length)} aria-label={language === 'ar' ? 'التالي' : 'Next'}>›</button>}
    </div>}
  </>;
}

function ProjectCard({ project, index, language }) {
  const name = localize(project, 'name', language);
  const tags = localize(project, 'tags', language);
  const collaboration = localize(project, 'collaboration_label', language);
  const description = localize(project, 'description', language);
  const installs = Number(String(project.app_installs || '').replaceAll(',', ''));
  return <article className="project-card firebase-project-card">
    <div className="project-index">{language === 'ar' ? `المشروع ${String(index + 1).padStart(2, '0')}` : `PROJECT ${String(index + 1).padStart(2, '0')}`}</div>
    <ProjectGallery project={project} name={name} language={language} />
    <h3>{name || (language === 'ar' ? 'مشروع بدون اسم' : 'Untitled project')}</h3>
    {description && <p>{description}</p>}
    {tags.length > 0 && <div className="tags">{tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
    {(project.legacy || collaboration || (Number.isFinite(installs) && installs > 0)) && <div className="firebase-project-badges">
      {project.legacy && <span>{language === 'ar' ? 'مشروع سابق' : 'Legacy project'}</span>}
      {collaboration && <span title={localize(project, 'collaboration_description', language)}>{collaboration}</span>}
      {Number.isFinite(installs) && installs > 0 && <span>{installs.toLocaleString(language === 'ar' ? 'ar' : 'en')} {language === 'ar' ? 'تثبيت' : 'installs'}</span>}
    </div>}
    <ProjectLinks project={project} language={language} />
  </article>;
}

function PublicProjects() {
  const [language, setLanguage] = useState(currentLanguage);
  const [projects, setProjects] = useState(starterProjects);
  const [status, setStatus] = useState(isFirebaseConfigured ? 'loading' : 'local');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const change = (event) => setLanguage(event.detail === 'ar' ? 'ar' : 'en');
    window.addEventListener('portfolio-language-change', change);
    return () => window.removeEventListener('portfolio-language-change', change);
  }, []);
  useEffect(() => {
    if (!isFirebaseConfigured) { setProjects(starterProjects); setStatus('local'); return undefined; }
    setStatus('loading');
    let unsubscribe;
    let cancelled = false;
    void import('firebase/firestore').then(({ collection, getFirestore, onSnapshot, orderBy, query, where }) => {
      if (cancelled) return;
      const db = getFirestore();
      const projectsQuery = query(collection(db, 'projects'), where('hidden', '==', false), orderBy('view_order', 'asc'));
      unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
        const publishedProjects = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setProjects(publishedProjects.length ? publishedProjects : starterProjects);
        setStatus('ready');
      }, (error) => { console.error('Unable to load projects', error); setStatus('error'); });
    }).catch((error) => { console.error('Unable to initialize Firebase', error); setStatus('error'); });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [retry]);
  const host = document.getElementById('project-grid');
  if (!host) return null;
  if (status === 'loading') return <p className="firebase-project-state">{language === 'ar' ? 'جارٍ تحميل المشاريع…' : 'Loading projects…'}</p>;
  if (status === 'error') return <div className="firebase-project-state" role="alert"><p>{language === 'ar' ? 'تعذر تحميل المشاريع. تحقق من الاتصال وحاول مجددًا.' : 'Projects could not be loaded. Check your connection and try again.'}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>{language === 'ar' ? 'إعادة المحاولة' : 'Try again'}</button></div>;
  if (!projects.length) return <p className="firebase-project-state">{language === 'ar' ? 'ستظهر المشاريع هنا عند نشرها.' : 'Projects will appear here once published.'}</p>;
  return <>{status === 'local' && <p className="firebase-project-state firebase-config-note">{language === 'ar' ? 'أضف إعدادات Firebase لعرض المشاريع المنشورة.' : 'Add Firebase configuration to load published projects.'}</p>}{projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} language={language} />)}</>;
}

function PortfolioApp() {
  useEffect(() => {
    initializeLegacyPage();
    const projectsHost = document.getElementById('project-grid');
    if (projectsHost) createRoot(projectsHost).render(<PublicProjects />);
  }, []);
  return <div className="portfolio-content" dangerouslySetInnerHTML={{ __html: portfolioMarkup }} />;
}

createRoot(document.getElementById('app-root')).render(<PortfolioApp />);

const adminRoot = createRoot(document.getElementById('admin-root'));
function renderRoute() {
  const isAdmin = window.location.hash.replace(/^#/, '').startsWith('/admin');
  document.body.classList.toggle('admin-mode', isAdmin);
  if (isAdmin) adminRoot.render(<Suspense fallback={<main className="admin-login"><p className="admin-muted">Loading admin workspace…</p></main>}><AdminApp /></Suspense>);
  else adminRoot.render(null);
}
window.addEventListener('hashchange', renderRoute);
renderRoute();
