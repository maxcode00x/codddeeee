import Papa from 'papaparse';
import type { IoType, ContactType } from '../db/schema';

export interface ParsedIoRow {
  address: string;
  tagName: string;
  type: IoType;
  contactType: ContactType | null;
  description: string;
  cable: string;
  cabinet: string;
}

export interface CsvImportError {
  row: number;
  message: string;
}

export interface CsvImportResult {
  rows: ParsedIoRow[];
  errors: CsvImportError[];
}

// допускаем разные варианты заголовков (рус/eng), сопоставляем без учёта регистра
const HEADER_ALIASES: Record<keyof ParsedIoRow, string[]> = {
  address: ['адрес', 'address'],
  tagName: ['имя тега', 'тег', 'tag', 'tagname', 'name'],
  type: ['тип', 'type'],
  contactType: ['контакт', 'no/nc', 'contact'],
  description: ['описание', 'description'],
  cable: ['кабель', 'cable'],
  cabinet: ['шкаф', 'cabinet'],
};

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof ParsedIoRow, string>> {
  const map: Partial<Record<keyof ParsedIoRow, string>> = {};
  for (const header of headers) {
    const norm = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof ParsedIoRow, string[]][]) {
      if (aliases.includes(norm)) map[field] = header;
    }
  }
  return map;
}

const VALID_TYPES: IoType[] = ['DI', 'DO', 'AI', 'AO'];

export function parseIoCsv(csvText: string): CsvImportResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const errors: CsvImportError[] = [];
  const headerMap = buildHeaderMap(parsed.meta.fields ?? []);

  if (!headerMap.address || !headerMap.tagName) {
    errors.push({ row: 0, message: 'Не найдены обязательные колонки «Адрес» и «Имя тега» — проверь заголовки таблицы' });
    return { rows: [], errors };
  }

  const rows: ParsedIoRow[] = [];

  parsed.data.forEach((raw, idx) => {
    const rowNum = idx + 2; // +1 заголовок, +1 нумерация с 1
    const address = (raw[headerMap.address!] ?? '').trim();
    const tagName = (raw[headerMap.tagName!] ?? '').trim();
    if (!address && !tagName) return; // пустая строка

    if (!address) { errors.push({ row: rowNum, message: 'Пустой адрес' }); return; }
    if (!tagName) { errors.push({ row: rowNum, message: 'Пустое имя тега' }); return; }

    const rawType = (headerMap.type ? raw[headerMap.type] : '')?.trim().toUpperCase() || 'DI';
    if (!VALID_TYPES.includes(rawType as IoType)) {
      errors.push({ row: rowNum, message: `Неизвестный тип «${rawType}» — ожидается DI/DO/AI/AO` });
      return;
    }

    const rawContact = (headerMap.contactType ? raw[headerMap.contactType] : '')?.trim().toUpperCase();
    let contactType: ContactType | null = null;
    if (rawContact === 'NO' || rawContact === 'NC') contactType = rawContact;
    else if (rawContact) errors.push({ row: rowNum, message: `Непонятный контакт «${rawContact}» — ожидается NO или NC, оставлено пустым` });

    rows.push({
      address,
      tagName,
      type: rawType as IoType,
      contactType,
      description: headerMap.description ? (raw[headerMap.description] ?? '').trim() : '',
      cable: headerMap.cable ? (raw[headerMap.cable] ?? '').trim() : '',
      cabinet: headerMap.cabinet ? (raw[headerMap.cabinet] ?? '').trim() : '',
    });
  });

  return { rows, errors };
}
