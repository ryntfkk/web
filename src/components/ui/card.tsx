import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.ComponentProps<"div"> {
  size?: "default" | "sm";
  withShadow?: boolean;
}

function Card({
  className,
  size = "default",
  withShadow = false,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "flex flex-col overflow-hidden bg-white border border-[#e5e2e1] rounded-[4px]",
        withShadow && "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("px-4 pt-4", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[16px] font-semibold leading-tight text-[#1c1b1b]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[14px] text-[#5b403e]", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-4", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-[#e5e2e1] p-4 bg-[#fcf9f8]",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
