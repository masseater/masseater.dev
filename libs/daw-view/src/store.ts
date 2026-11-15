export interface Store<State> {
  readonly read: () => State;
  readonly step: (change: (state: State) => State) => void;
}

export interface StoreOptions<State> {
  readonly initial: State;
  readonly onChange: () => void;
}

export const createStore = <State>({ initial, onChange }: StoreOptions<State>): Store<State> => {
  let state = initial;
  return {
    read: () => state,
    step: (change) => {
      state = change(state);
      onChange();
    },
  };
};
