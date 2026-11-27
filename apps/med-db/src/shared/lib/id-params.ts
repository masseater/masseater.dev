export const idParams = {
  parse: ({ id }: Readonly<{ id: string }>): Readonly<{ id: number }> => ({ id: Number(id) }),
  stringify: ({ id }: Readonly<{ id: number }>): Readonly<{ id: string }> => ({
    id: id.toString(),
  }),
};
