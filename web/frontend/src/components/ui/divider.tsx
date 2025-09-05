import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type DividerProps = HTMLAttributes<HTMLDivElement>;
const Divider = (props: DividerProps) => {
  return <div {...props} className={cn("w-full bg-zinc-500/70 h-[2px] rounded-md my-4", props.className)} />;
};

export default Divider;
