export interface Client {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mobile_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  aadhar_number?: string;
  pan_number?: string;
  company_name: string;
  company_code?: string;
  role: string;
  role_display: string;
  is_active: boolean;
  date_of_birth?: string;
  profile_pic?: string;
  date_of_joining?: string;
  date_of_exit?: string;
  created_at: string;
  updated_at: string;
  projectsCount: number;
}