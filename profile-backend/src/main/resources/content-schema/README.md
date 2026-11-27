# content-schema

One JSON Schema file per kind of content block. The backend validates every block against these files
and serves them to the studio UI, which renders its forms from them. Adding a section type means adding
one file here (no code) as long as it maps onto an existing `shape`.

This directory lives on the backend classpath (`profile-backend/src/main/resources/content-schema/`) and is packaged into the jar.
A malformed file stops the backend from starting.

## File format

Standard JSON Schema (draft 2020-12) plus two vendor keywords the validator ignores:

| Keyword | Where | Purpose |
|---|---|---|
| `x-studio` | root | How the block maps to the site snapshot and where it appears in the studio |
| `x-ui` | any property | Form hints: `label`, `help`, `placeholder`, `widget`, `itemLabel`, `itemTitle` |

`x-studio` fields:

| Field | Meaning |
|---|---|
| `type` | Block type id; must equal the file name (`experience.schema.json`) |
| `shape` | `object` (singleton, `content[target] = data`), `item` (array element, ordered by `position`), `keyed` (`content[target][slug] = data`), `merge` (block keys are merged into `content[target]`) |
| `target` | Key in the site snapshot: `seo`, `copy`, `profile`, `navigation`, `caseStudies`, `experiences`, `workProjects`, `expertiseData` |
| `collection` | Stored in `content_block.collection`; absent only for singletons |
| `page`, `section`, `label`, `order` | Studio outline: Pages → Sections → Items |
| `slugFrom` | Field slugified into the block slug for new items when no slug is given |
| `itemTitle`, `itemSubtitle` | `{{field}}` templates for the collapsed card of a collection item |

`x-ui.widget` values used today: `text`, `textarea`, `url`, `email`, `number`, `tags`, `stringList`,
`objectList`, `hidden`. Constraints (`maxLength`, `minLength`, `pattern`, `required`,
`additionalProperties`, `maximum`...) are ordinary JSON Schema and apply on both sides.

Block types: `profile`, `experience`, `expertise_group`, `case_study`, `work_project`,
`navigation_item`, `seo_page` (one block per route, slug = route such as `/about`), `page_text`
(one block per `pages.X` / `components.X` prefix, slug = prefix, data = key → text map).

Beyond the schema every block must pass these fixed rules: no NUL or `</script` in any string, fields
named `url`, `linkedin`, `href`, `src` must be `https://...`, `/api/media/public/...` or a site path
(no `//`, no `..`), nesting depth ≤ 12, serialized size ≤ 100 KB, and `page_text` keys must start with
`<slug>.`.

## API (all under `/api/admin`, bearer JWT with MFA; errors are RFC 9457 problem details with a `code`)

Permissions: `content.edit` for studio endpoints and reading releases, `content.publish` for creating
or rolling back releases.

### `GET /studio`

`Cache-Control: no-cache`, `ETag` (send `If-None-Match` for `304`).

```json
{
  "blocks": [
    {
      "id": "6b0a7c0e-6a4e-4d8e-9b1c-0d6f5b0c2f11",
      "type": "experience",
      "collection": "experiences",
      "slug": "experience-1",
      "position": 0,
      "draft": null,
      "published": { "id": "experience-1", "year": "June 2026 – Present", "title": "Senior Software Engineer III", "company": "Fifth Third Bank", "description": "..." },
      "draftDeleted": false,
      "pending": false,
      "version": 1,
      "updatedAt": "2026-11-26T22:00:00.123456Z",
      "publishedAt": "2026-11-26T22:00:00.123456Z"
    }
  ],
  "schemas": [ { "$schema": "...", "title": "Experience", "x-studio": { "type": "experience", "shape": "item" }, "type": "object", "properties": { } } ],
  "pendingCount": 0
}
```

`schemas` are the full files, verbatim. `position` is the effective position (a pending reorder is
already applied). `pending` is true when the block has a draft, a pending delete or a pending reorder.
Blocks never published have `published: null`.

### `POST /studio/save`

One transaction. Each change is one of: create (no `id`, or an unused client `id`), update (`id` +
`version` + any of `draft`, `position`, `delete`), delete (`delete: true`; a never-published block
disappears immediately, a published one is marked `draftDeleted` until publish; `delete: false` undoes
that). `draft` is the whole block content, not a patch. Moving an item sets `position`; send explicit
positions for every item whose slot changes (there is no automatic renumbering).
Saving content equal to the published content clears the draft. Limits: 200 changes, 100 KB per block,
2 MB total.

Request:

```json
{
  "changes": [
    { "id": "6b0a7c0e-6a4e-4d8e-9b1c-0d6f5b0c2f11", "version": 1,
      "draft": { "id": "experience-1", "year": "June 2026 – Present", "title": "Principal Engineer", "company": "Fifth Third Bank", "description": "..." } },
    { "id": "0f3c5c36-5c52-43b9-9d3a-5a4f6a4b9b01", "version": 4, "position": 2 },
    { "id": "5d6f1c6e-2f43-4f0b-8f9f-1a2b3c4d5e6f", "version": 2, "delete": true },
    { "type": "experience",
      "draft": { "year": "2016 – 2019", "title": "Engineer", "company": "Acme", "description": "Built things." } }
  ]
}
```

For a new item the backend picks `slug` (explicit `slug` if given, else from `slugFrom`/`title`/`name`/
`label`/`domain`, made unique with `-2`, `-3`...), fills the `id` property from the slug if the schema has
one and the draft omits it, and puts it last unless `position` is given. `keyed` and `merge` types
(`seo_page`, `page_text`) require an explicit `slug`; singletons use the type as slug.

`200`:

```json
{ "blocks": [ { "...": "changed or created blocks, same shape as GET /studio" } ],
  "removed": [ "5d6f1c6e-2f43-4f0b-8f9f-1a2b3c4d5e6f" ] }
```

(`removed` lists never-published blocks that were deleted outright.)

`409` when a `version` is stale or the block is gone; nothing is saved:

```json
{ "type": "about:blank", "title": "Conflict", "status": 409, "detail": "Some items changed since you loaded them",
  "code": "block_conflict", "ids": ["6b0a7c0e-6a4e-4d8e-9b1c-0d6f5b0c2f11"] }
```

`422` when any change is invalid; nothing is saved (`index` is the position in `changes`):

```json
{ "status": 422, "detail": "Some content is not valid", "code": "validation_failed",
  "errors": [ { "index": 0, "id": "6b0a7c0e-6a4e-4d8e-9b1c-0d6f5b0c2f11", "path": "$.title",
                "message": "$.title: must be at most 80 characters long" } ] }
```

`400` for a malformed body or unknown JSON properties.

### `POST /studio/discard`

```json
{ "ids": ["6b0a7c0e-6a4e-4d8e-9b1c-0d6f5b0c2f11"] }
```

Clears draft, pending delete and pending reorder; never-published blocks are removed. Unknown ids are
ignored. Response is the same `{blocks, removed}` as save.

### `GET /studio/blocks/{id}/history`

At most 3 revisions, newest first (the newest equals the live content). `404` for an unknown block.

```json
{ "blockId": "6b0a7c0e-6a4e-4d8e-9b1c-0d6f5b0c2f11",
  "revisions": [ { "rev": 3, "data": { }, "createdBy": "uuid-or-null", "createdAt": "2026-11-26T22:10:00Z" } ] }
```

### `POST /studio/blocks/{id}/restore/{rev}`

No body. Copies the revision into the draft (clearing a pending delete; if it equals the live content the
draft is cleared). Returns the updated block (`200`), `404` for an unknown block or revision.

### `GET /studio/preview`

The assembled draft site (what a publish would release right now), in the exact shape the existing UI
consumes as `SiteSnapshot.content`:

```json
{ "content": { "seo": {}, "copy": {}, "profile": {}, "navigation": [], "caseStudies": [],
               "experiences": [], "workProjects": [], "expertiseData": [] } }
```

### `POST /releases`  (content.publish)

Optional body `{ "note": "up to 200 chars" }` (may be omitted). Applies every draft in one transaction
(deletes removed, drafts become published, revisions pruned to 3 per block, release rows pruned to 3),
freezes the assembled snapshot as a release, then asks the dispatcher to build it. `201`:

```json
{ "id": 7, "status": "queued", "note": "Update experience",
  "createdBy": "uuid", "createdAt": "2026-11-26T22:12:00Z", "finishedAt": null, "runUrl": null }
```

`status` is `queued` normally; `failed` if the dispatcher threw (the publish itself stays committed).
`409` + `code: "nothing_to_publish"` when nothing is pending; `422` + `validation_failed` (with `id`,
`type`, `path`, `message` per error) if a saved draft no longer passes its schema. `403` with
`code: "forbidden"` without `content.publish`.

### `GET /releases`  (content.edit)

Last 3 releases, newest first, same shape as above (no snapshot).

### `POST /releases/{id}/rollback`  (content.publish)

No body. Creates a new `queued` release (note `Rollback to release #id`) holding the older snapshot and
dispatches it. Blocks are not changed. `201` same shape; `404` if the release is gone (only 3 are kept).
Also the way to retry a `failed` release.

### Summary

`GET /summary` field `draftPending` is now true when any block has a draft, pending delete or pending
reorder.

### Audit actions

`studio.save`, `studio.discard`, `studio.restore` (details: block ids and types only, never content),
`release.publish`, `release.rollback`.

### Dispatching

Without `profile.github.dispatch-token` the backend logs the release instead of building it (no network
call). With a token configured the real dispatch arrives in milestone M3; until then it refuses and the
release is marked `failed`.
