// Diagnostic labels only: never log tokens, user IDs, note IDs or content.
const OPERATIONS = new Set(['note_item_get', 'note_list_get', 'note_create']);
const STATUSES = new Set([200, 201, 400, 403, 404, 409, 502]);
export function traceStage8Access(identity, operation, status, emit = console.info) {
  if (identity?.kind !== 'judge' || !['a', 'b'].includes(identity.identity)
      || !OPERATIONS.has(operation) || !STATUSES.has(status)) return false;
  try {
    emit('S08_JUDGE_ACCESS', JSON.stringify({ actor: identity.identity, operation, status }));
    return true;
  } catch { return false; }
}
