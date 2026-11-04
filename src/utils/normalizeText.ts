// Lowercase and strip accents so "cancion" matches "Canción"
export function normalizeText(value: string | undefined | null): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
