export function restoreWorkshop(saved) {
  return Object.fromEntries(
    ['mappings', 'nominations', 'dependencies', 'activities', 'references',
      'claims', 'requests', 'offers', 'assumptions', 'evidence', 'toolbenchNodes', 'toolbenchWires']
      .map(key => [key, Array.isArray(saved[key]) ? saved[key] : []])
  );
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function scopedActivities(modeler) {
  return modeler.get('elementRegistry').filter(element =>
    !element.labelTarget && element.id === element.businessObject?.id &&
    element.businessObject?.$instanceOf('bpmn:Activity')
  ).map(element => ({
    id: element.id,
    name: element.businessObject.name || element.id
  }));
}

export function activityLinkWarning(id, activities) {
  return id && !activities.some(activity => activity.id === id)
    ? 'Linked scoped activity is missing. Check the workshop diagram or relink this record.'
    : '';
}
