export function normalizeContrast(
  contrast: string[] | string | null | undefined
): string[] {
  if (Array.isArray(contrast)) {
    return contrast;
  }
  if (typeof contrast === 'string') {
    return [contrast];
  }
  return [];
}
