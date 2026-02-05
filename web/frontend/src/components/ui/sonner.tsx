import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isBottom = props.position?.includes("bottom");

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: `group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg overflow-hidden group-[.toaster]:!py-8 group-[.toaster]:!pr-14 !rounded-2xl ${isBottom ? "[&:first-child]:!rounded-b-none" : ""}`,
          description:
            "group-[.toast]:text-gray-600 dark:group-[.toast]:text-gray-300",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:!absolute group-[.toast]:!right-4 group-[.toast]:!top-4 group-[.toast]:!left-auto group-[.toast]:!bg-transparent group-[.toast]:!text-white group-[.toast]:!border-0 hover:group-[.toast]:!bg-transparent",
          success:
            "group-[.toaster]:!bg-primary group-[.toaster]:!text-white group-[.toaster]:!border-primary [&>div]:!text-white [&_[data-description]]:!text-white/90",
          error:
            "group-[.toaster]:!bg-destructive group-[.toaster]:!text-white group-[.toaster]:!border-destructive [&>div]:!text-white [&_[data-description]]:!text-white/90",
          warning:
            "group-[.toaster]:!bg-yellow-500 group-[.toaster]:!text-white group-[.toaster]:!border-yellow-600 [&>div]:!text-white [&_[data-description]]:!text-white/90",
          info: "group-[.toaster]:!bg-blue-500 group-[.toaster]:!text-white group-[.toaster]:!border-blue-600 [&>div]:!text-white [&_[data-description]]:!text-white/90",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          bottom: isBottom ? "0" : undefined,
          borderRadius: isBottom ? "8px 8px 0px 0px" : undefined,
        } as React.CSSProperties
      }
      closeButton
      duration={4000}
      {...props}
    />
  );
};

export { Toaster };
