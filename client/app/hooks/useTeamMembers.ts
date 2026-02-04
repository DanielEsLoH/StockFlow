import { useQuery } from "@tanstack/react-query";
import { teamService } from "~/services/team.service";
import { queryKeys } from "~/lib/query-client";

/**
 * Hook to fetch all team members (users in the tenant)
 */
export function useTeamMembers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: teamService.getMembers,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
