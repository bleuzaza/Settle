import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Entry {
  id: string;
  text: string;
  theme: string;
  createdAt: string;
  scheduledDate: string | null;
  /** Heure agenda HH:MM (ex. 17:00) */
  scheduledTime: string | null;
  source: "text" | "voice";
}

const KEY = "settle_entries";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createEntry(
  text: string,
  theme: string,
  scheduledDate: string | null,
  scheduledTime: string | null,
  source: "text" | "voice",
): Entry {
  return {
    id: uuid(),
    text,
    theme,
    createdAt: new Date().toISOString(),
    scheduledDate,
    scheduledTime,
    source,
  };
}

export async function saveEntry(entry: Entry): Promise<void> {
  await saveEntries([entry]);
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  if (entries.length === 0) return;
  const all = await getAllEntries();
  all.unshift(...entries);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function getAllEntries(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const all = await getAllEntries();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((e) => e.id !== id)));
}

export async function getEntriesByTheme(): Promise<Record<string, Entry[]>> {
  const all = await getAllEntries();
  const notesOnly = all.filter((e) => !e.scheduledDate);
  const grouped: Record<string, Entry[]> = {};
  for (const entry of notesOnly) {
    if (!grouped[entry.theme]) grouped[entry.theme] = [];
    grouped[entry.theme].push(entry);
  }
  for (const theme of Object.keys(grouped)) {
    grouped[theme].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return grouped;
}

export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function mondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

export async function getEntriesByWeek(): Promise<Record<string, Entry[]>> {
  const all = await getAllEntries();
  const grouped: Record<string, Entry[]> = {};
  for (const entry of all) {
    if (!entry.scheduledDate) continue;
    const date = new Date(`${entry.scheduledDate}T12:00:00`);
    const key = isoWeekKey(date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  }
  return grouped;
}
