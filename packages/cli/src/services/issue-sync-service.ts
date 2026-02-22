export interface SyncResult {
  specId: string;
  synced: SyncedIssue[];
  progress: ProgressInfo;
  errors: SyncError[];
}

export interface SyncedIssue {
  number: number;
  title: string;
  previousStatus: string;
  currentStatus: string;
  changed: boolean;
}

export interface SyncError {
  issueNumber: number;
  message: string;
}

export interface ProgressInfo {
  total: number;
  completed: number;
  percentage: number;
}

export async function syncSpecification(_cwd: string, specId: string): Promise<SyncResult> {
  // issue sync via spec.implementation is no longer supported.
  // Use tasks.yaml-based sync instead.
  throw new Error(`syncSpecification for ${specId} is no longer supported. Use tasks.yaml-based workflow instead.`);
}

export async function syncAll(_cwd: string): Promise<SyncResult[]> {
  // issue sync via spec.implementation is no longer supported.
  return [];
}
