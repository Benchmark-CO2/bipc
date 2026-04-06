import { useRef, useState } from "react";
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "@/lib/utils";
import { commonLinks, CUR_USAGE } from "@/utils/commonLinks";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

type CommonLinkKey = keyof typeof commonLinks;

export interface PopoverItem {
  label: string;
  icon: LucideIcon;
  linkKey: CommonLinkKey;
}

interface SidebarHoverPopoverProps {
  trigger: React.ReactNode;
  items: PopoverItem[];
  triggerClassName?: string;
  onItemClick?: () => void;
  isMobile?: boolean;
  side?: "top" | "right" | "bottom" | "left";
}

function PopoverLink({
  item,
  onItemClick,
}: {
  item: PopoverItem;
  onItemClick?: () => void;
}) {
  const urls = commonLinks[item.linkKey];
  const internalUrl = urls.internal;
  const externalUrl = urls.external;
  const Icon = item.icon;

  const className =
    "flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors text-white";

  if (CUR_USAGE === "internal" && internalUrl) {
    return (
      <li>
        <Link to={internalUrl} className={className} onClick={onItemClick}>
          <Icon size={18} />
          <span className="text-sm">{item.label}</span>
        </Link>
      </li>
    );
  }

  if (CUR_USAGE === "external" && externalUrl) {
    return (
      <li>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={onItemClick}
        >
          <Icon size={18} />
          <span className="text-sm">{item.label}</span>
        </a>
      </li>
    );
  }

  return null;
}

function MobileCollapsible({
  trigger,
  items,
  triggerClassName,
  onItemClick,
}: Omit<SidebarHoverPopoverProps, "isMobile">) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        className={cn("w-full", triggerClassName)}
        onClick={() => setExpanded(!expanded)}
      >
        {trigger}
        <ChevronDown
          size={16}
          className={cn(
            "ml-auto transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      <ul
        className={cn(
          "flex flex-col gap-1 pl-4 overflow-hidden transition-all duration-200",
          expanded ? "max-h-96 mt-1 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {items.map((item) => (
          <li key={item.linkKey}>
            <PopoverLink item={item} onItemClick={onItemClick} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SidebarHoverPopover({
  trigger,
  items,
  triggerClassName,
  onItemClick,
  isMobile = false,
  side = "right",
}: SidebarHoverPopoverProps) {
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  if (isMobile) {
    return (
      <MobileCollapsible
        trigger={trigger}
        items={items}
        triggerClassName={triggerClassName}
        onItemClick={onItemClick}
      />
    );
  }

  const handleOpen = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setOpen(true);
  };

  const handleClose = () => {
    closeTimeout.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn("cursor-pointer", triggerClassName)}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          {trigger}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="center"
        sideOffset={16}
        className="bg-sidebar border-0 border-b-[6px] border-b-secondary p-2 w-auto min-w-[200px]"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <PopoverArrow
          className="fill-sidebar"
          width={14}
          height={7}
          style={{ fill: "var(--color-sidebar)" }}
        />
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <PopoverLink
              key={item.linkKey}
              item={item}
              onItemClick={onItemClick}
            />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
