import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStatus(status: string) {
  return status
    .toLowerCase() // "to_do"
    .replace(/_/g, " ") // "to do"
    .replace(/\b\w/g, (c) => c.toUpperCase()); // "To Do"
}

export function formatAddress(str: string, keep = 36) {
  if (str.length <= keep * 2) return str;

  return str.slice(0, keep) + "...." + str.slice(-keep);
}
