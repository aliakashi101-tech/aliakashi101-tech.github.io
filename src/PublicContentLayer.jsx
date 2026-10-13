import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

function localized(value, language, fallback = '') {
  if (typeof value === 'string') return value || fallback;
  if (!value || typeof value !== 'object') return fallback;
  return value[language] || value[language === 'en' ? 'ar' : 'en'] || fallback;
}

function setText(element, value) {
  if (element && value !== undefined && value !== null && String(value).length) element.textContent = String(value);
}

function setLabel(element, value) {
  if (!element || value === undefined || value === null || !String(value).length) return;
  const accessories = [...element.children];
  element.replaceChildren(document.createTextNode(String(value)), ...accessories);
}

function setHeading(element, first, second) {
  if (!element || !first) return;
  const span = element.querySelector('span');
  element.replaceChildren(document.createTextNode(first));
  if (span && second) {
    element.append(document.createElement('br'));
    const highlight = document.createElement('span');
    highlight.textContent = second;
    element.append(highlight);
  }
}

function updatePublicPage(content, experiences, products, websites, language) {
  const profile = content.profile || {};
  const about = content.about || {};
  const skills = content.skills || {};
  const contact = content.contact || {};
  const settings = content.settings || {};
  const websiteContent = content.websites || {};
  const profileName = profile.name || {};

  setText(document.querySelector('.hero-copy .eyebrow'), localized(profile.greeting, language));
  const heroName = document.querySelector('.hero-copy h1');
  if (heroName && (profileName.first || profileName.last)) {
    const first = localized(profileName.first, language, 'Ali');
    const last = localized(profileName.last, language, 'Akashi');
    heroName.replaceChildren(document.createTextNode(first));
    const surname = document.createElement('span');
    surname.textContent = last;
    heroName.append(document.createElement('br'), surname);
  }
  const specialties = (profile.specialties || []).map((item) => localized(item, language)).filter(Boolean);
  const introParts = [localized(profile.description, language), specialties.join(` ${localized(profile.connector, language, language === 'ar' ? 'و' : 'and')} `), localized(profile.extra, language)].filter(Boolean);
  setText(document.querySelector('.hero-description'), introParts.join(' '));
  const portraitVisible = profile.imageVisible === true && Boolean(profile.imageUrl);
  const portraitWrap = document.querySelector('.portrait-wrap');
  const mobilePortrait = document.querySelector('.hero-mobile-portrait');
  [portraitWrap, mobilePortrait].forEach((portrait) => {
    if (!portrait) return;
    const wasHidden = portrait.hidden;
    portrait.hidden = !portraitVisible;
    if (portraitVisible && wasHidden) {
      portrait.classList.remove('portrait-reveal');
      void portrait.offsetWidth;
      portrait.classList.add('portrait-reveal');
      portrait.addEventListener('animationend', () => portrait.classList.remove('portrait-reveal'), { once: true });
    }
  });
  if (portraitVisible && profile.imageUrl) document.querySelectorAll('.portrait-image img,.hero-mobile-portrait').forEach((image) => { image.src = profile.imageUrl; image.alt = localized(profile.imageAlt, language, 'Ali Akashi'); });
  const heroButtons = document.querySelectorAll('.hero-actions a');
  setLabel(heroButtons[0], localized(profile.primaryCta, language));
  setLabel(heroButtons[1], localized(profile.secondaryCta, language));
  setLabel(heroButtons[2], localized(profile.resumeButton, language));
  if (profile.resumeUrl) {
    document.querySelectorAll('a[href*="drive.google.com"]').forEach((link) => link.setAttribute('href', profile.resumeUrl));
  }

  const aboutTitle = document.querySelector('#about .about-text h2');
  setHeading(aboutTitle, localized(about.title, language), localized(about.highlight, language));
  const paragraphs = Array.isArray(about.paragraphs) ? about.paragraphs : [];
  document.querySelectorAll('#about .about-text > p').forEach((element, index) => setText(element, localized(paragraphs[index], language)));
  const highlights = Array.isArray(about.highlights) ? about.highlights : [];
  document.querySelectorAll('#about .highlight').forEach((element, index) => setText(element.querySelector('span:last-child'), localized(highlights[index], language)));
  const stats = Array.isArray(about.stats) ? about.stats : [];
  document.querySelectorAll('#about .stat').forEach((element, index) => {
    if (stats[index]) {
      setText(element.querySelector('.stat-value'), localized(stats[index].value, language));
      setText(element.querySelector('.stat-label'), localized(stats[index].label, language));
    }
  });

  const experienceSection = document.querySelector('#experience');
  const experienceHeading = experienceSection?.querySelector('.section-head h2');
  setHeading(experienceHeading, localized(content.experience?.title?.primary, language), localized(content.experience?.title?.accent, language));
  setText(experienceSection?.querySelector('.section-head > p'), localized(content.experience?.subtitle, language));
  if (experienceSection && experiences.length) {
    const timeline = experienceSection.querySelector('.timeline');
    if (timeline) {
      timeline.replaceChildren(...experiences.map((entry) => {
        const article = document.createElement('article'); article.className = 'timeline-item';
        const period = document.createElement('div'); period.className = 'timeline-date';
        const startDate = entry.startDate || entry.start_date;
        const endDate = entry.endDate || entry.end_date;
        const dateText = (value) => value?.toDate ? value.toDate().toISOString().slice(0, 7) : typeof value === 'string' ? value : '';
        const start = dateText(startDate);
        const end = dateText(endDate) || (language === 'ar' ? 'حتى الآن' : 'Present');
        period.textContent = [start, end].filter(Boolean).join(' — ');
        const title = document.createElement('h3'); title.textContent = localized(entry.jobTitleEn || entry.job_title_en ? { en: entry.jobTitleEn || entry.job_title_en, ar: entry.jobTitleAr || entry.job_title_ar } : entry.jobTitle, language);
        const company = document.createElement('div'); company.className = 'timeline-role';
        company.textContent = localized(entry.companyEn || entry.company_en ? { en: entry.companyEn || entry.company_en, ar: entry.companyAr || entry.company_ar } : entry.company, language);
        const description = document.createElement('p'); description.textContent = localized(entry.descriptionEn || entry.description_en ? { en: entry.descriptionEn || entry.description_en, ar: entry.descriptionAr || entry.description_ar } : entry.description, language);
        article.append(period, title, company, description);
        return article;
      }));
    }
  }

  const tracks = Array.isArray(skills.tracks) ? skills.tracks : [];
  if (skills.enabled !== false && tracks.length) {
    const section = document.querySelector('#skills');
    setHeading(section?.querySelector('.section-head h2'), localized(skills.title?.primary, language), localized(skills.title?.accent, language));
    setText(section?.querySelector('.section-head > p'), localized(skills.subtitle, language));
    const grid = section?.querySelector('.skills-grid');
    if (grid) grid.replaceChildren(...tracks.map((track, index) => {
      const card = document.createElement('article'); card.className = 'skill-card';
      const number = document.createElement('span'); number.className = 'skill-number'; number.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('h3'); title.textContent = localized(track.title, language);
      const description = document.createElement('p'); description.textContent = localized(track.description, language);
      const list = document.createElement('p'); list.className = 'skill-items';
      list.textContent = (track.skills || []).map((skill) => localized(skill, language)).filter(Boolean).join(' · ');
      card.append(number, title, description, list);
      return card;
    }));
  }

  const contactSection = document.querySelector('#contact');
  setHeading(contactSection?.querySelector('.contact-inner h2'), localized(contact.title, language), localized(contact.highlight, language));
  setText(contactSection?.querySelector('.contact-inner > div:first-child > p'), localized(contact.description, language));
  const phoneAnchor = contactSection?.querySelector('a[href^="tel:"]');
  const phoneValue = contact.info?.phoneValue;
  if (phoneAnchor && phoneValue) {
    const phone = localized(phoneValue, language);
    phoneAnchor.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
    phoneAnchor.textContent = phone;
  }
  const emailAnchor = contactSection?.querySelector('a[href^="mailto:"]');
  if (emailAnchor && contact.info?.emailValue) emailAnchor.href = `mailto:${localized(contact.info.emailValue, language)}`;
  const socialIcons = { email: 'mailto:', phone: 'tel:', whatsapp: 'wa.me', telegram: 't.me', linkedin: 'linkedin.com', github: 'github.com' };
  (contact.socialLinks || []).forEach((item) => {
    const matcher = socialIcons[item.icon] || item.icon;
    const anchor = [...(contactSection?.querySelectorAll('.contact-actions a') || [])].find((link) => link.href.includes(matcher));
    if (anchor) { anchor.href = item.url; const label = localized(item.name, language); if (label) anchor.textContent = `${label} ↗`; }
  });

  const visibility = settings.sectionVisibility || {};
  const websiteSection = document.getElementById('websites');
  setText(websiteSection?.querySelector('.section-kicker'), localized(websiteContent.kicker, language, language === 'ar' ? 'مواقع عمل مختارة' : 'Selected website work'));
  setHeading(websiteSection?.querySelector('.section-head h2'), localized(websiteContent.title?.primary, language, language === 'ar' ? 'تجارب رقمية' : 'Digital experiences'), localized(websiteContent.title?.accent, language, language === 'ar' ? 'على أرض الواقع.' : 'in the wild.'));
  setText(websiteSection?.querySelector('.section-head > p'), localized(websiteContent.subtitle, language, language === 'ar' ? 'إليك مواقع عملت عليها. افتح أيًّا منها لاستكشاف التجربة مباشرةً.' : 'A couple of websites I’ve worked on. Open each to explore the live experience.'));
  if (websites !== null && websiteSection) {
    const grid = websiteSection.querySelector('.website-grid');
    if (grid) grid.replaceChildren(...websites.map((website) => {
      const card = document.createElement('article'); card.className = 'website-card';
      const logo = document.createElement('div'); logo.className = `website-logo${website.image_theme === 'dark' ? ' billionaire-logo' : ''}`;
      if (website.image) { const image = document.createElement('img'); image.src = website.image; image.alt = localized(website.name_en ? { en: website.name_en, ar: website.name_ar } : website.name, language); image.loading = 'lazy'; logo.append(image); }
      const body = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = localized(website.name_en ? { en: website.name_en, ar: website.name_ar } : website.name, language);
      const description = document.createElement('p'); description.textContent = localized(website.description_en ? { en: website.description_en, ar: website.description_ar } : website.description, language);
      body.append(title, description);
      try {
        const destination = new URL(website.url);
        if (['http:', 'https:'].includes(destination.protocol)) {
          const anchor = document.createElement('a'); anchor.className = 'website-link'; anchor.href = destination.href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
          anchor.append(document.createTextNode(language === 'ar' ? 'زيارة الموقع ' : 'Visit website '));
          const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗'; anchor.append(arrow); body.append(anchor);
        }
      } catch { /* Ignore malformed external links in stored content. */ }
      card.append(logo, body); return card;
    }));
  }
  for (const sectionName of ['about', 'experience', 'products', 'websites', 'projects', 'skills', 'contact']) {
    const section = document.getElementById(sectionName);
    if (section && visibility[sectionName] === false) section.hidden = true;
    else if (section) section.hidden = false;
  }
  for (const link of document.querySelectorAll('.nav-links a[href^="#"]')) {
    const sectionName = link.getAttribute('href').slice(1);
    const navRecord = (settings.navigation?.links || []).find((item) => item.href === `#${sectionName}`);
    if (navRecord) setText(link, localized(navRecord.label, language));
    if (visibility[sectionName] === false) link.hidden = true;
    else link.hidden = false;
  }

  if (!products.length) {
    const existingProducts = document.getElementById('products');
    if (existingProducts) existingProducts.hidden = true;
    document.querySelector('.nav-links a[href="#products"]')?.setAttribute('hidden', '');
  }
  if (products.length) {
    let section = document.getElementById('products');
    if (!section) {
      section = document.createElement('section'); section.id = 'products'; section.className = 'section alt';
      section.innerHTML = '<div class="container reveal"><div class="section-head center"><div class="section-kicker"></div><h2></h2><p></p></div><div class="project-grid"></div></div>';
      document.querySelector('#websites')?.before(section);
      const nav = document.querySelector('.nav-links');
      if (nav && !nav.querySelector('a[href="#products"]')) {
        const link = document.createElement('a'); link.href = '#products'; link.textContent = language === 'ar' ? 'المنتجات' : 'Products'; link.dataset.analyticsTarget = 'section'; link.dataset.analyticsId = 'products'; nav.insertBefore(link, nav.querySelector('a[href="#projects"]'));
      }
    }
    setText(section.querySelector('.section-kicker'), language === 'ar' ? 'منتجات مختارة' : 'Selected products');
    setHeading(section.querySelector('.section-head h2'), language === 'ar' ? 'منتجات' : 'Products', language === 'ar' ? 'رقمية.' : 'and tools.');
    setText(section.querySelector('.section-head > p'), language === 'ar' ? 'منتجات وأدوات أنشأتها.' : 'Products and tools I have built.');
    const grid = section.querySelector('.project-grid');
    grid.replaceChildren(...products.map((product) => {
      const card = document.createElement('article'); card.className = 'project-card';
      if (product.cover_image) { const image = document.createElement('img'); image.src = product.cover_image; image.alt = localized(product.name || { en: product.name_en, ar: product.name_ar }, language); image.loading = 'lazy'; image.style.cssText = 'width:100%;max-height:210px;object-fit:cover;border-radius:10px'; card.append(image); }
      const title = document.createElement('h3'); title.textContent = localized(product.name || { en: product.name_en, ar: product.name_ar }, language);
      const summary = document.createElement('p'); summary.textContent = localized(product.description || { en: product.description_en || product.tagline_en, ar: product.description_ar || product.tagline_ar }, language);
      const tags = document.createElement('div'); tags.className = 'tags';
      (product.tech_stack || []).forEach((item) => { const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = item; tags.append(tag); });
      const links = document.createElement('div'); links.className = 'firebase-project-links';
      const productLinks = product.links || {};
      [['landing', 'Visit product'], ['dashboard', 'Open demo'], ['demoVideo', 'Watch demo']].forEach(([key, label]) => {
        const url = productLinks[key] || ({ landing: product.landing_url, dashboard: product.dashboard_url, demoVideo: product.demo_video_url }[key]);
        if (!url) return;
        try { if (!['https:', 'http:'].includes(new URL(url).protocol)) return; } catch { return; }
        const anchor = document.createElement('a'); anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.textContent = `${language === 'ar' ? 'فتح' : label} ↗`; anchor.dataset.analyticsTarget = 'product'; anchor.dataset.analyticsId = product.id; links.append(anchor);
      });
      card.dataset.analyticsTarget = 'product'; card.dataset.analyticsId = product.id;
      card.append(title, summary, tags, links);
      return card;
    }));
    section.hidden = visibility.products === false;
    const productsNav = document.querySelector('.nav-links a[href="#products"]');
    if (productsNav) { productsNav.hidden = visibility.products === false; setText(productsNav, language === 'ar' ? 'المنتجات' : 'Products'); }
  }
}

export function PublicContentLayer() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('portfolio-language') === 'ar' ? 'ar' : 'en'; }
    catch { return 'en'; }
  });
  const [content, setContent] = useState({});
  const [experiences, setExperiences] = useState([]);
  const [products, setProducts] = useState([]);
  const [websites, setWebsites] = useState(null);

  useEffect(() => {
    const update = (event) => setLanguage(event.detail === 'ar' ? 'ar' : 'en');
    window.addEventListener('portfolio-language-change', update);
    return () => window.removeEventListener('portfolio-language-change', update);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return undefined;
    const stopContent = onSnapshot(collection(db, 'site_content'), (snapshot) => {
      setContent(Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data()])));
    }, (error) => console.error('Unable to load editable portfolio content', error));
    const stopExperience = onSnapshot(collection(db, 'experience'), (snapshot) => {
      setExperiences(snapshot.docs.filter((item) => item.data().hidden !== true).map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || ''))));
    }, (error) => console.error('Unable to load editable experience', error));
    const stopProducts = onSnapshot(query(collection(db, 'products'), where('hidden', '==', false), orderBy('view_order', 'asc')), (snapshot) => {
      setProducts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (error) => console.error('Unable to load editable products', error));
    const stopWebsites = onSnapshot(query(collection(db, 'websites'), where('hidden', '==', false), orderBy('view_order', 'asc')), (snapshot) => {
      setWebsites(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (error) => console.error('Unable to load editable websites', error));
    return () => { stopContent(); stopExperience(); stopProducts(); stopWebsites(); };
  }, []);

  useEffect(() => updatePublicPage(content, experiences, products, websites, language), [content, experiences, products, websites, language]);
  return null;
}
