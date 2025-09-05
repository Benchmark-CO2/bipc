import { cn } from '@/lib/utils';
import { Link as _Link, LinkComponentProps } from "@tanstack/react-router";

export const Link = (props: LinkComponentProps) => {
  return <_Link {...props} className={cn('flex items-center gap-2 justify-start hover:opacity-80 w-full bg-transparent!', props.className)} />;
};