export type Success<A> = { _tag: 'Success'; value: A };
export type Failure<E> = { _tag: 'Failure'; errors: E[] };

export type Validation<E, A> = Success<A> | Failure<E>;

export const success = <E, A>(value: A): Validation<E, A> => ({ _tag: 'Success', value });
export const failure = <E, A = never>(errors: E[] | E): Validation<E, A> => ({
  _tag: 'Failure',
  errors: Array.isArray(errors) ? errors : [errors],
});

export const isSuccess = <E, A>(v: Validation<E, A>): v is Success<A> => v._tag === 'Success';
export const isFailure = <E, A>(v: Validation<E, A>): v is Failure<E> => v._tag === 'Failure';

export const map = <E, A, B>(fa: Validation<E, A>, f: (a: A) => B): Validation<E, B> =>
  isSuccess(fa) ? success(f(fa.value)) : fa;

export const mapErrors = <E, A, F>(fa: Validation<E, A>, f: (errors: E[]) => F[]): Validation<F, A> =>
  isFailure(fa) ? failure<F, A>(f(fa.errors)) : (fa as unknown as Validation<F, A>);

export const ap = <E, A, B>(
  fab: Validation<E, (a: A) => B>,
  fa: Validation<E, A>
): Validation<E, B> => {
  if (isFailure(fab) && isFailure(fa)) return failure<E, B>([...fab.errors, ...fa.errors]);
  if (isFailure(fab)) return fab;
  if (isFailure(fa)) return fa;
  return success<E, B>(fab.value(fa.value));
};

export const of = success;

export const liftA2 = <E, A, B, C>(
  f: (a: A, b: B) => C,
  fa: Validation<E, A>,
  fb: Validation<E, B>
): Validation<E, C> => ap(map(fa, (a) => (b: B) => f(a, b)), fb);

export const sequence = <E, A>(validations: Validation<E, A>[]): Validation<E, A[]> =>
  validations.reduce(
    (acc, validation) => ap(map(acc, (items) => (value: A) => [...items, value]), validation),
    success<E, A[]>([])
  );

export const collect = <E>(validations: Validation<E, unknown>[]): Validation<E, void> =>
  map(sequence(validations), () => undefined);

export const fromPredicate = <E, A>(
  predicate: (a: A) => boolean,
  onError: (a: A) => E
) =>
  (value: A): Validation<E, A> => (predicate(value) ? success(value) : failure(onError(value)));

export const combineFailures = <E>(...failureArrays: E[][]): E[] =>
  failureArrays.reduce<E[]>((acc, errors) => acc.concat(errors), []);
