export function throwError(message?: string, opts?: ErrorOptions): never {
  throw new Error(message, opts);
}
