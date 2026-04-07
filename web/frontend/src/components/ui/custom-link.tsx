import * as React from "react";

import { CUR_USAGE, commonLinks } from "@/utils/commonLinks";
import { Link } from "@tanstack/react-router";

type CommonLinkKey = keyof typeof commonLinks;

interface CustomLinkProps {
  linkKey: CommonLinkKey;
  className?: string;
  onClick?: React.MouseEventHandler;
  children: React.ReactNode;
}

function CustomLink({
  linkKey,
  className,
  onClick,
  children,
}: CustomLinkProps) {
  const urls = commonLinks[linkKey];
  const url = urls[CUR_USAGE];

  if (!url) return null;

  if (CUR_USAGE === "internal") {
    return (
      <Link to={url} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={url}
      target="_self"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

export { CustomLink };
export type { CommonLinkKey };
