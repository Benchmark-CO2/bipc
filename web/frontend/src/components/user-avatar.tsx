import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  name,
  email,
  size = "md",
  className,
}: UserAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  };

  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold",
        sizeClasses[size],
        className
      )}
      title={email || name}
    >
      {initials || <User size={size === "sm" ? 12 : size === "md" ? 16 : 20} />}
    </div>
  );
}
