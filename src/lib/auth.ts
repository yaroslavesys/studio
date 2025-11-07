import { getUsers } from './data';
import type { User } from './types';

// In a real app, this would be determined by the user's session.
// For this demo, you can change the ID to test different roles.
// 'user-1' = Admin
// 'user-2' = TechLead (Engineering)
// 'user-3' = User (Engineering)
// 'user-4' = TechLead (Marketing)
// 'user-5' = User (Marketing)
const MOCK_USER_ID = 'user-1';

export async function getCurrentUser(): Promise<User> {
  const users = await getUsers();
  const user = users.find(u => u.id === MOCK_USER_ID);
  if (!user) {
    // Fallback to the first user if the mock ID is invalid
    return users[0];
  }
  return user;
}
