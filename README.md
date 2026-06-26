# Админка KWT → репозиторий admin111

## Два разных репозитория на GitHub

| Что | Папка на компе | GitHub репозиторий | Ссылка |
|-----|----------------|-------------------|--------|
| **Сайт магазина** | `C:\Users\PODPIVAS\Projects\kwt-service\` | kwt_service | https://rodion2643.github.io/kwt_service/ |
| **Админка** | `C:\Users\PODPIVAS\Projects\kwt-service\admin\` | admin111 | https://rodion2643.github.io/admin111/ |

Админка — **отдельный** сайт, не папка внутри kwt_service.

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
- `data.js` подгружается с сайта: kwt_service/js/data.js (каталог 33+1 объявлений)
- Кнопка «На сайт» → https://rodion2643.github.io/kwt_service/

После загрузки: Ctrl+F5 на https://rodion2643.github.io/admin111/
