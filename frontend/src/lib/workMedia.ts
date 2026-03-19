export const DEFAULT_WORK_COVER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

export function resolveWorkCoverUrl(coverUrl?: string | null): string {
  return hasText(coverUrl) ? coverUrl!.trim() : DEFAULT_WORK_COVER;
}

