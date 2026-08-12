import Dexie, { type EntityTable } from 'dexie';

export type IoType = 'DI' | 'DO' | 'AI' | 'AO';
export type ContactType = 'NO' | 'NC';
export type IoStatus = 'not_checked' | 'checked' | 'defect' | 'fixed';

export interface PlcObject {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface Attachment {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

export interface FaultLog {
  id: string;
  objectId: string | null;
  objectPath: string;
  symptom: string;
  cause: string;
  fix: string;
  downtimeMin: number;
  tags: string[];
  photoIds: string[];
  author: string;
  createdAt: number;
}

export interface IoPoint {
  id: string;
  objectId: string | null;
  address: string;
  tagName: string;
  type: IoType;
  contactType: ContactType | null;
  description: string;
  cable: string;
  cabinet: string;
  status: IoStatus;
  note: string;
  photoId: string | null;
  checkedAt: number | null;
}

const db = new Dexie('plc-field-assistant') as Dexie & {
  objects: EntityTable<PlcObject, 'id'>;
  faultLogs: EntityTable<FaultLog, 'id'>;
  ioPoints: EntityTable<IoPoint, 'id'>;
  attachments: EntityTable<Attachment, 'id'>;
};

// Версия 1 фиксирует все таблицы MVP разом. Новые модули (punch list,
// паспорт оборудования, реестр версий) добавятся в version(2) —
// Dexie мигрирует существующие данные автоматически, ничего не потеряется.
db.version(1).stores({
  objects: 'id, parentId, name',
  faultLogs: 'id, objectId, createdAt',
  ioPoints: 'id, objectId, status, cabinet',
  attachments: 'id',
});

export function newId(): string {
  return crypto.randomUUID();
}

export default db;
