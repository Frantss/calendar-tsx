/**
 * Use override when key is present (including undefined); otherwise use default.
 * Enables explicit overrides like `{ user: undefined }` to take precedence over defaults.
 */
export const tests_withDefault = <T extends object, K extends keyof T>(
  overrides: Partial<T>,
  key: K,
  defaultValue: T[K],
): T[K] => (key in overrides ? overrides[key] : defaultValue) as T[K];
