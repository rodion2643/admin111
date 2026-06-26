# Админка KWT — куда что заливать

## Два отдельных сайта

| Что | Папка на компьютере | GitHub репозиторий | Сайт |
|-----|---------------------|-------------------|------|
| **Магазин** | `C:\Users\PODPIVAS\Projects\kwt-service\` (всё **кроме** папки `admin\`) | [kwt_service](https://github.com/rodion2643/kwt_service) | https://rodion2643.github.io/kwt_service/ |
| **Админка** | `C:\Users\PODPIVAS\Projects\kwt-service\admin\` | [admin111](https://github.com/rodion2643/admin111) | https://rodion2643.github.io/admin111/ |

Админка **не лежит** внутри сайта — это отдельный репозиторий.

## Как всё связано

```
admin111 (форма)  ──POST──►  Google Apps Script  ──►  Google Таблица + Drive
                                    ▲
kwt_service (сайт)  ──GET───  тот же URL (apiUrl в listings-config.js)
```

- **apiUrl** один и тот же в `admin/config.js` и `js/listings-config.js`
- Объявления с сайта (`data.js`) + новые из Google объединяются на сайте и в админке
- «Снять» пишет id в лист `hidden` в таблице

## Почему не работает публикация / удаление

Почти всегда: **в Google Apps Script старый код или не сделано новое развёртывание.**

Сохранить код (Ctrl+S) **недостаточно** — нужно **Развернуть → Новое развёртывание**.

### Настройка Google (один раз)

1. [sheets.new](https://sheets.new) → **Расширения → Apps Script**
2. Удалить весь старый код → вставить **`apps-script/Code.gs`**
3. Запустить **`upgradeOnce`** → журнал: `OK: setupOnce`
4. Запустить **`setPasswordOnce`** → журнал: `OK: password saved`
5. **Развернуть → Новое развёртывание**
   - Тип: **Веб-приложение**
   - Выполнять от имени: **Я**
   - Доступ: **Все**
6. Скопировать URL `/exec` в `config.js` и `../js/listings-config.js` (если изменился)

### Проверка

Открой в браузере (подставь свой URL):

```
https://script.google.com/macros/s/ВАШ_ID/exec?action=ping
```

Должно быть:

```json
{"ok":true,"version":3,"features":["list","add","update","remove",...]}
```

Если другой ответ или ошибка — скрипт не обновлён.

### Пароль админки

Задаётся в Google функцией `setPasswordOnce()` (сейчас в Code.gs).

## Что заливать на GitHub

**admin111** — только файлы из папки `admin/`:
- `index.html`, `admin.js`, `admin.css`, `config.js`

**kwt_service** — всё из корня проекта, **без** папки `admin/`.

После заливки: **Ctrl+F5** на обоих сайтах.
