/**
 * The Osyle SDK. Every resident gets its own isolated end-user database
 * through this tiny client: rows, auth-lite, and key-value.
 *
 * One API, two transports. The local transport runs on localStorage,
 * deterministic and offline, and is Demo Mode's permanent home. The
 * http transport speaks to the Osyle API's per-resident database. The
 * shape is the contract; nothing above this file knows which transport
 * is underneath.
 */

export interface Row {
  id: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface SdkUser {
  id: string;
  email: string;
  signedInAt: string;
}

/** The synchronous client: the local transport, Demo Mode's home. */
export interface OsyleClient {
  rows(table: string): {
    list(): Row[];
    insert(data: Record<string, unknown>): Row;
    remove(rowId: string): void;
    count(): number;
  };
  auth: {
    signIn(email: string): SdkUser;
    user(): SdkUser | null;
    signOut(): void;
  };
  kv: {
    get<T>(k: string, fallback: T): T;
    set(k: string, v: unknown): void;
  };
}

/** The asynchronous client: the http transport, Real Mode's home. */
export interface OsyleClientAsync {
  rows(table: string): {
    list(): Promise<Row[]>;
    insert(data: Record<string, unknown>): Promise<Row>;
    remove(rowId: string): Promise<void>;
    count(): Promise<number>;
  };
  auth: {
    signIn(email: string): Promise<SdkUser>;
    user(): Promise<SdkUser | null>;
    signOut(): Promise<void>;
  };
  kv: {
    get<T>(k: string, fallback: T): Promise<T>;
    set(k: string, v: unknown): Promise<void>;
  };
}

export interface ClientOptions {
  transport?: "local" | "http";
  /** required for the http transport, e.g. https://api.osyle.app */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/* ------------------------------------------------------ local transport */

let counter = 0;
function localId(): string {
  counter += 1;
  return `r_${Date.now().toString(36)}_${counter}`;
}

function makeLocal(resident: string): OsyleClient {
  const bucket = (kind: string) => `osyle.sdk.${resident}.${kind}`;
  const load = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage-restricted contexts still get a working session */
    }
  };

  return {
    rows(table: string) {
      const key = bucket(`rows.${table}`);
      return {
        list: () => load<Row[]>(key, []),
        insert(data: Record<string, unknown>) {
          const all = load<Row[]>(key, []);
          const row: Row = { id: localId(), createdAt: new Date().toISOString(), ...data };
          all.push(row);
          save(key, all);
          return row;
        },
        remove(rowId: string) {
          save(key, load<Row[]>(key, []).filter((r) => r.id !== rowId));
        },
        count: () => load<Row[]>(key, []).length,
      };
    },
    auth: {
      signIn(email: string) {
        const user: SdkUser = { id: localId(), email, signedInAt: new Date().toISOString() };
        save(bucket("auth.user"), user);
        return user;
      },
      user: () => load<SdkUser | null>(bucket("auth.user"), null),
      signOut: () => {
        try {
          localStorage.removeItem(bucket("auth.user"));
        } catch {
          /* nothing to forget */
        }
      },
    },
    kv: {
      get: <T,>(k: string, fallback: T) => load<T>(bucket(`kv.${k}`), fallback),
      set: (k: string, v: unknown) => save(bucket(`kv.${k}`), v),
    },
  };
}

/* ------------------------------------------------------- http transport */

function makeHttp(resident: string, baseUrl: string, fetchImpl: typeof fetch): OsyleClientAsync {
  const base = `${baseUrl.replace(/\/$/, "")}/rdb/${resident}`;
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchImpl(`${base}${path}`, {
      headers: { "content-type": "application/json" },
      ...init,
    });
    if (!res.ok) throw new Error(`osyle sdk: ${res.status} on ${path}`);
    return (await res.json()) as T;
  }

  return {
    rows(table: string) {
      return {
        list: () => call<Row[]>(`/rows/${table}`),
        insert: (data) =>
          call<Row>(`/rows/${table}`, { method: "POST", body: JSON.stringify(data) }),
        remove: async (rowId) => {
          await call(`/rows/${table}/${rowId}`, { method: "DELETE" });
        },
        count: async () => (await call<{ count: number }>(`/rows/${table}/count`)).count,
      };
    },
    auth: {
      signIn: (email) =>
        call<SdkUser>(`/auth/signin`, { method: "POST", body: JSON.stringify({ email }) }),
      user: () => call<SdkUser | null>(`/auth/user`),
      signOut: async () => {
        await call(`/auth/signout`, { method: "POST" });
      },
    },
    kv: {
      get: async <T,>(k: string, fallback: T) => {
        const got = await call<{ value: T | null }>(`/kv/${k}`);
        return got.value === null ? fallback : got.value;
      },
      set: async (k, v) => {
        await call(`/kv/${k}`, { method: "PUT", body: JSON.stringify({ value: v }) });
      },
    },
  };
}

export function createClient(resident: string): OsyleClient;
export function createClient(
  resident: string,
  options: ClientOptions & { transport: "http" },
): OsyleClientAsync;
export function createClient(
  resident: string,
  options: ClientOptions = {},
): OsyleClient | OsyleClientAsync {
  if (options.transport === "http") {
    if (!options.baseUrl) throw new Error("osyle sdk: http transport needs a baseUrl");
    return makeHttp(resident, options.baseUrl, options.fetchImpl ?? fetch);
  }
  return makeLocal(resident);
}
