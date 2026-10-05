import { seerrPermissions } from "@/integrations/seerr/permissions";

export function canManageBlocklist(permissions: number | undefined): boolean {
  return ((permissions ?? 0) & (seerrPermissions.admin | seerrPermissions.manageBlocklist)) !== 0;
}
