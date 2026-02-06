import { useQuery } from "@tanstack/react-query";
import { teamService } from "~/services/team.service";
import { queryKeys } from "~/lib/query-client";
import { useIsQueryEnabled } from "./useIsQueryEnabled";

/**
 * Hook to fetch all team members (users in the tenant)
 */
export function useTeamMembers() {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: teamService.getMembers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
