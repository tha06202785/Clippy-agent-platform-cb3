export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Lead {
  id: string;
  orgId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  stage: string;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  orgId: string;
  address: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  propertyType: string | null;
  status: string;
  createdAt: string;
}

export interface Briefing {
  id: string;
  orgId: string;
  name: string;
  stage: string;
  leadName: string | null;
  targetPrice: number | null;
  createdAt: string;
}
