# Полевой помощник наладчика ПЛК

Офлайн-первое PWA-приложение для наладчика ПЛК: журнал неисправностей,
таблица I/O с импортом CSV и экспортом протокола в PDF, инженерные
калькуляторы, офлайн-справочник по пяти томам курса «ПЛК от новичка до
профи». Работает без интернета, все данные — в IndexedDB на устройстве.

Это MVP этапа 1 из ТЗ: модули 1 (журнал), 2 (I/O), 4 (калькуляторы),
7 (справочник). Модули 3/5/6 (punch list, паспорт оборудования, реестр
версий) и 8 (мастер диагностики) — следующие этапы.

## Стек

Vite + React + TypeScript + Tailwind CSS, Dexie.js (IndexedDB),
react-router-dom, fuse.js (поиск), papaparse (CSV), jsPDF (PDF),
vite-plugin-pwa (офлайн-кэш).

## Разработка

```bash
npm install
npm run dev        # локальный сервер с горячей перезагрузкой
npm run build       # продакшн-сборка в dist/
npx tsc --noEmit      # проверка типов
```

## Справочник (модуль 7)

Исходники пяти томов лежат в `tomes/*.html` (не редактируются руками —
это те же файлы, из которых собираются PDF-книги отдельным инструментом).
Скрипт разбирает их в JSON:

```bash
node scripts/build-reference.mjs
```

Результат — `src/reference-data/*.json`, коммитится в репозиторий (не
генерируется на лету в браузере). Перезапускай скрипт и коммить заново,
если тома обновятся.

## Калькуляторы (модуль 4)

Вся числовая логика — чистые функции в
`src/modules/calculators/formulas.ts`, без React/DOM. Проверяются
отдельным скриптом на известных примерах до того, как попадают в UI:

```bash
node --experimental-strip-types scripts/verify-formulas.mjs
```

При изменении формул — сначала правь и гоняй этот скрипт, потом
переноси в компонент.

## Структура

```
src/
  db/schema.ts          # Dexie: таблицы и версии
  lib/                    # search.ts (Fuse), csv.ts, pdf.ts — общие утилиты
  modules/
    calculators/            # модуль 4
    faultlog/                 # модуль 1
    io-table/                   # модуль 2
    reference/                    # модуль 7
  reference-data/                  # сгенерированный JSON из tomes/
scripts/
  build-reference.mjs               # tomes/*.html -> reference-data/*.json
  verify-formulas.mjs                 # проверка калькуляторов
tomes/                                  # исходные HTML-тома + style_v2.css
```
