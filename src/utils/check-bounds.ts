import { throwError } from './throw-error';

export function checkBounds(array: unknown[], index: number) {
  if (index < 0 || index >= array.length) {
    throwError('Index out of bounds');
  }
}
