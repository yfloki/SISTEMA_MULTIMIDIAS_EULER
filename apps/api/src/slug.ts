export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(base: string, exists: (slug: string) => boolean): string {
  let slug = base; let n = 2;
  while (exists(slug)) slug = `${base}-${n++}`;
  return slug;
}
