export interface TrainerTag {
  key: string;
  dir: 'IN' | 'OUT';
  deviceId: string;
  deviceType: string;
  deviceLabel: string;
}

export interface TrainerSnapshot {
  tags: TrainerTag[];
  values: Record<string, boolean>;
  scanRunning: boolean;
}

export interface CodesysConfig {
  endpointUrl: string;
  mappings: Record<string, string>; // tag key -> OPC UA NodeId
}

export interface CodesysStatus {
  connected: boolean;
  endpointUrl: string | null;
}

export interface ElectronCodesysAPI {
  connect(url: string): Promise<CodesysStatus>;
  disconnect(): Promise<CodesysStatus>;
  status(): Promise<CodesysStatus>;
  read(nodeIds: string[]): Promise<Record<string, boolean | null>>;
  write(writes: { nodeId: string; value: boolean }[]): Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: { codesys: ElectronCodesysAPI };
  }
}
