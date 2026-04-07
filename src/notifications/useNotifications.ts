import { useEffect } from "react";
import { buildDailySession } from "../leitner/engine";
import { checkAndMaybeNotify } from "./service";

const getTodayKey = (): string => new Date().toISOString().slice(0, 10);

const runCheck = async (): Promise<void> => {
  try {
    const session = await buildDailySession(getTodayKey());
    const dueCount = session.box1.length + session.due.length;
    await checkAndMaybeNotify(dueCount);
  } catch {
    // Non-blocking — notification failures must never crash the app
  }
};

export const useNotifications = (): void => {
  useEffect(() => {
    void runCheck();
    const onFocus = () => void runCheck();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
};
