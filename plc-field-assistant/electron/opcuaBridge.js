import { OPCUAClient, AttributeIds, DataType, StatusCodes } from 'node-opcua-client';

// Один активный сеанс на приложение — пользователь подключается к одному
// CODESYS-рантайму за раз, этого достаточно для тренажёра/визуализации.
let client = null;
let session = null;
let endpointUrl = null;

export function getStatus() {
  return { connected: !!session, endpointUrl };
}

export async function connect(url) {
  if (session) await disconnect();
  client = OPCUAClient.create({
    endpointMustExist: false,
    connectionStrategy: { maxRetry: 1, initialDelay: 500 },
  });
  await client.connect(url);
  session = await client.createSession();
  endpointUrl = url;
  return getStatus();
}

export async function disconnect() {
  try {
    if (session) await session.close();
  } catch {
    // сеанс уже мог отвалиться сам — не мешаем закрытию
  }
  try {
    if (client) await client.disconnect();
  } catch {
    // соединение уже могло быть разорвано сервером
  }
  session = null;
  client = null;
  endpointUrl = null;
  return getStatus();
}

// пакетное чтение — приводим любой тип значения к boolean, потому что все
// теги тренажёра булевы (см. window.PLC_CODESYS_BRIDGE в index.html)
export async function readMany(nodeIds) {
  if (!session) throw new Error('Нет подключения к OPC UA серверу');
  if (nodeIds.length === 0) return {};
  const results = await session.read(
    nodeIds.map((nodeId) => ({ nodeId, attributeId: AttributeIds.Value }))
  );
  const out = {};
  nodeIds.forEach((nodeId, i) => {
    const dv = results[i];
    out[nodeId] = dv && dv.statusCode.equals(StatusCodes.Good) ? !!dv.value?.value : null;
  });
  return out;
}

export async function writeMany(writes) {
  if (!session) throw new Error('Нет подключения к OPC UA серверу');
  if (writes.length === 0) return;
  await session.write(
    writes.map(({ nodeId, value }) => ({
      nodeId,
      attributeId: AttributeIds.Value,
      value: { value: { dataType: DataType.Boolean, value: !!value } },
    }))
  );
}
