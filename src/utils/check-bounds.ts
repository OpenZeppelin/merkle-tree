export function checkBounds(array: unknown[], index: number) {
  if (index < 0 || index >= array.length) {
    throw new Error('Index out of bounds');
  }
}
