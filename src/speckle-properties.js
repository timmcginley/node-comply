import { parquetMetadata, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

const tables = {
  objects: { columns: ['object_index', 'application_id'], maxRows: 100000 },
  paths: { columns: ['path_index', 'path'], maxRows: 100000 },
  eav: { columns: ['object_index', 'path_index', 'value_string'], maxRows: 2000000 }
};
const maxFileBytes = 32 * 1024 * 1024;

async function readFile(response) {
  if (Number(response.headers.get('content-length')) > maxFileBytes) {
    throw new Error('The property file exceeds the 32 MiB browser limit.');
  }
  if (!response.body) throw new Error('Speckle returned no property file.');
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxFileBytes) {
      await reader.cancel();
      throw new Error('The property file exceeds the 32 MiB browser limit.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes.buffer;
}

export async function readPropertyTables(files, fetcher, checkConnection) {
  if (!Array.isArray(files)) throw new Error('Speckle returned no bundle file listing.');
  const selected = Object.entries(tables).map(([name, table]) => {
    const matches = files.filter(file => typeof file?.name === 'string' && file.name.endsWith(`.eav.${name}.parquet`));
    if (matches.length !== 1) throw new Error(`The bundle must contain exactly one ${name} property table.`);
    const file = matches[0];
    const url = new URL(file.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Speckle returned an invalid property download URL.');
    return { name, table, url: url.href };
  });
  const results = await Promise.all(selected.map(async ({ name, table, url }) => {
    checkConnection();
    // Presigned file URLs have their own authorization; never forward the Speckle token.
    const response = await fetcher(url, {
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(60000)
    });
    checkConnection();
    if (!response.ok) throw new Error(`Unable to download ${name} properties (${response.status}). Read the model again to renew file links.`);
    const file = await readFile(response);
    checkConnection();
    const metadata = parquetMetadata(file);
    const rowCount = Number(metadata.num_rows);
    if (!Number.isSafeInteger(rowCount) || rowCount < 0 || rowCount > table.maxRows) {
      throw new Error(`The ${name} table exceeds the browser limit (${table.maxRows} rows).`);
    }
    if (!table.columns.every(column => metadata.schema.some(field => field.name === column))) {
      throw new Error(`The ${name} table is missing required Speckle property columns.`);
    }
    const rows = await parquetReadObjects({ file, metadata, columns: table.columns, compressors });
    checkConnection();
    if (rows.length !== rowCount) throw new Error(`The ${name} property table was not read completely.`);
    return [name, rows];
  }));
  return Object.fromEntries(results);
}
