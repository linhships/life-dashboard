// Small stable string hash (djb2) used to build ids that survive
// re-renders without depending on array position.
export function hashId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}
