export interface Ingredient {
  id: string;
  name: string;
  weight: string;
}

export type DishCategory = string;

export interface TechnicalCard {
  id: string;
  dishName: string;
  category?: DishCategory;
  ingredients: Ingredient[];
  cookingMethod?: string;
  totalOutput: string;
  imageData: string | null;
  lastUpdated: number;
}

export type ViewMode = 'list' | 'create' | 'edit' | 'admin';

export type UserRole = 'admin' | 'user';
export type ProfileStatus = 'pending' | 'approved' | 'blocked';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  status: ProfileStatus;
  created_at: string;
  metadata?: Record<string, string>;
}
