export interface AuthResponse {
  token: string;
  userId: number;
  fullName: string;
  phone: string;
  roles: string[];
}
