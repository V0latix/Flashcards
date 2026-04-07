const STORAGE_KEY = "flashcards_notif_enabled";
const LAST_SHOWN_KEY = "flashcards_notif_last_shown";

export const isNotificationsSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window;

export const isNotificationsEnabled = (): boolean => {
  if (!isNotificationsSupported()) return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
};

export const setNotificationsEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEY, String(enabled));
};

export const getPermission = (): NotificationPermission => {
  if (!isNotificationsSupported()) return "denied";
  return Notification.permission;
};

export const requestPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationsSupported()) return "denied";
  return Notification.requestPermission();
};

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const alreadyShownToday = (): boolean =>
  localStorage.getItem(LAST_SHOWN_KEY) === todayKey();

const markShownToday = (): void => {
  localStorage.setItem(LAST_SHOWN_KEY, todayKey());
};

export const checkAndMaybeNotify = async (dueCount: number): Promise<void> => {
  if (!isNotificationsEnabled()) return;
  if (!isNotificationsSupported()) return;
  if (alreadyShownToday()) return;
  if (dueCount <= 0) return;

  if (Notification.permission !== "granted") {
    const perm = await requestPermission();
    if (perm !== "granted") return;
  }

  new Notification("Flashcards — révision du jour", {
    body:
      dueCount === 1
        ? "1 carte à réviser aujourd'hui."
        : `${dueCount} cartes à réviser aujourd'hui.`,
    icon: "/pwa-192x192.png",
    badge: "/pwa-64x64.png",
    tag: "flashcards-daily",
  });

  markShownToday();
};
