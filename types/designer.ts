export interface Designer {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  projectsCount: number;
  avatar?: string;
}