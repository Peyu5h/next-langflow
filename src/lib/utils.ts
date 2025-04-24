import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetchCallback = ({
  setIsPending,
}: {
  setIsPending: (value: boolean) => void;
}) => {
  return {
    onRequest: () => {
      setIsPending(true);
    },
    onResponse: () => {
      setIsPending(false);
    },
  };
};

export const handleTextEllipsis = (text: string, maxLength: number = 14) => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "...";
  }
  return text;
};
