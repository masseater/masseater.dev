import { Button as KitButton } from "@effect/ui-kit";
import { buttonVariants } from "@masseater.dev/ui/button-variants";
import type { VariantProps } from "class-variance-authority";

export type ButtonOptions<Msg> = NonNullable<Parameters<typeof KitButton<Msg>>[1]>;

export const Button = <Msg>(
  h: Parameters<typeof KitButton<Msg>>[0],
  { variant, size, ...options }: ButtonOptions<Msg> & Readonly<VariantProps<typeof buttonVariants>>,
): ReturnType<typeof KitButton<Msg>> =>
  KitButton(h, options).class(buttonVariants({ variant, size }));
