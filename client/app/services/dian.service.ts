import { api } from '~/lib/api';
import type {
  DianConfig,
  CreateDianConfigDto,
  UpdateDianConfigDto,
  SetDianSoftwareDto,
  SetDianResolutionDto,
  DianDocument,
  DianDocumentWithDetails,
  DianStats,
  SendInvoiceDto,
  SendInvoiceResult,
  CheckDocumentStatusDto,
  CheckDocumentStatusResult,
  PaginatedDianDocuments,
  DianDocumentStatus,
} from '~/types/dian';

const BASE_URL = '/dian';

// Configuration endpoints
export async function getDianConfig(): Promise<DianConfig | null> {
  const response = await api.get<DianConfig>(`${BASE_URL}/config`);
  return response.data;
}

export async function createDianConfig(data: CreateDianConfigDto): Promise<DianConfig> {
  const response = await api.post<DianConfig>(`${BASE_URL}/config`, data);
  return response.data;
}

export async function updateDianConfig(data: UpdateDianConfigDto): Promise<DianConfig> {
  const response = await api.put<DianConfig>(`${BASE_URL}/config`, data);
  return response.data;
}

export async function setSoftwareCredentials(data: SetDianSoftwareDto): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>(`${BASE_URL}/config/software`, data);
  return response.data;
}

export async function setResolution(data: SetDianResolutionDto): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>(`${BASE_URL}/config/resolution`, data);
  return response.data;
}

export async function uploadCertificate(file: File, password: string): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);

  const response = await api.post<{ success: boolean; message: string }>(`${BASE_URL}/config/certificate`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// Document processing endpoints
export async function sendInvoice(data: SendInvoiceDto): Promise<SendInvoiceResult> {
  const response = await api.post<SendInvoiceResult>(`${BASE_URL}/send`, data);
  return response.data;
}

export async function checkDocumentStatus(data: CheckDocumentStatusDto): Promise<CheckDocumentStatusResult> {
  const response = await api.post<CheckDocumentStatusResult>(`${BASE_URL}/check-status`, data);
  return response.data;
}

// Document listing endpoints
export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  status?: DianDocumentStatus;
  fromDate?: string;
  toDate?: string;
}

export async function listDianDocuments(params: ListDocumentsParams = {}): Promise<PaginatedDianDocuments> {
  const response = await api.get<PaginatedDianDocuments>(`${BASE_URL}/documents`, { params });
  return response.data;
}

export async function getDianDocument(id: string): Promise<DianDocumentWithDetails> {
  const response = await api.get<DianDocumentWithDetails>(`${BASE_URL}/documents/${id}`);
  return response.data;
}

export async function downloadDianXml(id: string): Promise<Blob> {
  const response = await api.get(`${BASE_URL}/documents/${id}/xml`, {
    responseType: 'blob',
  });
  return response.data;
}

// Statistics endpoint
export async function getDianStats(): Promise<DianStats> {
  const response = await api.get<DianStats>(`${BASE_URL}/stats`);
  return response.data;
}
