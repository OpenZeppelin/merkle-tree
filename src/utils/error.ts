export function error(message?: string, opts?: ErrorOptions): never {
  throw new Error(message, opts);
}
