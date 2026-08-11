export function getReaderSpread(page: number, totalPages: number): number[] {
  if (page <= 1) return [1];
  const leftPage = page % 2 === 0 ? page : page - 1;
  return leftPage < totalPages ? [leftPage, leftPage + 1] : [leftPage];
}
