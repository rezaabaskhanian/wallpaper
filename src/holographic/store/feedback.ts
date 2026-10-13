/**
 * «درخواست و رأی»: the user asks for a wallpaper / category or votes in the
 * open poll; when the admin marks a request done or closes the poll with a
 * winner, the native inbox (Inbox.kt) notifies this device.
 */
import {NativeModules} from 'react-native';
import {API_BASE_URL} from './config';
import {getDeviceId} from './deviceId';

export type PollOption = {id: string; title: string; categoryId: string; votes: number};
export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  /** This device's vote; undefined when it hasn't voted. */
  myOptionId?: string;
};

/** Server message (validation, daily limit) or a generic one. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string') return data.message;
  } catch {
    // fall through
  }
  return 'ارسال نشد؛ دوباره امتحان کن.';
}

export async function submitWallpaperRequest(text: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/requests`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({deviceId: await getDeviceId(), text}),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export async function fetchActivePoll(): Promise<Poll | null> {
  const deviceId = encodeURIComponent(await getDeviceId());
  const res = await fetch(`${API_BASE_URL}/polls/active?deviceId=${deviceId}`);
  if (!res.ok) throw new Error(`poll HTTP ${res.status}`);
  const data = (await res.json()) as {poll?: Poll | null};
  return data?.poll ?? null;
}

export async function votePoll(pollId: string, optionId: string): Promise<Poll | null> {
  const res = await fetch(`${API_BASE_URL}/polls/${encodeURIComponent(pollId)}/vote`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({deviceId: await getDeviceId(), optionId}),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = (await res.json()) as {poll?: Poll | null};
  return data?.poll ?? null;
}

type InboxNative = {start: (apiBase: string, deviceId: string) => Promise<boolean>};
const InboxModule: InboxNative | undefined = NativeModules.Inbox;

/** Schedules the daily inbox check (and one right now). Best-effort. */
export async function startInbox(): Promise<void> {
  try {
    await InboxModule?.start(API_BASE_URL, await getDeviceId());
  } catch {
    // An older build without the module, or WorkManager refused.
  }
}
