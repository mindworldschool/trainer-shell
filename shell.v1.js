/**
 * MindWorld — общая оболочка публичных тренажёров, версия 1.
 *
 * Что делает:
 *  - рисует шапку (лого, название, подзаголовок, кнопки UA / EN / RU / ES);
 *  - выбирает язык: ?lang= → сохранённый выбор (localStorage mws_lang) → язык браузера → украинский;
 *  - ставит <html lang> = uk / en / ru / es и переводит document.title;
 *  - сообщает тренажёру о смене языка через onLangChange и событие "mw:langchange".
 *
 * Логику игры оболочка не трогает: тексты внутри тренажёра переводит он сам.
 *
 * Подключение (обычный скрипт, без модулей):
 *   <link rel="stylesheet" href="/trainer-shell/shell.v1.css">
 *   <script src="/trainer-shell/shell.v1.js"></script>
 *   <div id="mw-header"></div>
 *   MWShell.init({ mount: '#mw-header', title: 'Memory Match', ... });
 */
(function () {
  'use strict';

  // Порядок кнопок и коды. Внутри оболочки украинский — "uk" (стандарт),
  // но многие тренажёры исторически используют "ua", поэтому принимаем оба.
  var LANGS = ['uk', 'en', 'ru', 'es'];
  var LABELS = { uk: 'UA', en: 'EN', ru: 'RU', es: 'ES' };
  // Общий ключ для всех тренажёров на mindworldschool.github.io (один origin).
  // Значение для украинского — "ua", как уже пишут Say-the-number, soroban и clock.
  var STORAGE_KEY = 'mws_lang';

  var SHELL_BASE = (function () {
    // Адрес папки оболочки — от самого скрипта, чтобы найти лого
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/[^/]*$/, '');
    return '/trainer-shell/';
  })();

  var state = {
    lang: 'uk',
    opts: null,
    buttons: []
  };

  function normalize(code) {
    if (!code) return null;
    code = String(code).toLowerCase().slice(0, 2);
    if (code === 'ua') code = 'uk';
    return LANGS.indexOf(code) !== -1 ? code : null;
  }

  function readStorage() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function writeStorage(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang === 'uk' ? 'ua' : lang); } catch (e) { /* хранилище недоступно — работаем без него */ }
  }

  function detectLang() {
    var fromUrl = null;
    try { fromUrl = new URLSearchParams(window.location.search).get('lang'); } catch (e) {}
    return normalize(fromUrl) ||
      normalize(readStorage()) ||
      normalize(navigator.language) ||
      'uk';
  }

  /** Строка или словарь {uk,en,ru,es} → строка на текущем языке */
  function pick(value, lang) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value[lang] || value.ua || value.uk || value.en || '';
  }

  /** Код языка в том виде, в каком его ждёт тренажёр */
  function forTrainer(lang) {
    var opts = state.opts || {};
    return (lang === 'uk' && opts.ukrainianCode === 'ua') ? 'ua' : lang;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderHeader(mount) {
    var opts = state.opts;
    var header = el('header', 'app-header');

    var brand = el('div', 'app-header__brand');
    var logo = el('img', 'app-header__logo');
    logo.src = opts.logo || (SHELL_BASE + 'assets/logo.png');
    logo.alt = 'MindWorld School';
    logo.width = 56;
    logo.height = 56;

    var titles = el('div', 'app-header__titles');
    var h1 = el('h1', 'app-header__title');
    h1.setAttribute('data-mw-title', '');
    titles.appendChild(h1);
    if (opts.tagline) {
      var tag = el('p', 'app-header__tagline');
      tag.setAttribute('data-mw-tagline', '');
      titles.appendChild(tag);
    }
    brand.appendChild(logo);
    brand.appendChild(titles);

    var switcher = el('div', 'app-header__languages');
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Language');
    state.buttons = LANGS.map(function (code) {
      var b = el('button', 'language-btn', LABELS[code]);
      b.type = 'button';
      b.lang = code;
      b.setAttribute('data-lang', code);
      b.addEventListener('click', function () { setLang(code); });
      switcher.appendChild(b);
      return b;
    });

    header.appendChild(brand);
    header.appendChild(switcher);

    // Заменяем заглушку целиком, чтобы не было лишней обёртки
    mount.parentNode.replaceChild(header, mount);
    state.header = header;
  }

  function applyLang() {
    var lang = state.lang;
    var opts = state.opts;

    document.documentElement.lang = lang;

    if (opts.docTitle || opts.title) {
      document.title = pick(opts.docTitle || opts.title, lang);
    }

    if (state.header) {
      var h1 = state.header.querySelector('[data-mw-title]');
      if (h1) h1.textContent = pick(opts.title, lang);
      var tag = state.header.querySelector('[data-mw-tagline]');
      if (tag) tag.textContent = pick(opts.tagline, lang);
    }

    state.buttons.forEach(function (b) {
      var active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('language-btn--active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setLang(code, silent) {
    var lang = normalize(code);
    if (!lang) return;
    var changed = lang !== state.lang;
    state.lang = lang;
    writeStorage(lang);
    applyLang();
    if (silent || !changed) return;
    notify();
  }

  function notify() {
    var code = forTrainer(state.lang);
    if (state.opts && typeof state.opts.onLangChange === 'function') {
      try { state.opts.onLangChange(code); } catch (e) { console.error('[MWShell] onLangChange', e); }
    }
    try {
      document.dispatchEvent(new CustomEvent('mw:langchange', { detail: { lang: code } }));
    } catch (e) {}
  }

  /**
   * opts:
   *   mount         — селектор или элемент-заглушка под шапку (по умолчанию '#mw-header');
   *                   если не найден, шапка вставляется первой в <body>
   *   title         — название тренажёра: строка или {uk,en,ru,es}
   *   tagline       — подзаголовок, строка или словарь (необязательно)
   *   docTitle      — заголовок вкладки, строка или словарь (по умолчанию title)
   *   logo          — свой путь к лого (по умолчанию лого оболочки)
   *   ukrainianCode — 'ua', если тренажёр внутри называет украинский "ua" (по умолчанию 'uk')
   *   onLangChange  — function(code), вызывается при init и при каждой смене языка
   */
  function init(opts) {
    state.opts = opts || {};
    state.lang = detectLang();
    writeStorage(state.lang);

    document.body.classList.add('mw-shell');

    var mount = state.opts.mount || '#mw-header';
    if (typeof mount === 'string') mount = document.querySelector(mount);
    if (!mount) {
      mount = document.createElement('div');
      document.body.insertBefore(mount, document.body.firstChild);
    }
    renderHeader(mount);
    applyLang();
    notify();
    watchHeight();
    return api;
  }

  // ===== Высота для фрейма на сайте =====
  // Когда тренажёр открыт во фрейме, сообщаем странице высоту содержимого,
  // чтобы фрейм был ровно по игре, без пустого места снизу.
  // Страница сайта слушает сообщение 'mw-trainer:height' и меняет высоту фрейма.
  // Если страница не слушает — ничего не происходит.
  var HEIGHT_MSG = 'mw-trainer:height';
  // Куда разрешено отправлять (postMessage с чужим targetOrigin браузер просто отбрасывает)
  var SITE_ORIGINS = ['https://mindworldschool.com', 'https://www.mindworldschool.com'];
  // Локальная разработка: тренажёр и тестовая страница на одном localhost
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) SITE_ORIGINS.push(location.origin);
  var lastHeight = 0;
  var heightQueued = false;

  /** Высота содержимого: нижний край самого низкого видимого блока в <body> */
  function contentHeight() {
    var bottom = 0;
    var children = document.body ? document.body.children : [];
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      if (/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(node.tagName)) continue;
      var cs = getComputedStyle(node);
      // Модальные окна, маскоты поверх и скрытые элементы высоту не задают
      if (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'absolute') continue;
      var rect = node.getBoundingClientRect();
      var b = rect.bottom + (parseFloat(cs.marginBottom) || 0);
      if (b > bottom) bottom = b;
    }
    var pad = document.body ? parseFloat(getComputedStyle(document.body).paddingBottom) || 0 : 0;
    return Math.ceil(bottom + pad + (window.pageYOffset || 0));
  }

  function postHeight() {
    heightQueued = false;
    var h = contentHeight();
    if (!h || Math.abs(h - lastHeight) < 2) return;
    lastHeight = h;
    SITE_ORIGINS.forEach(function (origin) {
      try { window.parent.postMessage({ type: HEIGHT_MSG, height: h }, origin); } catch (e) {}
    });
  }

  function queueHeight() {
    if (heightQueued) return;
    heightQueued = true;
    // setTimeout, а не requestAnimationFrame: rAF не срабатывает во фоновых вкладках
    setTimeout(postHeight, 60);
  }

  function watchHeight() {
    if (window.parent === window) return; // открыт не во фрейме
    document.documentElement.classList.add('mw-in-frame');
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(queueHeight);
      var observeChildren = function () {
        for (var i = 0; i < document.body.children.length; i++) ro.observe(document.body.children[i]);
      };
      observeChildren();
      // Экраны тренажёров показываются и прячутся — следим и за новыми блоками
      if (window.MutationObserver) {
        new MutationObserver(function () { observeChildren(); queueHeight(); })
          .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
      }
    }
    window.addEventListener('load', queueHeight);
    window.addEventListener('resize', queueHeight);
    queueHeight();
  }

  // ===== Показать элемент на экране =====
  // Например, абакус перед показом числа: если он не виден целиком, его надо
  // прокрутить в центр экрана. Во фрейме прокручивать может только страница сайта —
  // отправляем ей 'mw-trainer:reveal' с положением элемента внутри тренажёра.
  var REVEAL_MSG = 'mw-trainer:reveal';

  function reveal(el) {
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    if (window.parent === window) {
      // Тренажёр открыт сам по себе — прокручиваем свою страницу
      if (r.top < 0 || r.bottom > window.innerHeight) {
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
      }
      return;
    }
    var top = Math.round(r.top + (window.pageYOffset || 0));
    var height = Math.round(r.height);
    SITE_ORIGINS.forEach(function (origin) {
      try { window.parent.postMessage({ type: REVEAL_MSG, top: top, height: height }, origin); } catch (e) {}
    });
  }

  var api = {
    version: '1.2.0',
    init: init,
    setLang: function (code) { setLang(code); },
    /** Текущий язык в кодировке тренажёра */
    getLang: function () { return forTrainer(state.lang); },
    /** Текущий язык в стандарте (uk/en/ru/es) */
    getLangStd: function () { return state.lang; },
    pick: function (value) { return pick(value, state.lang); },
    reveal: reveal
  };

  // Язык <html> ставим сразу, ещё до init, чтобы не мигал неверный lang
  try { document.documentElement.lang = detectLang(); } catch (e) {}

  window.MWShell = api;
})();
