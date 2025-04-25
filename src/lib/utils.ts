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

export const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return "Unknown date";
  }
};

export const truncateText = (text: string, maxLength: number = 24) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};
