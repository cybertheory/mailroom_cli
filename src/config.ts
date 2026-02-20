import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".mailroom");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface MailroomConfig {
  address?: string;
  token?: string;
  apiUrl: string;
}

// Cloudflare Worker URL (direct).
const DEFAULT_CONFIG: MailroomConfig = {
  apiUrl: "https://mailroom-api.rishabhspro.workers.dev",
};

export function loadConfig(): MailroomConfig {
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: MailroomConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function requireAuth(config: MailroomConfig): asserts config is MailroomConfig & { address: string; token: string } {
  if (!config.address || !config.token) {
    console.error("Not authenticated. Run `mailroom register <address>` first.");
    process.exit(1);
  }
}
