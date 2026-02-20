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
  let config: MailroomConfig = { ...DEFAULT_CONFIG };
  if (existsSync(CONFIG_FILE)) {
    try {
      const raw = readFileSync(CONFIG_FILE, "utf-8");
      config = { ...config, ...JSON.parse(raw) };
    } catch {
      // keep default
    }
  }
  if (process.env.MAILROOM_API_URL) config.apiUrl = process.env.MAILROOM_API_URL;
  return config;
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
