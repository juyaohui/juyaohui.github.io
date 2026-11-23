import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DeviceInfo } from "@blog/shared";

export interface DeviceRecord {
  id: string;
  name: string;
  platform: string;
  tokenHash: string;
  addedAt: string;
  lastSeenAt: string;
}

/** Last file written for a given client item id, used to update instead of duplicate. */
export interface NoteRecord {
  path: string;
  hash: string;
  updatedAt: string;
}

export interface CommitRecord {
  sha: string;
  message: string;
  pushed: boolean;
  at: string;
}

interface StateFile {
  version: 1;
  devices: DeviceRecord[];
  notes: Record<string, NoteRecord>;
  pairing?: { code: string; expiresAt: number };
  lastSyncAt?: string;
  lastCommit?: CommitRecord;
}

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

function equalHashes(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length || left.length === 0) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * Small JSON-backed store for paired devices, pairing codes and the note index.
 * Everything lives in apps/relay/.relay (gitignored); no database needed for a
 * single-user LAN tool.
 */
export class SyncStore {
  private state: StateFile;
  private readonly file: string;
  private readonly ttlMs: number;

  constructor(stateDir: string, pairingTtlMinutes = 10) {
    this.file = path.join(stateDir, "state.json");
    this.ttlMs = pairingTtlMinutes * 60_000;
    fs.mkdirSync(stateDir, { recursive: true });
    this.state = this.load();
    this.ensurePairing();
  }

  private load(): StateFile {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as Partial<StateFile>;
      return {
        version: 1,
        devices: Array.isArray(raw.devices) ? raw.devices : [],
        notes: raw.notes && typeof raw.notes === "object" ? raw.notes : {},
        pairing: raw.pairing,
        lastSyncAt: raw.lastSyncAt,
        lastCommit: raw.lastCommit,
      };
    } catch {
      return { version: 1, devices: [], notes: {} };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), "utf8");
    fs.renameSync(tmp, this.file);
  }

  /** Rotate the 6-digit pairing code when missing or expired. */
  ensurePairing(): { code: string; expiresAt: number } {
    const now = Date.now();
    if (
      !this.state.pairing ||
      this.state.pairing.expiresAt <= now
    ) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
      this.state.pairing = { code, expiresAt: now + this.ttlMs };
      this.save();
    }
    return { ...this.state.pairing };
  }

  get pairing(): { code: string; expiresAt: number } {
    return this.ensurePairing();
  }

  verifyPairCode(code: string): boolean {
    const current = this.ensurePairing();
    if (current.expiresAt <= Date.now()) return false;
    const a = Buffer.from(current.code);
    const b = Buffer.from(code.trim());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  createDevice(name: string, platform: string): { device: DeviceInfo; token: string } {
    const token = crypto.randomBytes(32).toString("base64url");
    const now = new Date().toISOString();
    const record: DeviceRecord = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 40) || "手机",
      platform: platform.trim().slice(0, 40) || "mobile",
      tokenHash: sha256(token),
      addedAt: now,
      lastSeenAt: now,
    };
    this.state.devices.push(record);
    this.save();
    return {
      token,
      device: {
        id: record.id,
        name: record.name,
        platform: record.platform,
        addedAt: record.addedAt,
        lastSeenAt: record.lastSeenAt,
      },
    };
  }

  /** Returns the device matching a bearer token, or undefined. */
  auth(token: string | undefined): DeviceRecord | undefined {
    if (!token) return undefined;
    const hash = sha256(token);
    for (const device of this.state.devices) {
      if (equalHashes(device.tokenHash, hash)) return device;
    }
    return undefined;
  }

  touchDevice(id: string): void {
    const device = this.state.devices.find((d) => d.id === id);
    if (!device) return;
    device.lastSeenAt = new Date().toISOString();
    this.save();
  }

  get deviceCount(): number {
    return this.state.devices.length;
  }

  listDevices(): DeviceInfo[] {
    return this.state.devices.map(({ id, name, platform, addedAt, lastSeenAt }) => ({
      id,
      name,
      platform,
      addedAt,
      lastSeenAt,
    }));
  }

  revokeDevice(id: string): boolean {
    const before = this.state.devices.length;
    this.state.devices = this.state.devices.filter((d) => d.id !== id);
    if (this.state.devices.length === before) return false;
    this.save();
    return true;
  }

  noteFor(itemId: string): NoteRecord | undefined {
    return this.state.notes[itemId];
  }

  rememberNote(itemId: string, record: NoteRecord): void {
    this.state.notes[itemId] = record;
    this.save();
  }

  recordSync(commit: CommitRecord): void {
    this.state.lastSyncAt = new Date().toISOString();
    this.state.lastCommit = commit;
    this.save();
  }

  get lastSyncAt(): string | undefined {
    return this.state.lastSyncAt;
  }

  get lastCommit(): CommitRecord | undefined {
    return this.state.lastCommit;
  }
}
