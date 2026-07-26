/**
 * Extracts a human-readable message from an API error. Hand-written HTTPException
 * details are plain strings, but FastAPI's automatic request-validation errors (422)
 * return `detail` as an array of {loc, msg, type} objects instead -- passed directly to
 * Alert.alert/template strings, that stringifies to "[object Object]" with no useful
 * information. This normalizes both shapes (and anything else unexpected) to a string.
 */
export function getErrorMessage(error: any, fallback = 'Something went wrong'): string {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d: any) => (typeof d === 'string' ? d : d?.msg))
      .filter(Boolean);
    return messages.length ? messages.join('; ') : fallback;
  }
  if (typeof detail === 'object' && typeof detail.msg === 'string') return detail.msg;
  return fallback;
}
