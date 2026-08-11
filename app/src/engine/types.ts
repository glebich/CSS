/**
 * The real examination engine. Everything in here is measured from the
 * project's actual bytes; nothing is invented. Every finding carries
 * its evidence (file, line, the measured value) and its grounding (the
 * standard or research it rests on). Honesty rule: when a method has
 * limits, the finding says so.
 */

export interface ProjectFile {
  path: string;
  /** text content for text files, null for binary */
  text: string | null;
  bytes: number;
  /** small media carried whole, so the served page plays and shows it */
  dataUri?: string;
}

export interface Evidence {
  file: string;
  line?: number;
  /** the measured thing, quoted or numeric */
  value: string;
}

export type Severity = "high" | "medium" | "low";

export interface RealFinding {
  id: string;
  lens: string;
  title: string;
  /** one plain sentence of what is wrong */
  detail: string;
  severity: Severity;
  evidence: Evidence[];
  /** the standard or research this check rests on */
  grounding: string;
  /** what the method can and cannot see */
  methodNote?: string;
}

export interface RealStrength {
  id: string;
  lens: string;
  title: string;
  detail: string;
  evidence?: Evidence[];
}

export interface LensResult {
  key: string;
  name: string;
  /** 0 to 100, from the documented formula */
  score: number;
  /** how the score was computed, shown to the user */
  scoreWhy: string;
  findings: RealFinding[];
  strengths: RealStrength[];
  /** honest flag when the lens cannot apply to this project */
  notApplicable?: string;
}

export interface Inventory {
  name: string;
  fileCount: number;
  textFileCount: number;
  totalBytes: number;
  framework: string;
  screens: string[];
  componentCount: number;
  /** connectors actually fingerprinted in the dropped text */
  services: string[];
  truncated: boolean;
}

export interface AnalyzedProject {
  inventory: Inventory;
  lenses: LensResult[];
  vitality: number;
  vitalityWhy: string;
  /** one honest sentence built from what the project says about itself */
  understanding: string;
  /** the file map kept for the live preview frames */
  files: Map<string, ProjectFile>;
  analyzedAt: string;
}

export interface ProgressLine {
  phase: string;
  text: string;
}
