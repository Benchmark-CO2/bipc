import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type DividerProps = HTMLAttributes<HTMLDivElement>;
const Divider = (props: DividerProps) => {
  return (
    <div
      {...props}
      className={cn("w-full bg-input h-[2px] rounded-md my-4", props.className)}
    />
  );
};

export default Divider;
