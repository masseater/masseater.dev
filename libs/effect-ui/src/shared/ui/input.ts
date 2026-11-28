import { Input as KitInput } from "@effect/ui-kit";
import type { InputElement, InputProps } from "@effect/ui-kit";
import { INPUT_CLASS } from "@masseater.dev/ui/input-class";

/** @stability experimental */
export type { InputElement };

/** @stability experimental */
export type InputOptions<Msg> = Readonly<{
  html: { readonly input: InputElement<Msg> };
  props: InputProps;
  onUpdate?: ((event: { readonly value: string }) => NoInfer<Msg> | undefined) | undefined;
}>;

/** @stability experimental */
export const Input = <Msg>({ html, ...options }: InputOptions<Msg>): InputElement<Msg> =>
  KitInput(html, options).class(INPUT_CLASS).attr("data-slot", "input");
