export interface userType {
  id: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
  avatar?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}
