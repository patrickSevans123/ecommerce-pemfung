export type UnaryFn<A, B> = (a: A) => B;

export const pipe = <T>(...fns: Array<UnaryFn<T, T>>): UnaryFn<T, T> => 
  (input: T) => fns.reduce((acc, fn) => fn(acc), input);

export const compose = <T>(...fns: Array<UnaryFn<T, T>>): UnaryFn<T, T> =>
  (input: T) => fns.reduceRight((acc, fn) => fn(acc), input);
