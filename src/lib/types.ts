export type UserRole = 'Admin' | 'TechLead' | 'User';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarId: string;
  role: UserRole;
  departmentId: string;
}

export interface Department {
  id: string;
  name: string;
}

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
export type RequestType = 'System' | 'Data' | 'Other';

export interface AccessRequest {
  id: string;
  title: string;
  description: string;
  requestType: RequestType;
  status: RequestStatus;
  userId: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  techLeadComment?: string;
}
