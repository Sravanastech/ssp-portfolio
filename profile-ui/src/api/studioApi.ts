/** Site Studio API client (block store). Contract: profile-backend content-schema/README.md. */

export type Json = unknown;
export type BlockData = Record<string, unknown>;

export type StudioBlock = {
  id: string;
  type: string;
  collection: string | null;
  slug: string;
  position: number;
  draft: BlockData | null;
  published: BlockData | null;
  draftDeleted: boolean;
  pending: boolean;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
};

export type SchemaProp = {
  type?: string;
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  pattern?: string;
  items?: SchemaProp;
  properties?: Record<string, SchemaProp>;
  required?: string[];
  "x-ui"?: {
    label?: string;
    help?: string;
    placeholder?: string;
    widget?: string;
    itemLabel?: string;
    itemTitle?: string;
  };
};

export type BlockSchema = SchemaProp & {
  title?: string;
  "x-studio": {
    type: string;
    shape: "object" | "item" | "keyed" | "merge";
    page?: string;
    section?: string;
    label?: string;
    order?: number;
    itemTitle?: string;
    itemSubtitle?: string;
    collection?: string;
  };
};

export type StudioState = {
  blocks: StudioBlock[];
  schemas: BlockSchema[];
  pendingCount: number;
};

export type SaveChange = {
  id?: string;
  type?: string;
  slug?: string;
  version?: number;
  draft?: BlockData;
  position?: number;
  delete?: boolean;
};

export type SaveResult = { blocks: StudioBlock[]; removed: string[] };
export type Revision = {
  rev: number;
  data: BlockData;
  createdBy: string | null;
  createdAt: string;
};
export type Release = {
  id: number;
  status: "queued" | "building" | "live" | "failed" | "superseded";
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  finishedAt: string | null;
  runUrl: string | null;
};
export type ValidationIssue = {
  index?: number;
  id?: string;
  type?: string;
  path: string;
  message: string;
};

export class StudioApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly ids: string[] = [],
    readonly errors: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "StudioApiError";
  }
}

async function call<T>(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  if (!res.ok) {
    let p: {
      code?: string;
      detail?: string;
      ids?: string[];
      errors?: ValidationIssue[];
    } = {};
    try {
      p = (await res.json()) as typeof p;
    } catch {
      /* no body */
    }
    const fallback =
      res.status === 403
        ? "Your role does not allow this."
        : res.status === 401
          ? "Your session expired. Sign in again."
          : "The request failed. Your edits are still on this page.";
    throw new StudioApiError(
      p.detail || fallback,
      res.status,
      p.code,
      p.ids ?? [],
      p.errors ?? [],
    );
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const studioApi = {
  load: (t: string) => call<StudioState>(t, "/studio"),
  save: (t: string, changes: SaveChange[]) =>
    call<SaveResult>(t, "/studio/save", "POST", { changes }),
  discard: (t: string, ids: string[]) =>
    call<SaveResult>(t, "/studio/discard", "POST", { ids }),
  history: (t: string, id: string) =>
    call<{ blockId: string; revisions: Revision[] }>(
      t,
      `/studio/blocks/${id}/history`,
    ),
  restore: (t: string, id: string, rev: number) =>
    call<StudioBlock>(t, `/studio/blocks/${id}/restore/${rev}`, "POST"),
  preview: (t: string) =>
    call<{ content: Record<string, unknown> }>(t, "/studio/preview"),
  releases: (t: string) => call<Release[]>(t, "/releases"),
  publish: (t: string, note?: string) =>
    call<Release>(t, "/releases", "POST", note ? { note } : undefined),
  rollback: (t: string, id: number) =>
    call<Release>(t, `/releases/${id}/rollback`, "POST"),
};
