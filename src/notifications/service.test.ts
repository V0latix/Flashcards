import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const STORAGE_KEY = "flashcards_notif_enabled";
const LAST_SHOWN_KEY = "flashcards_notif_last_shown";

// Stub Notification API (not available in jsdom)
const mockNotifConstructor = vi.fn();
const mockRequestPermission = vi.fn().mockResolvedValue("granted");
const mockNotification = Object.assign(mockNotifConstructor, {
  permission: "default" as NotificationPermission,
  requestPermission: mockRequestPermission,
});

beforeAll(() => {
  vi.stubGlobal("Notification", mockNotification);
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockNotification.permission = "default";
});

// Import after stubbing so the module sees window.Notification
const {
  checkAndMaybeNotify,
  getPermission,
  isNotificationsEnabled,
  isNotificationsSupported,
  requestPermission,
  setNotificationsEnabled,
} = await import("./service");

describe("notifications/service", () => {
  describe("isNotificationsSupported", () => {
    it("returns true when Notification is stubbed in window", () => {
      expect(isNotificationsSupported()).toBe(true);
    });
  });

  describe("isNotificationsEnabled / setNotificationsEnabled", () => {
    it("is false by default", () => {
      expect(isNotificationsEnabled()).toBe(false);
    });

    it("persists enabled=true in localStorage", () => {
      setNotificationsEnabled(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
      expect(isNotificationsEnabled()).toBe(true);
    });

    it("persists enabled=false", () => {
      setNotificationsEnabled(true);
      setNotificationsEnabled(false);
      expect(isNotificationsEnabled()).toBe(false);
    });
  });

  describe("getPermission", () => {
    it("returns the current Notification.permission", () => {
      mockNotification.permission = "granted";
      expect(getPermission()).toBe("granted");
    });
  });

  describe("requestPermission", () => {
    it("delegates to Notification.requestPermission", async () => {
      mockRequestPermission.mockResolvedValue("granted");
      const result = await requestPermission();
      expect(result).toBe("granted");
      expect(mockRequestPermission).toHaveBeenCalledOnce();
    });
  });

  describe("checkAndMaybeNotify", () => {
    beforeEach(() => {
      mockNotification.permission = "granted";
    });

    it("does nothing when notifications are disabled", async () => {
      setNotificationsEnabled(false);
      await checkAndMaybeNotify(5);
      expect(mockNotifConstructor).not.toHaveBeenCalled();
    });

    it("does nothing when dueCount is 0", async () => {
      setNotificationsEnabled(true);
      await checkAndMaybeNotify(0);
      expect(mockNotifConstructor).not.toHaveBeenCalled();
    });

    it("does nothing if already shown today", async () => {
      setNotificationsEnabled(true);
      localStorage.setItem(
        LAST_SHOWN_KEY,
        new Date().toISOString().slice(0, 10),
      );
      await checkAndMaybeNotify(3);
      expect(mockNotifConstructor).not.toHaveBeenCalled();
    });

    it("shows notification and marks today when conditions are met", async () => {
      setNotificationsEnabled(true);
      await checkAndMaybeNotify(3);
      expect(mockNotifConstructor).toHaveBeenCalledOnce();
      expect(mockNotifConstructor).toHaveBeenCalledWith(
        "Flashcards — révision du jour",
        expect.objectContaining({ body: "3 cartes à réviser aujourd'hui." }),
      );
      expect(localStorage.getItem(LAST_SHOWN_KEY)).toBe(
        new Date().toISOString().slice(0, 10),
      );
    });

    it("uses singular body when dueCount is 1", async () => {
      setNotificationsEnabled(true);
      await checkAndMaybeNotify(1);
      expect(mockNotifConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: "1 carte à réviser aujourd'hui." }),
      );
    });
  });
});
