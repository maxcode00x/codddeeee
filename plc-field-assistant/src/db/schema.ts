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

export type PunchPriority = 'A' | 'B' | 'C';
export type PunchStatus = 'open' | 'closed';

export interface PunchItem {
  id: string;
  objectId: string | null;
  description: string;
  priority: PunchPriority;
  responsible: string;
  deadline: number | null;
  status: PunchStatus;
  photoIds: string[];
  createdAt: number;
}

export type EquipmentType = 'cpu' | 'io_station' | 'vfd' | 'panel' | 'switch' | 'other';

export interface Equipment {
  id: string;
  objectId: string; // положение в дереве линия -> шкаф -> устройство
  type: EquipmentType;
  article: string;
  serialNumber: string;
  firmware: string;
  profinetName: string;
  profinetIp: string;
  profibusAddress: string;
  keyParams: string;
  backupLocation: string;
  photoIds: string[];
  notes: string;
  createdAt: number;
}

export interface ProjectVersion {
  id: string;
  objectId: string;
  version: string;
  date: number;
  devEnvVersion: string; // "TIA Portal V18", "CODESYS 3.5" и т.п.
  changeDescription: string;
  changedBy: string;
  checksum: string;
  backupLocation: string;
  isInController: boolean;
  createdAt: number;
}

const db = new Dexie('plc-field-assistant') as Dexie & {
  objects: EntityTable<PlcObject, 'id'>;
  faultLogs: EntityTable<FaultLog, 'id'>;
  ioPoints: EntityTable<IoPoint, 'id'>;
  attachments: EntityTable<Attachment, 'id'>;
  punchList: EntityTable<PunchItem, 'id'>;
  equipment: EntityTable<Equipment, 'id'>;
  projectVersions: EntityTable<ProjectVersion, 'id'>;
};

// Версия 1 фиксирует таблицы MVP этапа 1.
db.version(1).stores({
  objects: 'id, parentId, name',
  faultLogs: 'id, objectId, createdAt',
  ioPoints: 'id, objectId, status, cabinet',
  attachments: 'id',
});

// Версия 2 — этап 2: punch list, паспорт оборудования, реестр версий.
// Dexie мигрирует существующие данные автоматически, ничего не теряется.
db.version(2).stores({
  objects: 'id, parentId, name',
  faultLogs: 'id, objectId, createdAt',
  ioPoints: 'id, objectId, status, cabinet',
  attachments: 'id',
  punchList: 'id, objectId, status, priority, deadline',
  equipment: 'id, objectId, article',
  projectVersions: 'id, objectId, date',
});

export function newId(): string {
  return crypto.randomUUID();
}

export default db;
