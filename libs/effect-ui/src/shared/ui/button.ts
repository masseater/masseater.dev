import { Button as KitButton } from "@effect/ui-kit";
import type { ButtonElement, ButtonProps } from "@effect/ui-kit";
import { buttonVariants } from "@masseater.dev/ui/button-variants";
import type { VariantProps } from "class-variance-authority";

/** @stability experimental */
export type ButtonOptions<Msg> = Readonly<{
  html: { readonly button: ButtonElement<Msg> };
  element?: ButtonElement<Msg> | undefined;
  props?: ButtonProps | undefined;
  onPress?: NoInfer<Msg> | undefined;
}> &
  Readonly<VariantProps<typeof buttonVariants>>;

/** @stability experimental */
export const Button = <Msg>({
  html,
  variant,
  size,
  ...options
}: ButtonOptions<Msg>): ButtonElement<Msg> =>
  KitButton(html, options).class(buttonVariants({ variant, size }));
