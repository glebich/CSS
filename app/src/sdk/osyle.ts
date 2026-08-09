/**
 * The Osyle SDK, demo build.
 *
 * Every resident gets its own isolated end-user database through this tiny
 * client: rows, auth-lite, and key-value. In Demo Mode the store is
 * localStorage, namespaced per resident, so hosted residents behave like
 * real software with real users while the platform backend is staged.
 * The API surface is the contract; the transport swaps later without a
 * change of shape.
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

function bucket(resident: string, kind: string): string {
  return `osyle.sdk.${resident}.${kind}`;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

let counter = 0;
function id(): string {
  counter += 1;
  return `r_${Date.now().toString(36)}_${counter}`;
}

export function createClient(resident: string) {
  return {
    /** Row storage: one table per name, schemaless rows with ids. */
    rows(table: string) {
      const key = bucket(resident, `rows.${table}`);
      return {
        list(): Row[] {
          return load<Row[]>(key, []);
        },
        insert(data: Record<string, unknown>): Row {
          const all = load<Row[]>(key, []);
          const row: Row = { id: id(), createdAt: new Date().toISOString(), ...data };
          all.push(row);
          save(key, all);
          return row;
        },
        remove(rowId: string): void {
          save(key, load<Row[]>(key, []).filter((r) => r.id !== rowId));
        },
        count(): number {
          return load<Row[]>(key, []).length;
        },
      };
    },

    /** Auth-lite: magic-link shaped, session only, no passwords ever. */
    auth: {
      signIn(email: string): SdkUser {
        const user: SdkUser = { id: id(), email, signedInAt: new Date().toISOString() };
        save(bucket(resident, "auth.user"), user);
        return user;
      },
      user(): SdkUser | null {
        return load<SdkUser | null>(bucket(resident, "auth.user"), null);
      },
      signOut(): void {
        localStorage.removeItem(bucket(resident, "auth.user"));
      },
    },

    /** Key-value: small facts a resident wants to remember. */
    kv: {
      get<T>(k: string, fallback: T): T {
        return load<T>(bucket(resident, `kv.${k}`), fallback);
      },
      set(k: string, v: unknown): void {
        save(bucket(resident, `kv.${k}`), v);
      },
    },
  };
}

export type OsyleClient = ReturnType<typeof createClient>;
