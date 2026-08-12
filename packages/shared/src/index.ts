/**
 * The shared domain shapes. The rule that makes the demo-to-real
 * migration a feed swap and not a rewrite: every surface consumes these
 * shapes, and every backend produces them.
 */

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Resident {
  id: string;
  slug: string;
  name: string;
  userId: string;
  createdAt: string;
  /** the hostname the serving door answers by, when the owner set one */
  customDomain?: string | null;
  /** the resident's own key; rdb doors open for it, owners hold it */
  apiKey?: string;
}

export interface VaultFile {
  path: string;
  version: number;
  size: number;
  createdAt: string;
}

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

export interface Health {
  ok: boolean;
  db: boolean;
  blobs: boolean;
  version: string;
  uptimeSeconds: number;
}
