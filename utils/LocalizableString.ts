export type LocalizableString = string | { key: string; args?: Record<string, unknown> };

export function localize(ls: LocalizableString): string {
  if (typeof ls === 'string') return ls;
  const { key, args } = ls;
  const i18n = (globalThis as any).game?.i18n;
  if (args) return i18n?.format?.(key, args) ?? key;
  return i18n?.localize?.(key) ?? key;
}

