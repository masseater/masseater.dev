type RawId = Readonly<{ id: string }>;
type Id = Readonly<{ id: number }>;

const idParams = {
  parse: ({ id }: RawId): Id => ({ id: Number(id) }),
  stringify: ({ id }: Id): RawId => ({ id: id.toString() }),
};

export { idParams };
