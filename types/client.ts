export interface Client {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  company: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  projectsCount: number;
  avatar?: string;
}