export function revert(message?: string | undefined, opts?: ErrorOptions | undefined): never {
  throw new Error(message, opts);
}
