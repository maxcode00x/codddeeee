export interface WizardOption {
  label: string;
  next: string;
}

export interface WizardQuestion {
  type: 'question';
  id: string;
  text: string;
  options: WizardOption[];
}

export interface WizardConclusion {
  type: 'conclusion';
  id: string;
  diagnosis: string;
  recommendation: string;
  prefill: { symptom: string; cause: string; fix: string };
}

export type WizardNode = WizardQuestion | WizardConclusion;

export interface WizardBranch {
  id: string;
  label: string;
  startId: string;
}

export const FORCE_REMINDER =
  'Проверь, не остался ли где-то Force — забытое принудительное значение выглядит как мистика и ищется часами.';

export const BRANCHES: WizardBranch[] = [
  { id: 'network', label: 'Станция сети недоступна', startId: 'net-q1' },
  { id: 'input', label: 'Один вход не работает', startId: 'in-q1' },
  { id: 'stop', label: 'CPU в STOP', startId: 'stop-q1' },
  { id: 'dead', label: 'Всё встало без сообщений', startId: 'dead-q1' },
  { id: 'flaky', label: 'Работает через раз', startId: 'flaky-q1' },
];

const NODES: Record<string, WizardNode> = {
  // Ветка 1: станция сети недоступна
  'net-q1': {
    type: 'question',
    id: 'net-q1',
    text: 'Что показывает светодиод BF (Bus Fault) на самой станции?',
    options: [
      { label: 'Мигает', next: 'net-q2a' },
      { label: 'Горит постоянно', next: 'net-c-full' },
      { label: 'Не горит, но станция всё равно недоступна', next: 'net-q2c' },
    ],
  },
  'net-q2a': {
    type: 'question',
    id: 'net-q2a',
    text: 'Кабель и разъём M12/RJ45 целы и обжаты корректно?',
    options: [
      { label: 'Да, всё цело', next: 'net-q3a' },
      { label: 'Нашёл повреждение', next: 'net-c-cable' },
    ],
  },
  'net-q3a': {
    type: 'question',
    id: 'net-q3a',
    text: 'Адрес станции (PROFIBUS) или имя устройства (PROFINET) в диагностическом буфере CPU совпадает с проектом?',
    options: [
      { label: 'Совпадает', next: 'net-c-topology' },
      { label: 'Не совпадает', next: 'net-c-address' },
    ],
  },
  'net-q2c': {
    type: 'question',
    id: 'net-q2c',
    text: 'В диагностическом буфере CPU (Online & Diagnostics) есть событие о потере станции?',
    options: [
      { label: 'Да, вижу таймаут соединения', next: 'net-c-timeout' },
      { label: 'Нет никаких событий', next: 'net-c-power' },
    ],
  },
  'net-c-full': {
    type: 'conclusion',
    id: 'net-c-full',
    diagnosis: 'BF горит постоянно — полный обрыв шины/сегмента.',
    recommendation:
      'Для PROFIBUS: проверь терминаторы на обоих концах сегмента (должно быть ровно два, включены). Для PROFINET: проверь порт коммутатора и питание самого свитча.',
    prefill: {
      symptom: 'Станция сети недоступна, BF горит постоянно',
      cause: 'Обрыв сегмента шины (не хватает/не включён терминатор либо мёртв порт коммутатора)',
      fix: 'Проверены и восстановлены терминаторы / заменён порт коммутатора',
    },
  },
  'net-c-cable': {
    type: 'conclusion',
    id: 'net-c-cable',
    diagnosis: 'Физическое повреждение кабеля или разъёма.',
    recommendation: 'Замени повреждённый участок кабеля или переобожми разъём M12/RJ45, проверь обжимку по цветовой схеме.',
    prefill: {
      symptom: 'Станция сети недоступна, BF мигает',
      cause: 'Повреждён кабель или разъём линии связи',
      fix: 'Кабель/разъём заменён, связь восстановлена',
    },
  },
  'net-c-topology': {
    type: 'conclusion',
    id: 'net-c-topology',
    diagnosis: 'Адресация верна — вероятна проблема топологии.',
    recommendation:
      'Проверь длину сегмента относительно скорости (PROFIBUS) или назначенные порты в топологии проекта (PROFINET), а также сам коммутатор.',
    prefill: {
      symptom: 'Станция сети недоступна, BF мигает, адрес верный',
      cause: 'Нарушение топологии сети (длина сегмента / неверный порт коммутатора)',
      fix: 'Топология сети исправлена по проекту',
    },
  },
  'net-c-address': {
    type: 'conclusion',
    id: 'net-c-address',
    diagnosis: 'Несовпадение адреса/имени устройства с проектом.',
    recommendation:
      'Исправь адрес станции (PROFIBUS) или PROFINET device name через инструмент назначения имён/адресов, сверь с проектом в TIA Portal.',
    prefill: {
      symptom: 'Станция сети недоступна, адрес/имя не совпадает с проектом',
      cause: 'Неверный сетевой адрес или PROFINET-имя устройства',
      fix: 'Адрес/имя устройства переназначены в соответствии с проектом',
    },
  },
  'net-c-timeout': {
    type: 'conclusion',
    id: 'net-c-timeout',
    diagnosis: 'Событие таймаута — плавающая связь, а не полный обрыв.',
    recommendation: 'Проверь экранирование и трассу кабеля относительно источников помех (частотники, силовые кабели), длину сегмента.',
    prefill: {
      symptom: 'Станция сети недоступна периодически, в буфере — таймауты',
      cause: 'Помехи на линии связи или превышена длина сегмента',
      fix: 'Улучшено экранирование/трасса кабеля, связь стабильна',
    },
  },
  'net-c-power': {
    type: 'conclusion',
    id: 'net-c-power',
    diagnosis: 'Событий в буфере нет — вероятно, станция не запитана.',
    recommendation: 'Проверь питание 24В непосредственно на самой станции и предохранитель в цепи её питания.',
    prefill: {
      symptom: 'Станция сети недоступна, событий в диагностическом буфере нет',
      cause: 'Отсутствует питание 24В на станции',
      fix: 'Питание станции восстановлено (предохранитель/кабель)',
    },
  },

  // Ветка 2: один вход не работает
  'in-q1': {
    type: 'question',
    id: 'in-q1',
    text: 'Мультиметром на клеммах входа: сигнал меняется при срабатывании датчика (0В/24В как ожидается)?',
    options: [
      { label: 'Меняется корректно', next: 'in-q2a' },
      { label: 'Не меняется', next: 'in-q2b' },
    ],
  },
  'in-q2a': {
    type: 'question',
    id: 'in-q2a',
    text: 'Светодиод канала на самом модуле I/O загорается при срабатывании?',
    options: [
      { label: 'Да, горит', next: 'in-c-program' },
      { label: 'Нет, не горит', next: 'in-c-module' },
    ],
  },
  'in-q2b': {
    type: 'question',
    id: 'in-q2b',
    text: 'Проверь тип датчика (PNP/NPN) и питание на нём: 24В между + и − присутствует?',
    options: [
      { label: 'Питания нет', next: 'in-c-supply' },
      { label: 'Питание есть, а сигнала с датчика нет', next: 'in-c-sensor' },
    ],
  },
  'in-c-program': {
    type: 'conclusion',
    id: 'in-c-program',
    diagnosis: 'Физически сигнал доходит до модуля — проблема в программе.',
    recommendation: 'Проверь адресацию тега и его маппинг на физический канал. И обязательно проверь, не висит ли на этом теге Force.',
    prefill: {
      symptom: 'Один вход не отрабатывает, хотя сигнал на клемме и светодиод канала в норме',
      cause: 'Неверная адресация тега или забытый Force на входе',
      fix: 'Исправлена адресация тега / снят Force',
    },
  },
  'in-c-module': {
    type: 'conclusion',
    id: 'in-c-module',
    diagnosis: 'Сигнал есть на клемме, но канал модуля не реагирует.',
    recommendation:
      'Вероятен отказ канала (предохранитель канала или сам модуль). Переставь провод на соседний свободный канал того же типа для проверки.',
    prefill: {
      symptom: 'Один вход не работает, сигнал на клемме есть, светодиод канала не горит',
      cause: 'Неисправен канал модуля ввода',
      fix: 'Провод переставлен на исправный канал / модуль заменён',
    },
  },
  'in-c-supply': {
    type: 'conclusion',
    id: 'in-c-supply',
    diagnosis: 'Нет питания на датчике.',
    recommendation: 'Проверь предохранитель, кабель и разъём в цепи питания датчика.',
    prefill: {
      symptom: 'Один вход не работает, на датчике нет питания 24В',
      cause: 'Обрыв в цепи питания датчика',
      fix: 'Восстановлено питание датчика (предохранитель/кабель/разъём)',
    },
  },
  'in-c-sensor': {
    type: 'conclusion',
    id: 'in-c-sensor',
    diagnosis: 'Питание на датчике есть, а сигнала нет.',
    recommendation:
      'Сам датчик неисправен либо неверно подключена полярность PNP/NPN. Сверь распиновку M12 в справочнике.',
    prefill: {
      symptom: 'Один вход не работает, датчик запитан, но сигнала не даёт',
      cause: 'Неисправен датчик или перепутана полярность PNP/NPN',
      fix: 'Датчик заменён / исправлено подключение по распиновке',
    },
  },

  // Ветка 3: CPU в STOP
  'stop-q1': {
    type: 'question',
    id: 'stop-q1',
    text: 'Какая причина остановки указана в диагностическом буфере CPU?',
    options: [
      { label: 'Программная ошибка (деление на 0, выход за границы массива и т.п.)', next: 'stop-c-program' },
      { label: 'Отказ модуля (module/rack fault)', next: 'stop-q2b' },
      { label: 'Ручной STOP (переключатель или из TIA Portal)', next: 'stop-c-manual' },
      { label: 'Не могу понять по буферу', next: 'stop-c-unclear' },
    ],
  },
  'stop-q2b': {
    type: 'question',
    id: 'stop-q2b',
    text: 'Отказавший модуль определился по номеру слота — переставь/переподключи его физически. Помогло?',
    options: [
      { label: 'Да, CPU ушёл в RUN', next: 'stop-c-contact' },
      { label: 'Не помогло', next: 'stop-c-module' },
    ],
  },
  'stop-c-program': {
    type: 'conclusion',
    id: 'stop-c-program',
    diagnosis: 'Программная ошибка выполнения.',
    recommendation: 'Смотри точный номер блока и строку в буфере, исправь логику (например, защита от деления на 0).',
    prefill: {
      symptom: 'CPU перешёл в STOP по программной ошибке',
      cause: 'Ошибка выполнения программы (см. буфер диагностики)',
      fix: 'Логика программы исправлена, CPU переведён в RUN',
    },
  },
  'stop-c-manual': {
    type: 'conclusion',
    id: 'stop-c-manual',
    diagnosis: 'Ручной останов.',
    recommendation: 'Переведи CPU в RUN, но выясни у сменщика/оператора, зачем останавливали.',
    prefill: {
      symptom: 'CPU в STOP, остановлен вручную',
      cause: 'Ручной перевод в STOP',
      fix: 'CPU переведён обратно в RUN',
    },
  },
  'stop-c-unclear': {
    type: 'conclusion',
    id: 'stop-c-unclear',
    diagnosis: 'Причина в буфере неочевидна.',
    recommendation: 'Сфотографируй событие целиком и сверься со справочником кодов событий Siemens — не гадай.',
    prefill: {
      symptom: 'CPU в STOP, причина в буфере неочевидна',
      cause: 'Требуется уточнение по коду события Siemens',
      fix: '',
    },
  },
  'stop-c-contact': {
    type: 'conclusion',
    id: 'stop-c-contact',
    diagnosis: 'Плохой контакт в слотовом разъёме.',
    recommendation: 'Если повторится — модуль или разъём стойки нужно менять, это не разовая случайность.',
    prefill: {
      symptom: 'CPU в STOP из-за отказа модуля, после переподключения заработало',
      cause: 'Плохой контакт модуля в слоте',
      fix: 'Модуль переподключен, контакт восстановлен',
    },
  },
  'stop-c-module': {
    type: 'conclusion',
    id: 'stop-c-module',
    diagnosis: 'Переподключение не помогло — модуль неисправен физически.',
    recommendation: 'Требуется замена модуля. Проверь также, что конфигурация слота в проекте совпадает с реальным железом.',
    prefill: {
      symptom: 'CPU в STOP из-за отказа модуля, переподключение не помогло',
      cause: 'Физическая неисправность модуля',
      fix: 'Модуль заменён',
    },
  },

  // Ветка 4: всё встало без сообщений
  'dead-q1': {
    type: 'question',
    id: 'dead-q1',
    text: 'CPU в RUN (зелёный светодиод RUN горит)?',
    options: [
      { label: 'Да, CPU работает', next: 'dead-q2a' },
      { label: 'Нет, CPU не в RUN', next: 'stop-q1' },
    ],
  },
  'dead-q2a': {
    type: 'question',
    id: 'dead-q2a',
    text: 'Проверь тег общего разрешения (General Enable / Ready) — он в TRUE?',
    options: [
      { label: 'Да, в TRUE', next: 'dead-q3a' },
      { label: 'Нет, в FALSE', next: 'dead-c-enable' },
    ],
  },
  'dead-q3a': {
    type: 'question',
    id: 'dead-q3a',
    text: 'Через онлайн-мониторинг: программа реально выполняется (значения тегов меняются по сканам)?',
    options: [
      { label: 'Нет, монитор как будто застыл', next: 'dead-c-frozen' },
      { label: 'Значения меняются, но выходы физически не реагируют', next: 'dead-c-power' },
    ],
  },
  'dead-c-enable': {
    type: 'conclusion',
    id: 'dead-c-enable',
    diagnosis: 'Общее разрешение снято.',
    recommendation:
      'Ищи, откуда приходит этот тег — чаще всего сработала защита (E-Stop, тепловое реле, датчик двери шкафа). Проверяй цепь безопасности с самого начала.',
    prefill: {
      symptom: 'Всё встало без сообщений, тег общего разрешения в FALSE',
      cause: 'Сработала защита в цепи безопасности (E-Stop/тепловое реле/дверь шкафа)',
      fix: 'Причина срабатывания защиты устранена, разрешение восстановлено',
    },
  },
  'dead-c-frozen': {
    type: 'conclusion',
    id: 'dead-c-frozen',
    diagnosis: 'Монитор не обновляется — либо CPU перегружен, либо потеряна связь с TIA Portal.',
    recommendation: 'Проверь время цикла в диагностике CPU. Если время цикла в норме — проблема не в CPU, а в связи с ноутбуком/панелью.',
    prefill: {
      symptom: 'Всё встало без сообщений, онлайн-монитор не обновляется',
      cause: 'Перегрузка CPU по времени цикла или потеря связи с инструментом мониторинга',
      fix: '',
    },
  },
  'dead-c-power': {
    type: 'conclusion',
    id: 'dead-c-power',
    diagnosis: 'Программа работает, но выходы физически не реагируют — похоже на общий сбой силовой части.',
    recommendation: 'Проверь общий автомат/контактор питания исполнительных механизмов линии, а не одно устройство отдельно.',
    prefill: {
      symptom: 'Всё встало без сообщений, программа работает, но силовая часть не реагирует',
      cause: 'Отключено общее питание исполнительных механизмов (автомат/контактор)',
      fix: 'Общее питание силовой части восстановлено',
    },
  },

  // Ветка 5: работает через раз
  'flaky-q1': {
    type: 'question',
    id: 'flaky-q1',
    text: 'Проблема коррелирует с чем-то физическим — вибрация, температура, время суток, конкретная операция?',
    options: [
      { label: 'Да, есть явная корреляция', next: 'flaky-c-contact' },
      { label: 'Нет закономерности', next: 'flaky-q2b' },
    ],
  },
  'flaky-q2b': {
    type: 'question',
    id: 'flaky-q2b',
    text: 'В диагностическом буфере есть повторяющиеся кратковременные события (микроразрывы связи, watchdog и т.п.)?',
    options: [
      { label: 'Да, есть', next: 'flaky-c-network' },
      { label: 'Нет никаких событий', next: 'flaky-c-force' },
    ],
  },
  'flaky-c-contact': {
    type: 'conclusion',
    id: 'flaky-c-contact',
    diagnosis: 'Корреляция с физическим фактором — похоже на плохой контакт или наводку.',
    recommendation: 'Протяни все клеммы в подозрительной зоне ключом, проверь экранирование и трассу кабеля относительно силовых линий/частотников.',
    prefill: {
      symptom: 'Работает через раз, есть корреляция с физическим фактором',
      cause: 'Плохой контакт или помеха от силового оборудования',
      fix: 'Затянуты клеммы / улучшено экранирование трассы кабеля',
    },
  },
  'flaky-c-network': {
    type: 'conclusion',
    id: 'flaky-c-network',
    diagnosis: 'Плавающая сетевая проблема.',
    recommendation: 'Проверь качество заземления/экрана шины, наличие помех от соседнего оборудования.',
    prefill: {
      symptom: 'Работает через раз, в буфере — повторяющиеся кратковременные сетевые события',
      cause: 'Помехи или плохое заземление/экранирование линии связи',
      fix: 'Заземление/экранирование линии связи исправлено',
    },
  },
  'flaky-c-force': {
    type: 'conclusion',
    id: 'flaky-c-force',
    diagnosis: 'Ничего не фиксируется в буфере.',
    recommendation:
      'Под подозрением Force, который иногда снимают/ставят вручную, либо гонка условий в самой логике программы. Проверь список принудительных значений в первую очередь.',
    prefill: {
      symptom: 'Работает через раз, событий в диагностическом буфере нет',
      cause: 'Force на теге либо гонка условий в логике программы',
      fix: '',
    },
  },
};

export function getNode(id: string): WizardNode {
  const node = NODES[id];
  if (!node) throw new Error(`Неизвестный шаг мастера: ${id}`);
  return node;
}
