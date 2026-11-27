import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  History,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import type { BlockSchema } from "@/api/studioApi";
import BlockForm from "./BlockForm";
import { dataOf, fillTemplate, listItems, type Item } from "./model";
import type { StudioModel } from "./useStudio";

type Props = {
  studio: StudioModel;
  schema: BlockSchema;
  /** Fixed lists (page SEO) cannot add, move or remove items. */
  fixed?: boolean;
  onHistory: (blockId: string, title: string) => void;
  announce: (msg: string) => void;
};

export default function CollectionEditor({
  studio,
  schema,
  fixed,
  onHistory,
  announce,
}: Props) {
  const type = schema["x-studio"].type;
  const items = listItems(studio.blocks, studio.edits, type);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [focusKey, setFocusKey] = useState<string>();
  const [undo, setUndo] = useState<{ key: string; title: string }>();
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function titleOf(it: Item) {
    const d = dataOf(studio.blocks, studio.edits, it.key);
    return (
      fillTemplate(schema["x-studio"].itemTitle, d) ||
      (it.isNew ? "New item" : (it.block?.slug ?? "Item"))
    );
  }

  function add() {
    const key = studio.add(type);
    setOpen((o) => ({ ...o, [key]: true }));
    setFocusKey(key);
    announce("New item added at the top.");
  }
  function remove(it: Item) {
    const title = titleOf(it);
    studio.remove(it.key);
    setUndo({ key: it.key, title });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setUndo(undefined), 5000);
  }
  function move(it: Item, dir: -1 | 1) {
    studio.move(type, it.key, dir);
    const i = items.findIndex((x) => x.key === it.key) + dir;
    announce(`${titleOf(it)} moved to position ${i + 1} of ${items.length}.`);
    requestAnimationFrame(() =>
      document
        .getElementById(`move-${it.key}-${dir < 0 ? "up" : "down"}`)
        ?.focus(),
    );
  }

  return (
    <section className="studio-collection" aria-label={schema.title}>
      <div className="studio-section-head">
        <h2 className="panel-title">{schema["x-studio"].section}</h2>
        {!fixed && (
          <button type="button" className="studio-button" onClick={add}>
            <Plus size={16} aria-hidden="true" /> Add
          </button>
        )}
      </div>
      {items.length === 0 && (
        <p className="page-small">Nothing here yet.{!fixed && " Use Add."}</p>
      )}
      <ul className="studio-cards">
        {items.map((it, i) => (
          <Card
            key={it.key}
            studio={studio}
            schema={schema}
            item={it}
            title={titleOf(it)}
            subtitle={fillTemplate(
              schema["x-studio"].itemSubtitle,
              dataOf(studio.blocks, studio.edits, it.key),
            )}
            expanded={!!open[it.key]}
            toggle={() => setOpen((o) => ({ ...o, [it.key]: !o[it.key] }))}
            first={i === 0}
            last={i === items.length - 1}
            fixed={fixed}
            autoFocus={focusKey === it.key}
            onMove={(d) => move(it, d)}
            onDuplicate={() => {
              const k = studio.duplicate(type, it.key);
              setOpen((o) => ({ ...o, [k]: true }));
              setFocusKey(k);
              announce("Item duplicated below.");
            }}
            onRemove={() => remove(it)}
            onHistory={() => it.block && onHistory(it.block.id, titleOf(it))}
          />
        ))}
      </ul>
      {undo && (
        <div className="studio-toast" role="status">
          <span>Removed “{undo.title}”.</span>
          <button
            type="button"
            className="studio-button-secondary"
            onClick={() => {
              studio.undoRemove(undo.key);
              setUndo(undefined);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}

function Card({
  studio,
  schema,
  item,
  title,
  subtitle,
  expanded,
  toggle,
  first,
  last,
  fixed,
  autoFocus,
  onMove,
  onDuplicate,
  onRemove,
  onHistory,
}: {
  studio: StudioModel;
  schema: BlockSchema;
  item: Item;
  title: string;
  subtitle: string;
  expanded: boolean;
  toggle: () => void;
  first: boolean;
  last: boolean;
  fixed?: boolean;
  autoFocus: boolean;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onHistory: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [menuUp, setMenuUp] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const dirty = studio.contentKeys.has(item.key);
  const conflict = studio.conflicts.includes(item.key);
  const errCount = Object.keys(studio.errors[item.key] ?? {}).length;
  useEffect(() => {
    if (autoFocus && expanded)
      body.current
        ?.querySelector<HTMLElement>("input,textarea,select")
        ?.focus();
  }, [autoFocus, expanded]);
  // Errors force the card open so the focusable summary can reach the field.
  const show = expanded || errCount > 0;
  const bodyId = `card-body-${item.key}`;
  return (
    <li className="studio-card" data-dirty={dirty || undefined}>
      <div className="studio-card-head">
        <button
          type="button"
          className="studio-card-toggle"
          aria-expanded={show}
          aria-controls={bodyId}
          onClick={toggle}
        >
          {show ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
          <span className="studio-card-title">
            {title}
            {dirty && (
              <span
                className="studio-dot"
                aria-label="Unsaved changes"
                role="img"
              />
            )}
            {item.isNew && <span className="studio-pill">New</span>}
            {!item.isNew && item.block?.pending && (
              <span className="studio-pill studio-pill--pending">Not live</span>
            )}
          </span>
          {subtitle && <span className="studio-card-sub">{subtitle}</span>}
        </button>
        {!fixed && (
          <div className="studio-card-actions">
            <button
              type="button"
              id={`move-${item.key}-up`}
              className="studio-icon-btn"
              aria-label={`Move ${title} up`}
              disabled={first}
              onClick={() => onMove(-1)}
            >
              ▲
            </button>
            <button
              type="button"
              id={`move-${item.key}-down`}
              className="studio-icon-btn"
              aria-label={`Move ${title} down`}
              disabled={last}
              onClick={() => onMove(1)}
            >
              ▼
            </button>
          </div>
        )}
        <div className="studio-menu-wrap">
          <button
            type="button"
            className="studio-icon-btn"
            aria-label={`More actions for ${title}`}
            aria-expanded={menu}
            aria-haspopup="true"
            onClick={(e) => {
              setMenuUp(
                e.currentTarget.getBoundingClientRect().bottom + 220 >
                  window.innerHeight - 120,
              );
              setMenu((m) => !m);
            }}
            onKeyDown={(e) => e.key === "Escape" && setMenu(false)}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>
          {menu && (
            <ul
              className={`studio-menu${menuUp ? " studio-menu--up" : ""}`}
              onKeyDown={(e) => e.key === "Escape" && setMenu(false)}
            >
              {!item.isNew && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onHistory();
                    }}
                  >
                    <History size={16} aria-hidden="true" /> History
                  </button>
                </li>
              )}
              {!fixed && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false);
                        onDuplicate();
                      }}
                    >
                      Duplicate
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="studio-menu-danger"
                      onClick={() => {
                        setMenu(false);
                        onRemove();
                      }}
                    >
                      Remove
                    </button>
                  </li>
                </>
              )}
            </ul>
          )}
        </div>
      </div>
      {conflict && (
        <div
          role="alert"
          className="page-notice page-notice--error studio-conflict"
        >
          <span>
            This item was changed by someone else since you opened it.
          </span>
          <div className="page-actions">
            <button
              type="button"
              className="studio-button-secondary"
              onClick={() =>
                void studio.refreshAfterConflict(false, [item.key])
              }
            >
              Load their version
            </button>
            <button
              type="button"
              className="studio-button-secondary"
              onClick={() => void studio.refreshAfterConflict(true, [item.key])}
            >
              Keep mine
            </button>
          </div>
        </div>
      )}
      <div id={bodyId} ref={body} hidden={!show} className="studio-card-body">
        {show && (
          <BlockForm
            studio={studio}
            schema={schema}
            blockKey={item.key}
            data={dataOf(studio.blocks, studio.edits, item.key)}
          />
        )}
      </div>
    </li>
  );
}
