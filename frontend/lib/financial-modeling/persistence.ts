export const saveModelDraft = <T>(modelKey: string, payload: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`quantedge:model:${modelKey}`, JSON.stringify({ savedAt: Date.now(), payload }));
  } catch {
    /* ignore quota */
  }
};

export const loadModelDraft = <T>(modelKey: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`quantedge:model:${modelKey}`);
    if (!raw) return null;
    return JSON.parse(raw).payload as T;
  } catch {
    return null;
  }
};
