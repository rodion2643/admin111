# Админка KWT → репозиторий admin111

## Два разных репозитория на GitHub

| Что | Папка на компе | GitHub репозиторий | Ссылка |
|-----|----------------|-------------------|--------|
| **Сайт магазина** | `C:\Users\PODPIVAS\Projects\kwt-service\` | kwt-service1 | https://rodion2643.github.io/kwt-service1/ |
| **Админка** | `C:\Users\PODPIVAS\Projects\kwt-service\admin\` | admin111 | https://rodion2643.github.io/admin111/ |

Админка — **отдельный** сайт, не папка внутри kwt-service1.

## Что заливать в admin111

Скопируй **все файлы из папки admin/** в корень репозитория admin111:

- index.html
- admin.js
- admin.css
- config.js
- setup.html
- apps-script/ (для Google)

## Как работает связь

- `config.js` — URL Google API и ссылка на сайт
- `data.js` подгружается с сайта: kwt-service1/js/data.js (каталог 33+1 объявлений)
- Кнопка «На сайт» → https://rodion2643.github.io/kwt-service1/

После загрузки: Ctrl+F5 на https://rodion2643.github.io/admin111/
