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
    const text = await res.text();
    try {
      return JSON.parse(text) as { ok: boolean; message?: string; error?: string };
    } catch {
      throw new Error(text || `Server error (${res.status})`);
    }
  }

  async verify(address: string, code: string): Promise<{ ok: boolean; token?: string; error?: string }> {
    const res = await fetch(`${this.baseUrl}/api/verify`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ address, code }),
    });
    const text = await res.text();
    let data: { ok?: boolean; token?: string; error?: string };
    try {
      data = (text ? JSON.parse(text) : {}) as { ok?: boolean; token?: string; error?: string };
    } catch {
      throw new Error(text || `Server error (${res.status})`);
    }
    if (!res.ok) {
      const err = data?.error ?? (data as { message?: string }).message ?? text ?? `Server error (${res.status})`;
      return { ok: false, error: err };
    }
    return data as { ok: boolean; token?: string; error?: string };
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
    const text = await res.text();
    let data: { ok?: boolean; message?: string; error?: string };
    try {
      data = (text ? JSON.parse(text) : {}) as { ok?: boolean; message?: string; error?: string };
    } catch {
      throw new Error(text || `Server error (${res.status})`);
    }
    if (!res.ok) {
      const err = data?.error ?? (data as { message?: string }).message ?? text ?? `Server error (${res.status})`;
      return { ok: false, error: err };
    }
    return data as { ok: boolean; message?: string; error?: string };
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
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || `Server error (${res.status})`);
    }
  }

  /** Get one-time URL to open in browser for "Connect with X" flow. Requires 2FA code from agent's email. */
  async getLinkXUrl(address: string, code: string): Promise<{ url: string; error?: string }> {
    const res = await fetch(`${this.baseUrl}/api/agents/${encodeURIComponent(address)}/link-x/start`, {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify({ code }),
    });
    const text = await res.text();
    let data: { url?: string; error?: string };
    try {
      data = (text ? JSON.parse(text) : {}) as { url?: string; error?: string };
    } catch {
      return { url: "", error: text || `HTTP ${res.status}` };
    }
    if (!res.ok) {
      return { url: "", error: data.error ?? text ?? `HTTP ${res.status}` };
    }
    return { url: data.url ?? "", error: data.error };
  }
}
