import { z } from "zod";
const safeInt = z.number().finite().int().nonnegative();
const settingsSchema = z.object({
  sound: z.boolean().catch(false),
  haptics: z.boolean().catch(true),
  reduceMotion: z.boolean().catch(false),
});
export const saveSchema = z.object({
  version: z.literal(2).catch(2),
  best: safeInt.catch(0),
  dailyBest: z.record(z.string(), safeInt).catch(() => ({})),
  totalStars: safeInt.catch(0),
  flights: safeInt.catch(0),
  selected: z.enum(["ember", "arctic", "midnight"]).catch("ember"),
  settings: settingsSchema.catch(() => ({
    sound: false,
    haptics: true,
    reduceMotion: false,
  })),
});
export type Save = z.infer<typeof saveSchema>;
export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}
export const SAVE_KEY = "missiles-save-v2";
export function parseSave(raw: string | null): Save {
  let data: unknown = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {}
  if (!data || typeof data !== "object" || Array.isArray(data)) data = {};
  const record = data as Record<string, unknown>;
  if (record.dailyBest && typeof record.dailyBest === "object") {
    record.dailyBest = Object.fromEntries(
      Object.entries(record.dailyBest).filter(
        ([, v]) => safeInt.safeParse(v).success,
      ),
    );
  }
  return saveSchema.parse(data);
}
export function loadSave(store: StorageAdapter): Save {
  try {
    const save = parseSave(store.getItem(SAVE_KEY));
    const legacy = Number(store.getItem("sky-run-best"));
    if (Number.isFinite(legacy) && legacy > save.best)
      save.best = Math.floor(legacy);
    return save;
  } catch {
    return parseSave(null);
  }
}
export function writeSave(store: StorageAdapter, save: Save): boolean {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(saveSchema.parse(save)));
    return true;
  } catch {
    return false;
  }
}
export const PLANES = [
  {
    id: "ember",
    name: "Ember",
    color: 0xf36a3c,
    cost: 0,
    label: "THE ORIGINAL",
  },
  {
    id: "arctic",
    name: "Arctic",
    color: 0x3f9db8,
    cost: 40,
    label: "COOL UNDER PRESSURE",
  },
  {
    id: "midnight",
    name: "Midnight",
    color: 0x414968,
    cost: 100,
    label: "AFTER HOURS",
  },
] as const;
