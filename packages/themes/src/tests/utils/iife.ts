/** Immediately invokes `fn`; used to build a test file's `defaults` in one expression. */
export const iife = <TReturn>(fn: () => TReturn) => fn();
