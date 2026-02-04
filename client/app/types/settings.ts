// User preferences for theme and notifications
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "es" | "en";
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockAlerts: boolean;
  paymentAlerts: boolean;
  invoiceUpdates: boolean;
  weeklyReports: boolean;
}

// Default notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  lowStockAlerts: true,
  paymentAlerts: true,
  invoiceUpdates: true,
  weeklyReports: false,
};

// Default user preferences
export const defaultUserPreferences: UserPreferences = {
  theme: "system",
  language: "es",
  notifications: defaultNotificationPreferences,
};

// Profile update data
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
}

// Password change data
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

// Password strength levels
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

// Password strength labels in Spanish
export const PasswordStrengthLabels: Record<PasswordStrength, string> = {
  weak: "Débil",
  fair: "Regular",
  good: "Buena",
  strong: "Fuerte",
};

// Password strength colors
export const PasswordStrengthColors: Record<PasswordStrength, string> = {
  weak: "bg-error-500",
  fair: "bg-warning-500",
  good: "bg-primary-500",
  strong: "bg-success-500",
};

// Theme options
export type ThemeOption = "light" | "dark" | "system";

// Theme option labels in Spanish
export const ThemeOptionLabels: Record<ThemeOption, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

// Language options
export type LanguageOption = "es" | "en";

// Language option labels
export const LanguageOptionLabels: Record<LanguageOption, string> = {
  es: "Español",
  en: "English",
};

// Settings tab type
export type SettingsTab = "profile" | "security" | "preferences" | "account";

// Settings tab labels in Spanish
export const SettingsTabLabels: Record<SettingsTab, string> = {
  profile: "Perfil",
  security: "Seguridad",
  preferences: "Preferencias",
  account: "Cuenta",
};
