import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";

const usePickThen = <Picked>({
  pick,
  onPicked,
  pending,
}: Readonly<{
  pick: () => Promise<Option.Option<Picked>>;
  onPicked: (picked: Picked) => void;
  pending: boolean;
}>): Readonly<{ onClick: () => void; busy: boolean }> => {
  const picker = useMutation({
    mutationFn: pick,
    onSuccess: (picked) => {
      if (Option.isSome(picked)) {
        onPicked(picked.value);
      }
    },
  });
  const { mutate } = picker;
  const onClick = useCallback(() => {
    mutate();
  }, [mutate]);
  return { onClick, busy: picker.isPending || pending };
};

export { usePickThen };
