import { offlineDb } from "./db";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Minimum numbers before triggering a refill */
const REFILL_THRESHOLD = 5;

/** Default number of numbers to reserve per request */
const DEFAULT_RESERVE_COUNT = 20;

/**
 * Number Pool — manages pre-assigned invoice consecutive numbers.
 *
 * When the device has a good connection, it reserves a block of numbers
 * from the server. When offline, it consumes from the local pool.
 * Auto-refills when the pool drops below the threshold.
 */

interface ReservedNumber {
  key: string; // tenantId:invoiceNumber
  tenantId: string;
  invoiceNumber: string;
  used: boolean;
  reservedAt: string;
  expiresAt: string;
}

// We store reserved numbers in a dedicated Dexie table via syncQueue
// But simpler approach: use a dedicated IndexedDB object store via syncMeta

/**
 * Gets auth token for API requests.
 */
function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem("auth-storage");
    if (!authData) return null;
    const parsed = JSON.parse(authData) as {
      state?: { accessToken?: string };
    };
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Generates a unique device ID, persisted in localStorage.
 */
function getDeviceId(): string {
  const key = "stockflow-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Reserves a block of invoice numbers from the server.
 */
export async function reserveNumbers(
  count = DEFAULT_RESERVE_COUNT,
): Promise<string[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const deviceId = getDeviceId();

  const response = await fetch(`${API_URL}/invoices/reserve-numbers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ count, deviceId }),
  });

  if (!response.ok) {
    throw new Error(`Reserve numbers failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    numbers: string[];
    expiresAt: string;
  };

  // Store in IndexedDB via syncMeta (using a simple key-value approach)
  const existing = await getStoredNumbers();
  const allNumbers = [
    ...existing,
    ...data.numbers.map((num) => ({
      number: num,
      expiresAt: data.expiresAt,
      used: false,
    })),
  ];

  await offlineDb.syncMeta.put({
    key: "number-pool",
    lastSyncAt: Date.now(),
    recordCount: allNumbers.length,
  });

  // Store the actual numbers in localStorage (simple, fast access)
  localStorage.setItem("offline-number-pool", JSON.stringify(allNumbers));

  return data.numbers;
}

interface StoredNumber {
  number: string;
  expiresAt: string;
  used: boolean;
}

/**
 * Gets stored numbers from localStorage.
 */
function getStoredNumbers(): StoredNumber[] {
  try {
    const raw = localStorage.getItem("offline-number-pool");
    if (!raw) return [];
    const numbers = JSON.parse(raw) as StoredNumber[];
    // Filter out expired and used numbers
    const now = new Date().toISOString();
    return numbers.filter((n) => !n.used && n.expiresAt > now);
  } catch {
    return [];
  }
}

/**
 * Gets the next available number from the local pool.
 * Returns null if pool is empty.
 */
export function getNextNumber(): string | null {
  const numbers = getStoredNumbers();
  if (numbers.length === 0) return null;

  // Mark the first one as used
  numbers[0].used = true;
  localStorage.setItem("offline-number-pool", JSON.stringify(numbers));

  return numbers[0].number;
}

/**
 * Gets the count of available (unused, non-expired) numbers.
 */
export function getAvailableCount(): number {
  return getStoredNumbers().length;
}

/**
 * Checks if the pool needs to be refilled.
 */
export function needsRefill(): boolean {
  return getAvailableCount() < REFILL_THRESHOLD;
}

/**
 * Auto-refills the pool if needed and online.
 */
export async function autoRefill(): Promise<void> {
  if (!navigator.onLine) return;
  if (!needsRefill()) return;

  try {
    await reserveNumbers(DEFAULT_RESERVE_COUNT);
  } catch (error) {
    console.warn("[NumberPool] Auto-refill failed:", error);
  }
}
