import { api } from '~/lib/api';
import type { User } from '~/stores/auth.store';

export interface TeamMember extends User {
  createdAt: string;
}

export const teamService = {
  async getMembers(): Promise<TeamMember[]> {
    const response = await api.get('/users');
    return response.data;
  },
};
