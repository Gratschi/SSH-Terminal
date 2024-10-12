/**
 * Big thanks to Christian Woerz for creating this one of type https://youtu.be/52vHiczZ3Bc
 * https://github.com/typed-rocks/typescript/blob/main/one_of.ts
 */
type MergeTypes<TypesArray extends any[], Res = {}> =
  TypesArray extends [infer Head, ...infer Rem]
    ? MergeTypes<Rem, Res & Head>
    : Res;

type OneOf<
  TypesArray extends any[],
  Res = never,
  AllProperties = MergeTypes<TypesArray>> =
  TypesArray extends [infer Head, ...infer Rem]
    ? OneOf<Rem, Res | OnlyFirst<Head, AllProperties>, AllProperties>
    : Res;
 
type SimpleOneOf<F, S> = OnlyFirst<F, S> | OnlyFirst<S, F>;

type OnlyFirst<F, S> = F & { [Key in keyof Omit<S, keyof F>]?: never };

/**
 * Partial
 * TODO: add them to a repo
 */
type PartialNested<T> = {
  [K in keyof T]?: T[K] extends object ? PartialNested<T[K]> : T[K];
};

type PartialProperty<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type PartialNestedProperty<T, K extends keyof any> = K extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [P in Key]: PartialNestedProperty<T[Key], Rest> } & Omit<T, Key>
    : never
  : Omit<T, K & keyof T> & Partial<Pick<T, K & keyof T>>;

type TerminalPath = {
  id: string;
  ssh: string;
  details: {
    host: {
      name: string;
      port: number;
    };
  };
};


/**
 * Required
 */

// TODO: nested required prop
type RequiredProperty<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Make 'details.host.name' optional
type DefaultTerminal = PartialNestedProperty<TerminalPath, "details.host.name">;

const test: DefaultTerminal = {
  id: "",
  ssh: "",
  details: {
    host: {
      port: 3,
      name: "test" // string | undefined
    }
  }
};

export type {
  OneOf,
  SimpleOneOf,
  PartialNested,
  PartialProperty,
  PartialNestedProperty,
  RequiredProperty,
};