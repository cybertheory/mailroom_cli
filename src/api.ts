import type { MailroomConfig } from "./config.js";

export class MailroomAPI {
  constructor(private config: MailroomConfig) {}

  private get baseUrl(): string {
    return this.config.apiUrl.replace(/\/+$/, "");
  }

  private headers(auth = false): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (auth && this.config.token) {
      h["Authorization"] = `Bearer ${this.config.token}`;
    }
    return h;
  }

  async register(address: string, name?: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetch(`${this.baseUrl}/api/register`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ address, name }),
    });
    return res.json() as Promise<any>;
  }

  async verify(address: string, code: string): Promise<{ ok: boolean; token?: string; error?: string }> {
    const res = await fetch(`${this.baseUrl}/api/verify`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ address, code }),
    });
    return res.json() as Promise<any>;
  }

  async getAgent(address: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/agents/${encodeURIComponent(address)}`, {
      headers: this.headers(true),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any).error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  async updateAgent(address: string, fields: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/agents/${encodeURIComponent(address)}`, {
      method: "PATCH",
      headers: this.headers(true),
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any).error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  async reauth(address: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetch(`${this.baseUrl}/api/agents/${encodeURIComponent(address)}/reauth`, {
      method: "POST",
      headers: this.headers(),
    });
    return res.json() as Promise<any>;
  }

  async listAgents(query?: string): Promise<any> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const res = await fetch(`${this.baseUrl}/api/agents?${params}`, {
      headers: this.headers(),
    });
    return res.json();
  }

  async deleteAgent(address: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/agents/${encodeURIComponent(address)}`, {
      method: "DELETE",
      headers: this.headers(true),
    });
    return res.json();
  }
}
