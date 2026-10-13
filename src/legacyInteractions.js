export function initializeLegacyPage() {
    const isAdminPath = /^\/admin(?:\/|$)/.test(window.location.pathname);
    const initialSection = !isAdminPath ? window.location.hash.slice(1) : '';
    if (!isAdminPath && window.location.hash && !window.location.hash.startsWith('#/')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      if (initialSection) requestAnimationFrame(() => {
        const target = document.getElementById(initialSection === 'home' ? 'topbar' : initialSection);
        target?.scrollIntoView();
      });
    }
const topbar = document.getElementById('topbar');
    const toggle = document.getElementById('menu-toggle');
    const languageToggle = document.getElementById('language-toggle');
    const navLinks = document.getElementById('nav-links');
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href^="#"]');
      if (!link || isAdminPath) return;
      const sectionId = link.getAttribute('href').slice(1);
      const target = document.getElementById(sectionId === 'home' ? 'topbar' : sectionId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    const translations = {
      'About':'نبذة عني','Experience':'الخبرة','Websites':'المواقع','Projects':'المشاريع','Skills':'المهارات','Contact':'تواصل','Resume ↗':'السيرة الذاتية ↗',
      'Hi, I am':'مرحباً، أنا',
      'I turn complex data into':'أحوّل البيانات المعقدة إلى',
      'clear insights and useful tools':'رؤى واضحة وأدوات عملية',
      ', using Python, SQL, machine learning, NLP, and data visualization.':'، باستخدام Python وSQL وتعلّم الآلة ومعالجة اللغة الطبيعية وتصوير البيانات.',
      'Explore my work':'استكشف أعمالي','Let’s connect':'لنتواصل','Download resume ↓':'تنزيل السيرة الذاتية ↓',
      'View Resume':'\u0639\u0631\u0636 \u0627\u0644\u0633\u064a\u0631\u0629 \u0627\u0644\u0630\u0627\u062a\u064a\u0629','About me':'نبذة عني','Curious about data.':'شغوف بالبيانات.','Focused on outcomes.':'أركّز على النتائج.',
      'I’m an aspiring data analyst and Ajman University graduate with hands-on experience in e-commerce operations, machine learning for NLP, and dashboard development.':'أنا محلل بيانات طموح وخريج جامعة عجمان، ولدي خبرة عملية في عمليات التجارة الإلكترونية وتعلّم الآلة لمعالجة اللغة الطبيعية وتطوير لوحات المعلومات.',
      'At Taif Tec, I worked on product management and content organization for the Dukany platform and built Python tools that translated system logs into performance metrics. I enjoy making complex information easier to act on.':'عملت في Taif Tec على إدارة المنتجات وتنظيم المحتوى لمنصة Dukany، وطوّرت أدوات باستخدام Python لتحويل سجلات النظام إلى مؤشرات أداء. أستمتع بتبسيط المعلومات المعقدة وتحويلها إلى خطوات عملية.',
      'UAE Golden Visa holder':'حامل الإقامة الذهبية لدولة الإمارات','Arabic native · English fluent':'العربية: اللغة الأم · الإنجليزية: بطلاقة','Bachelor of Data Analytics':'بكالوريوس تحليلات البيانات','Based in Dubai, UAE':'أقيم في دبي، الإمارات العربية المتحدة',
      'Sentiment model accuracy':'دقة نموذج تحليل المشاعر','IT internship at Taif Tec':'تدريب تقنية المعلومات في Taif Tec','Data Analytics graduate':'خريج تحليلات البيانات','Featured web projects':'مواقع مختارة',
      'Learning by':'التعلّم من خلال','building.':'التطبيق.', 'Applying data and technology to real operational work.':'توظيف البيانات والتقنية في أعمال تشغيلية واقعية.',
      'May 2025 — September 2025 · Dubai, UAE':'مايو 2025 — سبتمبر 2025 · دبي، الإمارات العربية المتحدة','Information Technology Intern · Dukany e-commerce platform':'متدرب تقنية المعلومات · منصة Dukany للتجارة الإلكترونية',
      'Managed product listings and content organization to improve catalog accuracy. Built Python log-analysis tools that turned raw system data into performance metrics and helped optimize internal workflows. Collaborated across IT and product operations.':'أدرت قوائم المنتجات وتنظيم المحتوى لتحسين دقة الكتالوج. وطوّرت أدوات لتحليل السجلات باستخدام Python لتحويل بيانات النظام إلى مؤشرات أداء والمساعدة في تحسين سير العمل الداخلي. وتعاونت مع فريقي تقنية المعلومات والمنتجات.',
      'Selected website work':'مواقع عمل مختارة','Digital experiences':'تجارب رقمية','in the wild.':'على أرض الواقع.','A couple of websites I’ve worked on. Open each to explore the live experience.':'إليك موقعين عملت عليهما. افتح أيًّا منهما لاستكشاف الموقع مباشرةً.',
      'Clinic website':'موقع عيادة','Trading card website':'موقع بطاقات تداول','Visit website':'زيارة الموقع',
      'University projects':'مشاريع جامعية','Turning questions into':'تحويل الأسئلة إلى','insights.':'رؤى.','Applied analytics projects completed at Ajman University.':'مشاريع تطبيقية في التحليلات أنجزتها في جامعة عجمان.',
      'PROJECT 01':'المشروع 01','Customer Review Sentiment Analysis':'تحليل مشاعر تقييمات العملاء','Developed a deep-learning model to classify customer reviews. Used Python, TensorFlow, and NLP libraries for text preprocessing and model building. Achieved 95% accuracy, evaluated with precision, recall, and F1 score.':'طوّرت نموذج تعلّم عميق لتصنيف تقييمات العملاء. استخدمت Python وTensorFlow ومكتبات معالجة اللغة الطبيعية لتنظيف النصوص وبناء النموذج. حقق النموذج دقة 95%، وقيّمته باستخدام مقاييس الدقة والاسترجاع ودرجة F1.',
      '95% accuracy':'دقة 95%','PROJECT 02':'المشروع 02','Interactive Data Visualization':'تصوير تفاعلي للبيانات','Built a Tableau dashboard with dynamic charts and interactive filters to help explore complex datasets, surface trends, and communicate actionable insights.':'أنشأت لوحة معلومات باستخدام Tableau تتضمن مخططات ديناميكية وفلاتر تفاعلية لاستكشاف مجموعات البيانات المعقدة وإظهار الاتجاهات وتوضيح الرؤى القابلة للتنفيذ.',
      'Dashboards':'لوحات المعلومات','Data storytelling':'سرد البيانات',
      'Skills & learning':'المهارات والتعلّم','Tools for thoughtful':'أدوات لتحليل','analysis.':'مدروس.','Technical strengths and continuing education from my resume and LinkedIn profile.':'مهاراتي التقنية ومواصلة التعلّم كما وردتا في سيرتي الذاتية وملفي على LinkedIn.',
      'Data analysis':'تحليل البيانات','Python, SQL, statistical modeling, data management, and log analysis.':'Python وSQL والنمذجة الإحصائية وإدارة البيانات وتحليل السجلات.',
      'Machine learning & NLP':'تعلّم الآلة ومعالجة اللغة الطبيعية','Text preprocessing, deep learning, model evaluation, TensorFlow, and Keras.':'معالجة النصوص والتعلّم العميق وتقييم النماذج وTensorFlow وKeras.',
      'Visualization':'تصوير البيانات','Tableau dashboards, interactive charts, and data storytelling.':'لوحات Tableau والمخططات التفاعلية وسرد البيانات.',
      'Advanced Relational Database and SQL':'قواعد البيانات العلائقية المتقدمة وSQL','Deep Learning & Neural Networks with Keras':'التعلّم العميق والشبكات العصبية باستخدام Keras','Real-Time Analytics with Spark':'التحليلات الفورية باستخدام Spark','Databases and SQL for Data Science with Python':'قواعد البيانات وSQL لعلوم البيانات باستخدام Python','Big Data Processing Using Hadoop':'معالجة البيانات الضخمة باستخدام Hadoop',
      'Get in touch':'تواصل معي','Let’s turn data':'لنحوّل البيانات','into':'إلى','something useful.':'نتائج مفيدة.','Interested in analytics, machine learning, or a project that could use a data-minded approach? I’d be glad to connect.':'هل لديك اهتمام بتحليلات البيانات أو تعلّم الآلة أو مشروع يستفيد من التفكير التحليلي؟ يسعدني التواصل معك.',
      'Phone:':'الهاتف:','Email Ali ↗':'راسل علي ↗','WhatsApp ↗':'واتساب ↗','Telegram ↗':'تيليجرام ↗','Call +971 50 872 6975':'اتصل على +971 50 872 6975','Connect on LinkedIn ↗':'تواصل عبر LinkedIn ↗','View GitHub ↗':'عرض GitHub ↗','View resume ↗':'عرض السيرة الذاتية ↗','Dubai, United Arab Emirates':'دبي، الإمارات العربية المتحدة',
      'Email':'البريد الإلكتروني','Phone':'الهاتف','WhatsApp':'واتساب','Telegram':'تيليجرام'
    };
    const textNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push({ node: walker.currentNode, english: walker.currentNode.nodeValue });
    const socialLabels = [
      ['GitHub', 'GitHub'], ['LinkedIn', 'LinkedIn'], ['Email', 'البريد الإلكتروني'],
      ['+971 50 872 6975', '+971 50 872 6975'], ['WhatsApp', 'واتساب'], ['Telegram', 'تيليجرام']
    ];
    let currentLanguage = 'en';
    function setLanguage(language) {
      currentLanguage = language;
      const isArabic = language === 'ar';
      window.dispatchEvent(new CustomEvent('portfolio-language-change', { detail: language }));
      document.documentElement.lang = isArabic ? 'ar' : 'en';
      document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
      textNodes.forEach(({ node, english }) => {
        if (!isArabic) { node.nodeValue = english; return; }
        const trimmed = english.trim();
        const translated = translations[trimmed];
        if (translated) node.nodeValue = english.replace(trimmed, translated);
      });
      languageToggle.textContent = isArabic ? 'English' : 'العربية';
      languageToggle.lang = isArabic ? 'en' : 'ar';
      languageToggle.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
      languageToggle.setAttribute('aria-pressed', String(isArabic));
      document.title = isArabic ? 'Ali Akashi — محلل بيانات' : 'Ali Akashi — Data Analyst';
      document.querySelector('meta[name="description"]').content = isArabic
        ? 'علي أكاشي، محلل بيانات في دبي، الإمارات العربية المتحدة. أعمل باستخدام Python وSQL وتعلّم الآلة وتحليل البيانات.'
        : 'Ali Akashi is a data analyst in Dubai, UAE, focused on Python, SQL, machine learning, NLP, dashboards, and digital products.';
      document.querySelectorAll('.hero-socials .social-button').forEach((link, index) => {
        const label = socialLabels[index][isArabic ? 1 : 0];
        link.title = label;
        link.setAttribute('aria-label', label);
      });
      const menuOpen = navLinks.classList.contains('open');
      toggle.setAttribute('aria-label', isArabic ? (menuOpen ? 'إغلاق القائمة' : 'فتح القائمة') : (menuOpen ? 'Close menu' : 'Open menu'));
    }
    window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
    toggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', currentLanguage === 'ar' ? (open ? 'إغلاق القائمة' : 'فتح القائمة') : (open ? 'Close menu' : 'Open menu'));
      toggle.textContent = open ? '×' : '☰';
    });
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', currentLanguage === 'ar' ? 'فتح القائمة' : 'Open menu');
      toggle.textContent = '☰';
    }));
    languageToggle.addEventListener('click', () => {
      const nextLanguage = currentLanguage === 'en' ? 'ar' : 'en';
      setLanguage(nextLanguage);
      try { localStorage.setItem('portfolio-language', nextLanguage); } catch (_) {}
    });
    const copyrightTrigger = document.getElementById('copyright-admin-trigger');
    const openAdminOnCopyrightSelection = () => {
      if (!copyrightTrigger || document.body.classList.contains('admin-mode')) return;
      const selection = window.getSelection();
      if (selection?.toString().replace(/\s+/g, ' ').trim() === copyrightTrigger.textContent.replace(/\s+/g, ' ').trim()) {
        window.history.pushState(null, '', '/admin');
        window.dispatchEvent(new PopStateEvent('popstate'));
        selection.removeAllRanges();
      }
    };
    document.addEventListener('mouseup', openAdminOnCopyrightSelection);
    document.addEventListener('keyup', openAdminOnCopyrightSelection);
    document.getElementById('year').textContent = new Date().getFullYear();
    let savedLanguage = 'en';
    try { savedLanguage = localStorage.getItem('portfolio-language') === 'ar' ? 'ar' : 'en'; } catch (_) {}
    setLanguage(savedLanguage);
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      }), { threshold: .12 });
      document.querySelectorAll('.reveal').forEach(section => observer.observe(section));
    } else document.querySelectorAll('.reveal').forEach(section => section.classList.add('visible'));
}
