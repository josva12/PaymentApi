import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  if (phone.startsWith("254")) {
    return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-50";
    case "pending":
      return "text-yellow-600 bg-yellow-50";
    case "failed":
      return "text-red-600 bg-red-50";
    case "cancelled":
      return "text-gray-600 bg-gray-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

export function getProviderIcon(provider: string): string {
  switch (provider) {
    case "mpesa":
      return "fas fa-mobile-alt";
    case "airtel":
      return "fas fa-mobile-alt";
    case "bank":
      return "fas fa-university";
    default:
      return "fas fa-credit-card";
  }
}
