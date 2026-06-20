document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = (window.__SITE_BASEURL__ || '/').replace(/\/?$/, '/');
  const header = document.getElementById('header');
  const headerNav = document.getElementById('header-nav');
  const toc = document.getElementById('toc');
  const langBtn = document.getElementById('lang-toggle');
  const themeBtn = document.getElementById('theme-toggle');

  let currentLang = localStorage.getItem('site-lang') || 'ru';

  function withBaseUrl(path) {
    return baseUrl + String(path || '').replace(/^\/+/, '');
  }

  function getNestedTranslation(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    if (langBtn) langBtn.textContent = lang === 'ru' ? 'EN' : 'RU';

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const path = el.getAttribute('data-i18n');
      const translation = getNestedTranslation(i18n[lang], path);
      if (translation !== undefined) el.textContent = translation;
    });

    const resumeLink = document.querySelector('.resume-link');
    if (resumeLink) {
      const nextHref = resumeLink.getAttribute(lang === 'ru' ? 'data-href-ru' : 'data-href-en');
      if (nextHref) resumeLink.href = nextHref;
    }

    renderProjects(lang);
    renderPublications(lang);
  }

  function getTheme() {
    const stored = localStorage.getItem('site-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }

  function toggleTheme() {
    const next = (document.documentElement.dataset.theme || getTheme()) === 'dark' ? 'light' : 'dark';
    localStorage.setItem('site-theme', next);
    applyTheme(next);
  }

  function setHeaderState() {
    if (!header) return;
    header.classList.toggle('header--scrolled', window.scrollY > 8);
  }

  function getAnchorId(href) {
    if (!href) return null;
    const idx = href.indexOf('#');
    if (idx === -1) return null;
    return href.slice(idx + 1).trim() || null;
  }

  function setupHeaderNavObserver() {
    if (!toc || !headerNav) return;
    if (setupHeaderNavObserver._observer) setupHeaderNavObserver._observer.disconnect();
    const headerHeight = header ? header.offsetHeight : 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          headerNav.classList.toggle('visible', !entry.isIntersecting);
        });
      },
      { rootMargin: `-${headerHeight}px 0px 0px 0px` }
    );
    observer.observe(toc);
    setupHeaderNavObserver._observer = observer;
  }

  function setupActiveNavHighlight() {
    const allLinks = [
      ...document.querySelectorAll('.toc a[href*="#"]'),
      ...document.querySelectorAll('.header-nav a[href*="#"]')
    ];

    const sections = [];
    allLinks.forEach(link => {
      const id = getAnchorId(link.getAttribute('href'));
      if (!id) return;
      if (sections.some(s => s.id === id)) return;
      const el = document.getElementById(id);
      if (el) sections.push({ id, el });
    });

    function highlight() {
      const offset = (header ? header.offsetHeight : 0) + 80;
      const y = window.scrollY + offset;
      let current = '';

      sections.forEach(({ id, el }) => {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (y >= top && y < bottom) current = id;
      });

      allLinks.forEach(link => {
        const id = getAnchorId(link.getAttribute('href'));
        link.classList.toggle('active', id === current);
      });
    }

    window.addEventListener('scroll', highlight, { passive: true });
    window.addEventListener('resize', highlight);
    highlight();
  }

  function openModal({ title, desc, image }) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    const img = document.getElementById('modal-image');
    const titleEl = document.getElementById('modal-title');
    const descEl = document.getElementById('modal-desc');
    if (img) img.src = image || '';
    if (img) img.alt = title || '';
    if (titleEl) titleEl.textContent = title || '';
    if (descEl) descEl.textContent = desc || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  function setupModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.hasAttribute('data-modal-close')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function renderProjects(lang) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    if (!Array.isArray(window.projects)) return;

    grid.innerHTML = '';
    window.projects.forEach((p, idx) => {
      const title = lang === 'ru' ? p.titleRu : p.titleEn;
      const desc = lang === 'ru' ? p.descRu : p.descEn;
      const thumb = withBaseUrl(p.thumb);
      const full = withBaseUrl(p.full || p.thumb);

      const card = document.createElement(p.href ? 'a' : 'button');
      if (p.href) {
        card.href = p.href;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      } else {
        card.type = 'button';
      }

      card.className = `project-card${idx === 0 ? ' project-card--featured' : ''}`;

      card.innerHTML = `
        <div class="project-card__media">
          <img src="${thumb}" alt="${title}">
        </div>
        <div class="project-card__body">
          <div class="project-card__title">${title}</div>
          <div class="project-card__desc">${desc || ''}</div>
        </div>
      `;

      if (!p.href) {
        card.addEventListener('click', () => openModal({ title, desc, image: full }));
      }

      grid.appendChild(card);
    });
  }

  function renderPublications(lang) {
    const track = document.getElementById('publications-track');
    if (!track) return;
    if (!Array.isArray(window.publications)) return;

    track.innerHTML = '';
    window.publications.forEach((p) => {
      const title = lang === 'ru' ? p.titleRu : p.titleEn;
      const meta = lang === 'ru' ? p.metaRu : p.metaEn;
      const cover = withBaseUrl(p.cover);

      const card = document.createElement('a');
      card.className = 'pub-card';
      card.href = p.href;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';

      card.innerHTML = `
        <div class="pub-card__media">
          <img src="${cover}" alt="${title}">
        </div>
        <div class="pub-card__body">
          <div class="pub-card__title">${title}</div>
          <div class="pub-card__meta">${meta || ''}</div>
        </div>
      `;

      track.appendChild(card);
    });
  }

  function setupCarouselControls() {
    const viewport = document.getElementById('publications-viewport');
    const prev = document.getElementById('pub-prev');
    const next = document.getElementById('pub-next');
    if (!viewport || !prev || !next) return;

    function scrollByCard(dir) {
      const card = viewport.querySelector('.pub-card');
      const width = card ? card.getBoundingClientRect().width : 320;
      viewport.scrollBy({ left: dir * (width + 12), behavior: 'smooth' });
    }

    prev.addEventListener('click', () => scrollByCard(-1));
    next.addEventListener('click', () => scrollByCard(1));
  }

  if (langBtn) {
    langBtn.addEventListener('click', () => {
      currentLang = currentLang === 'ru' ? 'en' : 'ru';
      localStorage.setItem('site-lang', currentLang);
      applyLanguage(currentLang);
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  applyTheme(getTheme());
  applyLanguage(currentLang);
  if (!toc && headerNav) headerNav.classList.add('visible');
  setupHeaderNavObserver();
  setupActiveNavHighlight();
  setupModal();
  setupCarouselControls();
  setHeaderState();

  window.addEventListener('scroll', setHeaderState, { passive: true });
  window.addEventListener('resize', setupHeaderNavObserver);
});
