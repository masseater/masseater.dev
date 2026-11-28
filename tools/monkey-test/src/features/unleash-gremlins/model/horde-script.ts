export type Horde = Readonly<{ seed: number; actions: number }>;

const DELAY_MILLISECONDS = 8;

export const hordeScript = ({ seed, actions }: Horde): string => `
(async () => {
  const horde = gremlins.createHorde({
    randomizer: new gremlins.Chance(${String(seed)}),
    species: [
      gremlins.species.clicker(),
      gremlins.species.formFiller(),
      gremlins.species.scroller(),
      gremlins.species.typer(),
    ],
    mogwais: [],
    strategies: [gremlins.strategies.distribution({ delay: ${String(DELAY_MILLISECONDS)} })],
  });
  await horde.unleash({ nb: ${String(actions)} });
})()
`;
