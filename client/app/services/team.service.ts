import { api } from '~/lib/api';
import type { User } from '~/stores/auth.store';

export interface TeamMember extends User {
  createdAt: string;
}

// Response type from paginated users endpoint
interface UsersResponse {
  data: TeamMember[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const teamService = {
  // Backend returns paginated response, extract the data array
  async getMembers(): Promise<TeamMember[]> {
    const response = await api.get<UsersResponse>('/users?limit=1000');
    return response.data.data;
  },
};
