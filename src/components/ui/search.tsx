import React from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface SearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function Search({
  className,
  containerClassName,
  placeholder = "Search...",
  ...props
}: SearchProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
      <Input
        placeholder={placeholder}
        className={cn("pl-8", className)}
        {...props}
      />
    </div>
  );
}
