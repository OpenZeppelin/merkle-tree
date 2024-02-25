export function throwError(message?: string): never {
  throw new Error(message);
}

export class InvariantError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

export class InvalidArgumentError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

export function validateArgument(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new InvalidArgumentError(message);
  }
}

export function invariant(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}
