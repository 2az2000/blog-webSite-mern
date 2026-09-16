/* ==========================================================================
   NOVA — shared behaviour layer
   Header/footer components, theme, navigation, search, card rendering,
   list hydration, reading progress, comments, forms, toasts.
   Every interactive affordance on the prototype is wired here; nothing on a
   page is decorative.
   ========================================================================== */
(function () {
  'use strict';

  var NOVA = window.NOVA = {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- icons */
  var I = NOVA.icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    sun: '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>',
    moon: '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.75h11a.75.75 0 0 1 .75.75v15.2l-6.25-3.9-6.25 3.9V4.5a.75.75 0 0 1 .75-.75Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13Z"/></svg>',
    reply: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 8 4.5 12 9 16"/><path d="M4.5 12h9a6 6 0 0 1 6 6v1"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4.5M6 5h10.5l-1.8 3.6 1.8 3.6H6"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.4 1.4"/><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.4-1.4"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.8 6.6 8.2 6 8.2-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.3v.2"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.7v.2"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6m0 0-5 5m5-5 5 5"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v13m0 0 5-5m-5 5-5-5"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13m0 0-5-5m5 5-5 5"/></svg>',
    equal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 10h12M6 14h12"/></svg>'
  };

  /* ------------------------------------------------------------- helpers */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  NOVA.esc = esc;

  function qs(name, fallback) {
    var v = new URLSearchParams(location.search).get(name);
    return v === null || v === '' ? fallback : v;
  }
  NOVA.qs = qs;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso) {
    var p = String(iso).split('-');
    return MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
  }
  NOVA.fmtDate = fmtDate;

  function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  NOVA.fmtNum = fmtNum;

  function author(key) { return (window.NOVA_AUTHORS || {})[key] || { name: 'NOVA Staff', initials: 'NV', role: 'Newsroom', slug: 'staff' }; }
  function section(key) { return (window.NOVA_SECTIONS || {})[key] || { name: key, blurb: '' }; }
  NOVA.author = author;
  NOVA.section = section;

  function articleHref(a) {
    return (a.kind === 'longread' ? 'longform.html?a=' : 'article.html?a=') + a.slug;
  }
  NOVA.articleHref = articleHref;

  function find(slug) {
    return (window.NOVA_ARTICLES || []).filter(function (a) { return a.slug === slug; })[0];
  }
  NOVA.find = find;

  /* ------------------------------------------------------- card component */
  /* variant: featured | horizontal | compact | numbered | minimal | longread
              | opinion | video   ·  opts: { rank, showStandfirst, hideMedia } */
  NOVA.card = function (a, variant, opts) {
    opts = opts || {};
    var au = author(a.author);
    var sec = section(a.section);
    var href = articleHref(a);
    var kicker = '<span class="badge' + (a.section === 'opinion' ? ' badge--opinion' : '') + '">' + esc(sec.name) + '</span>';
    var meta = '<p class="card__meta"><span class="od-nowrap">' + esc(au.name) + '</span>' +
               '<span class="dot-sep od-nowrap">' + esc(fmtDate(a.date)) + '</span>' +
               '<span class="dot-sep od-nowrap">' + a.mins + ' min read</span></p>';
    var title = '<h3 class="card__title"><a class="card__link" href="' + href + '">' + esc(a.title) + '</a></h3>';
    var stand = opts.showStandfirst === false ? '' :
      '<p class="card__standfirst od-clamp-3">' + esc(a.standfirst) + '</p>';
    var media = '<div class="card__media"><img src="assets/img/' + esc(a.img) + '" width="1600" height="1067" alt="' + esc(a.title) + '" loading="lazy" decoding="async"></div>';

    if (variant === 'compact') {
      return '<article class="card card--compact">' +
        '<div class="card__media"><img src="assets/img/' + esc(a.img) + '" width="1600" height="1067" alt="" loading="lazy" decoding="async"></div>' +
        '<div><div class="card__kicker">' + kicker + '</div>' + title +
        '<p class="card__meta od-nowrap">' + a.mins + ' min read</p></div></article>';
    }
    if (variant === 'numbered') {
      return '<article class="card card--numbered">' +
        '<div class="card__rank" aria-hidden="true">' + (opts.rank < 10 ? '0' : '') + opts.rank + '</div>' +
        '<div><div class="card__kicker">' + kicker + '</div>' + title +
        '<p class="card__meta"><span class="od-nowrap">' + esc(au.name) + '</span><span class="dot-sep od-nowrap">' + fmtNum(a.views) + ' reads</span></p></div></article>';
    }
    if (variant === 'minimal') {
      return '<article class="card card--minimal"><div class="card__kicker">' + kicker + '</div>' +
        title + meta + '</article>';
    }
    if (variant === 'opinion') {
      return '<article class="card card--opinion">' +
        '<span class="avatar avatar--2" aria-hidden="true">' + esc(au.initials) + '</span>' +
        '<div><div class="card__kicker"><span class="badge badge--opinion">' + esc(sec.name) + '</span></div>' +
        title + '<p class="card__meta"><span class="od-nowrap">' + esc(au.name) + '</span><span class="dot-sep">' + esc(au.role) + '</span></p></div></article>';
    }
    if (variant === 'horizontal') {
      return '<article class="card card--horizontal">' + media +
        '<div><div class="card__kicker">' + kicker + '</div>' + title + stand + meta + '</div></article>';
    }
    if (variant === 'longread') {
      return '<article class="card card--longread">' +
        '<div class="card__media"><img src="assets/img/' + esc(a.img) + '" width="2000" height="900" alt="' + esc(a.title) + '" loading="lazy" decoding="async"></div>' +
        '<div class="card__body"><div class="card__kicker"><span class="badge">Long read</span>' +
        '<span class="card__meta od-nowrap">' + a.mins + ' min</span></div>' + title + stand + '</div></article>';
    }
    if (variant === 'video') {
      return '<article class="card card--video">' +
        '<div class="card__media"><img src="assets/img/' + esc(a.img) + '" width="1600" height="1067" alt="' + esc(a.title) + '" loading="lazy" decoding="async">' +
        '<span class="card__play">' + I.play + ' <span>' + a.mins + ':00</span></span></div>' +
        '<div class="card__kicker">' + kicker + '</div>' + title + stand + meta + '</article>';
    }
    if (variant === 'featured') {
      return '<article class="card card--featured">' + media +
        '<div class="card__kicker">' + kicker + '</div>' + title + stand + meta + '</article>';
    }
    /* default standard card */
    return '<article class="card">' + media +
      '<div class="card__kicker">' + kicker + '</div>' + title + stand + meta + '</article>';
  };

  NOVA.autoVariant = function (a) {
    if (a.kind === 'longread') return 'longread';
    if (a.kind === 'video') return 'video';
    if (a.kind === 'opinion') return 'opinion';
    return 'default';
  };

  /* --------------------------------------------------- header + footer UI */
  var NAV = [
    ['Home', 'index.html', 'home'],
    ['Latest', 'category.html?s=latest', 'latest'],
    ['Technology', 'category.html?s=technology', 'technology'],
    ['Business', 'category.html?s=business', 'business'],
    ['Science', 'category.html?s=science', 'science'],
    ['Design', 'category.html?s=design', 'design'],
    ['Culture', 'category.html?s=culture', 'culture'],
    ['Opinion', 'category.html?s=opinion', 'opinion']
  ];

  function renderHeader(active) {
    var links = NAV.map(function (n) {
      return '<a href="' + n[1] + '"' + (n[2] === active ? ' aria-current="page"' : '') + '>' + n[0] + '</a>';
    }).join('');
    var mobileLinks = NAV.map(function (n, i) {
      return '<li><a href="' + n[1] + '"' + (n[2] === active ? ' aria-current="page"' : '') + '>' + n[0] +
        '<span>' + String(i + 1).padStart(2, '0') + '</span></a></li>';
    }).join('');

    return '' +
      '<header class="site-header" id="siteHeader">' +
        '<div class="wrap header-bar">' +
          '<a class="wordmark" href="index.html" aria-label="NOVA — home">NOVA</a>' +
          '<nav class="header-sections" aria-label="Sections">' + links + '</nav>' +
          '<div class="header-actions">' +
            '<div class="header-search" id="headerSearch">' +
              '<label class="sr-only" for="headerSearchInput">Search NOVA</label>' +
              '<input class="header-search__field" id="headerSearchInput" type="search" placeholder="Search stories, authors, topics" tabindex="-1">' +
              '<button class="icon-btn" type="button" id="headerSearchToggle" aria-expanded="false" aria-controls="headerSearchInput" aria-label="Search">' + I.search + '</button>' +
            '</div>' +
            '<button class="icon-btn theme-toggle" type="button" id="themeToggle" aria-label="Switch to dark theme" aria-pressed="false">' + I.sun + I.moon + '</button>' +
            '<a class="btn btn--ghost btn--sm header-desktop-only" href="auth.html">Sign in</a>' +
            '<a class="btn btn--primary btn--sm header-desktop-only" href="subscribe.html">Subscribe</a>' +
            '<button class="icon-btn header-mobile-only" type="button" id="menuToggle" aria-expanded="false" aria-controls="mobileNav" aria-label="Open menu">' + I.menu + '</button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="mobile-nav" id="mobileNav" hidden>' +
        '<div class="wrap">' +
          '<div class="mobile-nav__top">' +
            '<a class="wordmark" href="index.html">NOVA</a>' +
            '<button class="icon-btn" type="button" id="menuClose" aria-label="Close menu">' + I.close + '</button>' +
          '</div>' +
          '<form class="od-row" role="search" action="search.html" style="--od-gap:8px">' +
            '<label class="sr-only" for="mobileSearch">Search NOVA</label>' +
            '<input class="input od-fill" id="mobileSearch" name="q" type="search" placeholder="Search stories, authors, topics">' +
            '<button class="btn btn--primary od-fixed" type="submit">Search</button>' +
          '</form>' +
          '<ul class="mobile-nav__list">' + mobileLinks + '</ul>' +
          '<div class="mobile-nav__footer">' +
            '<a class="btn btn--accent btn--block" href="subscribe.html">Subscribe to NOVA</a>' +
            '<a class="btn btn--secondary btn--block" href="auth.html">Sign in</a>' +
            '<a class="btn btn--ghost btn--block" href="bookmarks.html">Saved articles</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderFooter() {
    var col = function (title, items) {
      return '<div class="footer-col"><h3>' + title + '</h3><ul>' +
        items.map(function (i) { return '<li><a href="' + i[1] + '">' + i[0] + '</a></li>'; }).join('') +
        '</ul></div>';
    };
    return '' +
      '<footer class="site-footer" id="footer">' +
        '<div class="wrap">' +
          '<div class="footer-grid">' +
            '<div class="footer-col footer-about">' +
              '<span class="wordmark">NOVA</span>' +
              '<p>Ideas, stories, and perspectives shaping tomorrow. Independent reporting on technology, business, science, design and culture — published daily since 2021.</p>' +
            '</div>' +
            col('Sections', [['Latest', 'category.html?s=latest'], ['Technology', 'category.html?s=technology'], ['Business', 'category.html?s=business'], ['Science', 'category.html?s=science'], ['Design', 'category.html?s=design'], ['Culture', 'category.html?s=culture'], ['Opinion', 'category.html?s=opinion']]) +
            col('Discover', [['Trending', 'trending.html'], ['Topics', 'topic.html?t=artificial-intelligence'], ['Long reads', 'longform.html'], ['Interviews', 'category.html?s=interviews'], ['Search', 'search.html'], ['Design system', 'design-system.html']]) +
            col('Account', [['Sign in', 'auth.html'], ['Create account', 'auth.html#signup'], ['Saved articles', 'bookmarks.html'], ['Newsletters', 'newsletter.html'], ['Subscribe', 'subscribe.html'], ['UI states', 'states.html']]) +
            col('Publication', [['About NOVA', 'index.html#about'], ['Editorial standards', 'index.html#about'], ['Contact', 'index.html#about'], ['Privacy', 'index.html#about'], ['Terms', 'index.html#about'], ['404 page', '404.html']]) +
          '</div>' +
          '<div class="footer-bottom">' +
            '<span>© 2026 NOVA Media. All rights reserved.</span>' +
            '<nav aria-label="Legal"><a href="index.html#about">Privacy</a><a href="index.html#about">Terms</a><a href="index.html#about">Cookies</a><a href="index.html#about">Accessibility</a></nav>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* ------------------------------------------------------------- theme */
  var THEME_KEY = 'nova:theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(t === 'dark'));
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }
  NOVA.applyTheme = applyTheme;

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
    var forced = document.body.getAttribute('data-force-theme');
    var t = forced || stored ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(t);
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      });
    }
  }

  /* ------------------------------------------------------ header behaviour */
  function initHeaderBehaviour() {
    var header = document.getElementById('siteHeader');
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var wrapEl = document.getElementById('headerSearch');
    var toggle = document.getElementById('headerSearchToggle');
    var field = document.getElementById('headerSearchInput');
    if (wrapEl && toggle && field) {
      var open = function (state) {
        wrapEl.classList.toggle('is-open', state);
        toggle.setAttribute('aria-expanded', String(state));
        field.tabIndex = state ? 0 : -1;
        if (state) field.focus();
      };
      toggle.addEventListener('click', function () {
        var isOpen = wrapEl.classList.contains('is-open');
        if (isOpen && field.value.trim()) { location.href = 'search.html?q=' + encodeURIComponent(field.value.trim()); return; }
        open(!isOpen);
      });
      field.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); location.href = 'search.html?q=' + encodeURIComponent(field.value.trim()); }
        if (e.key === 'Escape') { open(false); toggle.focus(); }
      });
      document.addEventListener('click', function (e) {
        if (!wrapEl.contains(e.target) && wrapEl.classList.contains('is-open') && !field.value) open(false);
      });
    }

    var nav = document.getElementById('mobileNav');
    var menuBtn = document.getElementById('menuToggle');
    var closeBtn = document.getElementById('menuClose');
    if (nav && menuBtn) {
      var setNav = function (state) {
        if (state) nav.hidden = false;
        requestAnimationFrame(function () { nav.classList.toggle('is-open', state); });
        menuBtn.setAttribute('aria-expanded', String(state));
        document.body.style.overflow = state ? 'hidden' : '';
        if (state) { var f = nav.querySelector('a, button, input'); if (f) f.focus(); }
        else { setTimeout(function () { if (!nav.classList.contains('is-open')) nav.hidden = true; }, 300); menuBtn.focus(); }
      };
      menuBtn.addEventListener('click', function () { setNav(true); });
      if (closeBtn) closeBtn.addEventListener('click', function () { setNav(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false);
      });
    }
  }

  /* ------------------------------------------------------ reading progress */
  function initReadingProgress() {
    var bar = document.querySelector('.reading-progress__bar');
    if (!bar) return;
    var target = document.querySelector('[data-progress-target]') || document.body;
    var update = function () {
      var rect = target.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      bar.style.width = (total <= 0 ? 100 : (done / total) * 100) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ------------------------------------------------------------ scrollspy */
  function initChapterSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.lf-chapters a'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var marks = links.map(function (l) { return document.querySelector(l.getAttribute('href')); }).filter(Boolean);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    marks.forEach(function (m) { io.observe(m); });
  }

  /* ------------------------------------------------------------- toasts */
  NOVA.toast = function (message, kind) {
    var region = document.getElementById('toastRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toastRegion';
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    var el = document.createElement('div');
    el.className = 'toast toast--' + (kind || 'success');
    el.innerHTML = (kind === 'error' ? I.alert : I.check) + '<span>' + esc(message) + '</span>' +
      '<button type="button" aria-label="Dismiss">' + I.close.replace('viewBox', 'width="16" height="16" viewBox') + '</button>';
    el.querySelector('button').addEventListener('click', function () { el.remove(); });
    region.appendChild(el);
    setTimeout(function () { el.remove(); }, 4800);
  };

  /* ------------------------------------------------- generic interactions */
  function initToggles(root) {
    root = root || document;

    /* bookmark + like toggles */
    root.querySelectorAll('[data-toggle="bookmark"]').forEach(function (btn) {
      if (btn.dataset.bound) return; btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(on));
        var label = btn.getAttribute('data-label') || 'Article';
        btn.setAttribute('aria-label', (on ? 'Remove from saved: ' : 'Save for later: ') + label);
        NOVA.toast(on ? 'Saved to your reading list' : 'Removed from your reading list');
      });
    });

    root.querySelectorAll('[data-toggle="like"]').forEach(function (btn) {
      if (btn.dataset.bound) return; btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var countEl = btn.querySelector('[data-count]');
        var on = !btn.classList.contains('is-liked');
        btn.classList.toggle('is-liked', on);
        btn.setAttribute('aria-pressed', String(on));
        if (countEl) countEl.textContent = String(parseInt(countEl.textContent, 10) + (on ? 1 : -1));
      });
    });

    /* dropdowns */
    root.querySelectorAll('.dropdown').forEach(function (dd) {
      if (dd.dataset.bound) return; dd.dataset.bound = '1';
      var trigger = dd.querySelector('[data-dropdown-trigger]');
      var menu = dd.querySelector('.dropdown__menu');
      if (!trigger || !menu) return;
      var setOpen = function (s) { dd.classList.toggle('is-open', s); trigger.setAttribute('aria-expanded', String(s)); };
      trigger.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!dd.classList.contains('is-open')); });
      menu.addEventListener('click', function (e) {
        var b = e.target.closest('button[role="menuitemradio"]');
        if (!b) return;
        menu.querySelectorAll('[role="menuitemradio"]').forEach(function (o) { o.setAttribute('aria-checked', 'false'); });
        b.setAttribute('aria-checked', 'true');
        var lbl = trigger.querySelector('[data-dropdown-label]');
        if (lbl) lbl.textContent = b.dataset.value || b.textContent.trim();
        setOpen(false);
        dd.dispatchEvent(new CustomEvent('nova:sort', { bubbles: true, detail: { value: b.dataset.key } }));
      });
      document.addEventListener('click', function () { setOpen(false); });
      dd.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false); trigger.focus(); } });
    });

    /* modals */
    root.querySelectorAll('[data-modal-open]').forEach(function (btn) {
      if (btn.dataset.bound) return; btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var m = document.getElementById(btn.getAttribute('data-modal-open'));
        if (!m) return;
        m.classList.add('is-open');
        m.setAttribute('aria-hidden', 'false');
        var f = m.querySelector('button, a, input');
        if (f) f.focus();
        m._opener = btn;
      });
    });
    root.querySelectorAll('.modal-backdrop').forEach(function (m) {
      if (m.dataset.bound) return; m.dataset.bound = '1';
      var close = function () {
        m.classList.remove('is-open');
        m.setAttribute('aria-hidden', 'true');
        if (m._opener) m._opener.focus();
      };
      m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-modal-close]')) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.classList.contains('is-open')) close(); });
    });

    /* tab groups — [data-tabs] with buttons carrying data-tab-key */
    root.querySelectorAll('[data-tabs]').forEach(function (group) {
      if (group.dataset.bound) return; group.dataset.bound = '1';
      group.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab-key]');
        if (!b) return;
        group.querySelectorAll('[data-tab-key]').forEach(function (o) { o.setAttribute('aria-selected', String(o === b)); });
        group.dispatchEvent(new CustomEvent('nova:tab', { bubbles: true, detail: { key: b.dataset.tabKey } }));
      });
      group.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var items = Array.prototype.slice.call(group.querySelectorAll('[data-tab-key]'));
        var i = items.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        var next = items[(i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length];
        next.focus(); next.click();
      });
    });
  }
  NOVA.initToggles = initToggles;

  /* ------------------------------------------------------ form validation */
  function initForms(root) {
    (root || document).querySelectorAll('form[data-validate]').forEach(function (form) {
      if (form.dataset.bound) return; form.dataset.bound = '1';

      var showError = function (field, msg) {
        field.classList.add('is-error');
        var input = field.querySelector('.input, .textarea');
        var err = field.querySelector('.field__error');
        if (!err) {
          err = document.createElement('p');
          err.className = 'field__error';
          err.id = (input.id || 'field') + '-error';
          field.appendChild(err);
        }
        err.innerHTML = I.alert.replace('viewBox', 'width="16" height="16" viewBox') + '<span>' + esc(msg) + '</span>';
        if (input) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
      };
      var clearError = function (field) {
        field.classList.remove('is-error');
        var input = field.querySelector('.input, .textarea');
        var err = field.querySelector('.field__error');
        if (err) err.remove();
        if (input) { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
      };
      var validate = function (input) {
        var field = input.closest('.field');
        if (!field) return true;
        var v = input.value.trim();
        if (input.required && !v) { showError(field, (input.dataset.labelName || 'This field') + ' is required. Enter a value to continue.'); return false; }
        if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          showError(field, 'That address is missing an @ or a domain. Check it and try again.'); return false;
        }
        if (input.type === 'password' && v && v.length < 8) {
          showError(field, 'Use at least 8 characters. Longer passphrases are stronger than short complex ones.'); return false;
        }
        clearError(field); return true;
      };

      /* validate on blur, never on every keystroke */
      form.querySelectorAll('.input, .textarea').forEach(function (input) {
        input.addEventListener('blur', function () { validate(input); });
        input.addEventListener('input', function () {
          var f = input.closest('.field');
          if (f && f.classList.contains('is-error')) validate(input);
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var inputs = Array.prototype.slice.call(form.querySelectorAll('.input, .textarea'));
        var bad = inputs.filter(function (i) { return !validate(i); });
        var summary = form.querySelector('.form-error-summary');
        if (summary) summary.remove();
        if (bad.length) {
          var s = document.createElement('div');
          s.className = 'form-error-summary';
          s.setAttribute('role', 'alert');
          s.innerHTML = '<h4>' + bad.length + ' field' + (bad.length > 1 ? 's need' : ' needs') + ' your attention</h4><ul>' +
            bad.map(function (i) {
              return '<li><a href="#' + (i.id || '') + '">' + esc(i.dataset.labelName || i.name || 'Field') + '</a></li>';
            }).join('') + '</ul>';
          form.prepend(s);
          s.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function (ev) {
              ev.preventDefault();
              var t = document.getElementById(a.getAttribute('href').slice(1));
              if (t) t.focus();
            });
          });
          bad[0].focus();
          return;
        }
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.classList.add('is-loading');
        setTimeout(function () {
          if (btn) btn.classList.remove('is-loading');
          var done = form.getAttribute('data-success');
          NOVA.toast(done || 'Done.');
          var target = form.getAttribute('data-success-panel');
          if (target) {
            var panel = document.getElementById(target);
            if (panel) { panel.hidden = false; form.hidden = true; panel.focus(); }
          } else {
            form.reset();
          }
        }, 900);
      });
    });
  }
  NOVA.initForms = initForms;

  /* --------------------------------------------------------- comments UI */
  function initComments() {
    var form = document.getElementById('commentForm');
    var list = document.getElementById('commentList');
    var empty = document.getElementById('commentEmpty');
    if (!form || !list) return;
    var textarea = form.querySelector('.textarea');
    var count = document.getElementById('commentCount');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = textarea.value.trim();
      var field = textarea.closest('.field');
      if (!v) {
        field.classList.add('is-error');
        if (!field.querySelector('.field__error')) {
          var p = document.createElement('p');
          p.className = 'field__error';
          p.innerHTML = I.alert.replace('viewBox', 'width="16" height="16" viewBox') + '<span>Write something before posting. Comments are held for review if they are under 10 characters.</span>';
          field.appendChild(p);
        }
        textarea.focus();
        return;
      }
      field.classList.remove('is-error');
      var err = field.querySelector('.field__error'); if (err) err.remove();
      var btn = form.querySelector('button[type="submit"]');
      btn.classList.add('is-loading');
      setTimeout(function () {
        btn.classList.remove('is-loading');
        if (empty) empty.hidden = true;
        var el = document.createElement('article');
        el.className = 'comment';
        el.innerHTML = '<span class="avatar avatar--sm" aria-hidden="true">YO</span><div>' +
          '<div class="comment__head"><span class="comment__author">You</span>' +
          '<span class="comment__badge">Subscriber</span><span class="meta">just now</span></div>' +
          '<p class="comment__body">' + esc(v) + '</p>' +
          '<div class="comment__actions">' +
          '<button class="comment__action" type="button" data-toggle="like" aria-pressed="false">' + I.heart + '<span data-count>0</span></button>' +
          '<button class="comment__action" type="button">' + I.reply + 'Reply</button>' +
          '<button class="comment__action" type="button">' + I.flag + 'Report</button></div></div>';
        list.prepend(el);
        initToggles(el);
        textarea.value = '';
        if (count) count.textContent = String(parseInt(count.textContent, 10) + 1);
        NOVA.toast('Comment posted');
      }, 800);
    });
  }

  /* ------------------------------------------------------------- boot */
  function boot() {
    var headerSlot = document.getElementById('site-header');
    if (headerSlot) headerSlot.outerHTML = renderHeader(document.body.getAttribute('data-nav') || '');
    var footerSlot = document.getElementById('site-footer');
    if (footerSlot) footerSlot.outerHTML = renderFooter();

    initTheme();
    initHeaderBehaviour();
    initReadingProgress();
    initChapterSpy();
    initToggles(document);
    initForms(document);
    initComments();

    /* prefill any search field from ?q= */
    var q = qs('q', '');
    document.querySelectorAll('[data-search-input]').forEach(function (i) { i.value = q; });

    /* page-level hydrators registered by individual pages */
    if (typeof window.novaPage === 'function') window.novaPage();

    document.body.classList.add('is-ready');
    if (reduceMotion.matches) document.documentElement.setAttribute('data-reduced-motion', 'true');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
