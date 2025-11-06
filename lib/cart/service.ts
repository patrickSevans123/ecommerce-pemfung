import CartModel from '../db/models/cart';
import type { CartDocument } from '../db/models/cart';
import { CartInput, CartItemInput, CartValidationError } from './types';
import { validateCart, ValidateCartOptions } from './validation';
import { Validation, isFailure, success } from '../fp/validation';

type ObjectIdLike = string | { toString(): string };

export type CartPersistenceItem = {
  product: ObjectIdLike;
  quantity: number;
  addedAt?: Date;
};

export type CartSnapshot = {
  _id?: ObjectIdLike;
  user: ObjectIdLike;
  items?: CartPersistenceItem[];
  createdAt?: Date;
  updatedAt?: Date;
};

const toIdString = (value: ObjectIdLike | null | undefined): string | undefined => {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value.toString();
};

export const cartDocToInput = (doc: CartSnapshot): CartInput => {
  const userId = toIdString(doc.user);
  if (!userId) {
    throw new Error('Cart document missing user identifier');
  }

  const items = (doc.items ?? []).reduce<CartItemInput[]>((acc, item) => {
    const productId = toIdString(item.product);
    if (!productId) {
      return acc;
    }

    acc.push({
      productId,
      quantity: item.quantity,
    });
    return acc;
  }, []);

  return {
    userId,
    items,
  };
};

export const serializeCartSnapshot = (cart: CartSnapshot) => ({
  ...cart,
  _id: toIdString(cart._id),
  user: toIdString(cart.user),
  items: (cart.items ?? []).map((item) => ({
    ...item,
    product: toIdString(item.product),
  })),
});

export const cartInputToDbItems = (items: CartItemInput[], existingItems: CartPersistenceItem[] = []) => {
  const addedAtMap = new Map<string, Date | undefined>();

  for (const item of existingItems) {
    const key = toIdString(item.product);
    if (!key) continue;
    addedAtMap.set(key, item.addedAt);
  }

  return items.map<CartPersistenceItem>((item) => ({
    product: item.productId,
    quantity: item.quantity,
    addedAt: addedAtMap.get(item.productId) ?? new Date(),
  }));
};

export const getOrCreateCart = async (userId: string): Promise<CartDocument> => {
  let cart = await CartModel.findOne({ user: userId }).exec();
  if (!cart) {
    cart = await CartModel.create({ user: userId, items: [] });
  }
  return cart;
};

export const loadCart = async (userId: string): Promise<CartSnapshot> => {
  const cart = await CartModel.findOne({ user: userId }).lean<CartSnapshot>();
  if (cart) {
    return cart;
  }

  const created = await CartModel.create({ user: userId, items: [] });
  return created.toObject() as CartSnapshot;
};

export const validateCartInput = (cart: CartInput, options?: ValidateCartOptions) => validateCart(cart, options);

export const buildCartAfterAdd = (cart: CartInput, payload: { productId: string; quantity: number }) => {
  const existing = cart.items.find((item) => item.productId === payload.productId);
  if (existing) {
    existing.quantity += payload.quantity;
  } else {
    cart.items.push({ productId: payload.productId, quantity: payload.quantity });
  }
  return cart;
};

export const buildCartAfterUpdate = (cart: CartInput, payload: { productId: string; quantity: number }) => {
  const existing = cart.items.find((item) => item.productId === payload.productId);
  if (!existing) {
    cart.items.push({ productId: payload.productId, quantity: payload.quantity });
  } else {
    existing.quantity = payload.quantity;
  }
  return cart;
};

export const buildCartAfterRemove = (cart: CartInput, productId: string) => ({
  ...cart,
  items: cart.items.filter((item) => item.productId !== productId),
});

export const persistCart = async (
  userId: string,
  updatedCart: CartInput,
  existingItems: CartPersistenceItem[] = [],
  options: ValidateCartOptions = {}
): Promise<Validation<CartValidationError, CartInput>> => {
  const validation = await validateCart(updatedCart, options);
  if (isFailure(validation)) return validation;

  await CartModel.updateOne(
    { user: userId },
    {
      $set: {
        items: cartInputToDbItems(updatedCart.items, existingItems),
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return success(updatedCart);
};
