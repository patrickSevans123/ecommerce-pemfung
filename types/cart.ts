export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  user: string;
  items: CartItem[];
  _id?: string;
}

export interface CartValidationError {
  productId: string;
  message: string;
}

export interface CartValidationResult {
  valid: boolean;
  errors: CartValidationError[];
}