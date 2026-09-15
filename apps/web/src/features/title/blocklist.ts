/** Seerr grants blocklist management to administrators and MANAGE_BLOCKLIST users. */
export function canManageBlocklist(permissions: number | undefined): boolean {
  return ((permissions ?? 0) & (2 | 268435456)) !== 0;
}
