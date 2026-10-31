"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-border !bg-popover !text-popover-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
