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
  createdAt: string; // Should be a server timestamp, but string for client
  updatedAt: string; // Should be a server timestamp, but string for client
  techLeadComment?: string;
  // Denormalized fields for easy display
  userName?: string;
  userEmail?: string;
  departmentName?: string;
}
