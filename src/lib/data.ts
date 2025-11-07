import type { User, Department, AccessRequest, RequestStatus, RequestType, UserRole } from './types';
import { PlaceHolderImages } from './placeholder-images';

// In a real application, this data would be stored in a database.
// For this demo, we use in-memory arrays.

let departments: Department[] = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Marketing' },
  { id: 'dept-3', name: 'Human Resources' },
];

let users: User[] = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex.j@trafficdevils.net',
    avatarId: 'avatar1',
    role: 'Admin',
    departmentId: 'dept-1',
  },
  {
    id: 'user-2',
    name: 'Maria Garcia',
    email: 'maria.g@trafficdevils.net',
    avatarId: 'avatar2',
    role: 'TechLead',
    departmentId: 'dept-1',
  },
  {
    id: 'user-3',
    name: 'Sam Williams',
    email: 'sam.w@trafficdevils.net',
    avatarId: 'avatar3',
    role: 'User',
    departmentId: 'dept-1',
  },
  {
    id: 'user-4',
    name: 'Casey Lee',
    email: 'casey.l@trafficdevils.net',
    avatarId: 'avatar4',
    role: 'TechLead',
    departmentId: 'dept-2',
  },
   {
    id: 'user-5',
    name: 'Jordan Smith',
    email: 'jordan.s@trafficdevils.net',
    avatarId: 'avatar5',
    role: 'User',
    departmentId: 'dept-2',
  },
];

let accessRequests: AccessRequest[] = [
  {
    id: 'req-1',
    title: 'Access to Production Database',
    description: 'Need read-only access to the production database for debugging purposes.',
    requestType: 'Data',
    status: 'Pending',
    userId: 'user-3',
    departmentId: 'dept-1',
    createdAt: '2023-10-26T10:00:00Z',
    updatedAt: '2023-10-26T10:00:00Z',
  },
  {
    id: 'req-2',
    title: 'Admin rights for Staging Server',
    description: 'Requesting admin rights on staging for new feature deployment testing.',
    requestType: 'System',
    status: 'Approved',
    userId: 'user-3',
    departmentId: 'dept-1',
    createdAt: '2023-10-25T14:30:00Z',
    updatedAt: '2023-10-25T16:00:00Z',
  },
  {
    id: 'req-3',
    title: 'Marketing Analytics Tool Access',
    description: 'Need access to our new marketing analytics platform to track campaign performance.',
    requestType: 'Other',
    status: 'Pending',
    userId: 'user-5',
    departmentId: 'dept-2',
    createdAt: '2023-10-27T09:00:00Z',
    updatedAt: '2023-10-27T09:00:00Z',
  },
  {
    id: 'req-4',
    title: 'GitHub Repo "Project-X" write access',
    description: 'I need to push my latest changes for the upcoming release.',
    requestType: 'System',
    status: 'Rejected',
    userId: 'user-3',
    departmentId: 'dept-1',
    createdAt: '2023-10-24T11:00:00Z',
    updatedAt: '2023-10-24T12:30:00Z',
  },
];

// Data access functions
export const getDepartments = async (): Promise<Department[]> => [...departments];
export const getUsers = async (): Promise<User[]> => {
  const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
  return users.map(user => ({
    ...user,
    // @ts-ignore
    avatarUrl: imageMap.get(user.avatarId) || '',
  }))
}
export const getAccessRequests = async (): Promise<AccessRequest[]> => [...accessRequests];

// Data manipulation functions (for use in server actions)
export const addAccessRequest = (data: { title: string; description: string; requestType: RequestType }, userId: string, departmentId: string) => {
  const newRequest: AccessRequest = {
    id: `req-${Date.now()}`,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
    userId,
    departmentId,
  };
  accessRequests.unshift(newRequest);
  return newRequest;
};

export const updateRequestStatus = (id: string, status: RequestStatus) => {
  const request = accessRequests.find((r) => r.id === id);
  if (request) {
    request.status = status;
    request.updatedAt = new Date().toISOString();
  }
  return request;
};

export const deleteRequestById = (id: string) => {
  accessRequests = accessRequests.filter((r) => r.id !== id);
};

export const updateUserRoleInDb = (id: string, role: UserRole) => {
    const user = users.find(u => u.id === id);
    if(user) {
        user.role = role;
    }
    return user;
}
