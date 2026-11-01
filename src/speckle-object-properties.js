export function objectPropertyTables(rows) {
  const objects = [], paths = [], eav = [], pathIds = new Map();
  function addValue(index, path, value) {
    if (!pathIds.has(path)) {
      if (paths.length >= 100000) throw new Error('The object graph exceeds the 100,000 property-path limit.');
      pathIds.set(path, paths.length);
      paths.push({ path_index: paths.length, path });
    }
    if (eav.length >= 2000000) throw new Error('The object graph exceeds the 2,000,000 property-value limit.');
    eav.push({ object_index: index, path_index: pathIds.get(path), value_string: value });
  }
  function strings(value, path, values, depth = 0) {
    if (depth > 100) throw new Error('Object properties exceed the supported nesting depth.');
    if (typeof value === 'string') { values.push([path, value]); return; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    if (value.speckle_type === 'reference' || typeof value.referencedId === 'string') {
      throw new Error('This object graph has detached property dictionaries. Their classification cannot be read completely yet; no count was produced.');
    }
    for (const [key, child] of Object.entries(value)) strings(child, `${path}.${key}`, values, depth + 1);
  }
  for (const [index, row] of rows.entries()) {
    if (typeof row?.id !== 'string' || !row.id || !row.data || typeof row.data !== 'object' || Array.isArray(row.data)) {
      throw new Error('Speckle returned an object without readable property data.');
    }
    const values = [];
    for (const key of ['properties', 'Attributes', 'attributes', 'type', 'GlobalId']) {
      strings(row.data[key], key, values);
    }
    if (row.data['@properties']) strings(row.data['@properties'], 'properties', values);
    const globalId = values.find(([path]) => /(^|\.)GlobalId$/.test(path) && !/element type attributes/i.test(path))?.[1];
    const identity = [row.applicationId, row.data.applicationId, globalId].find(value => typeof value === 'string' && value.trim());
    if (!identity && values.some(([path, value]) => /^Ifc[A-Za-z0-9]+$/.test(value) && !/element type attributes/i.test(path))) {
      throw new Error('An IFC-classified object has no retained application ID or instance GlobalId. It cannot be counted reliably.');
    }
    // Non-element graph objects still participate in classification coverage, never in a guessed IFC count.
    objects.push({ object_index: index, application_id: identity || `speckle-object:${row.id}` });
    for (const [path, value] of values) addValue(index, path, value);
  }
  return { objects, paths, eav };
}
