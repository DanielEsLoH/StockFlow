import { api } from "~/lib/api";

export interface Invitation {
  id: string;
  email: string;
  role: string;
  warehouseId: string | null;
  warehouse: { id: string; name: string; code: string } | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  invitedBy: {
    firstName: string;
    lastName: string;
  };
}

export interface CreateInvitationData {
  email: string;
  role?: string;
  warehouseId?: string;
}

export const invitationsService = {
  async getAll(): Promise<Invitation[]> {
    const response = await api.get("/invitations");
    return response.data;
  },

  async create(data: CreateInvitationData): Promise<Invitation> {
    const response = await api.post("/invitations", data);
    return response.data;
  },

  async cancel(id: string): Promise<void> {
    await api.delete(`/invitations/${id}`);
  },

  async resend(id: string): Promise<void> {
    await api.post(`/invitations/${id}/resend`);
  },
};
