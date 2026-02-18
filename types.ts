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

export type ViewMode = 'list' | 'create' | 'edit';

export type UserRole = 'admin' | 'user';
