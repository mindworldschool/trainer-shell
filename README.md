# trainer-shell

Общая оболочка **публичных** тренажёров MindWorld School (`mindworldschool.github.io/<name>/`).
Кабинетные `Cabinet-*` её не используют.

Адрес: `https://mindworldschool.github.io/trainer-shell/`

## Подключение

Все публичные тренажёры живут на одном origin, поэтому путь от корня:

```html
<link rel="stylesheet" href="/trainer-shell/shell.v1.css">
<script src="/trainer-shell/shell.v1.js"></script>
...
<body>
  <div id="mw-header"></div>
  ...
  <script>
    MWShell.init({
      title: 'Memory Match',
      tagline: { uk: '…', en: '…', ru: '…', es: '…' },
      docTitle: { uk: 'Memory Match — MindWorld School', en: '…', ru: '…', es: '…' },
      ukrainianCode: 'ua',            // если тренажёр зовёт украинский "ua"
      onLangChange: function (lang) { // вызывается при старте и при смене языка
        currentLang = lang; applyTranslations();
      }
    });
  </script>
</body>
```

## Что даёт

- шапка как в эталоне (Schulte Table): лого, название (Baloo 2), подзаголовок, кнопки UA / EN / RU / ES;
- язык: `?lang=` → `localStorage.mws_lang` (общий для всех тренажёров) → язык браузера → украинский; принимает `ua` и `uk`;
- `<html lang>` = `uk` / `en` / `ru` / `es`, перевод `document.title`;
- CSS-переменные бренда (`--primary #ff7c00`, `--bg-light #fdfcf5`, `--radius 16px`), Montserrat, классы `.screen`, `.btn`, `.btn--primary|secondary|large|exit`;
- телефон: брейкпоинт 600 px, шапка переносится, подзаголовок скрыт, без прокрутки вбок.

Стили действуют только внутри `body.mw-shell` (класс ставит `init`).

## Версии

`shell.v1.*` — только совместимые правки (исправления, новые классы). Всё, что меняет внешний вид
или API, выходит новым файлом `shell.v2.*`; тренажёры переводятся на него по одному.

`index.html` — демо-страница для визуальной проверки.
