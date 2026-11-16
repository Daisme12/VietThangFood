export type UserRole = 'admin' | 'manager' | 'staff' | 'kitchen';

export interface CurrentUser {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
}

export interface StandardApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

