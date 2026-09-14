"use client";

import { usePathname } from "next/navigation";

import { useState } from "react";

import { ViewCard } from "./ViewCard";
import { useViewEditor } from "./ViewEditor";

import type { DragEvent } from "react";

import type { SidebarStyle } from "@/features/settings/settings";

import styles from "./Sidebar.module.css";

export function SidebarViews({ sidebarStyle }: Readonly<{ sidebarStyle: SidebarStyle }>) {
  const editing = usePathname() === "/views";
  const editor = useViewEditor();
  const { views } = editor;
  const [target, setTarget] = useState<
    Readonly<{ kind: "end" }> | Readonly<{ kind: "before"; id: string }> | null
  >(null);

  function dragOver(event: DragEvent, beforeId?: string) {
    if (!editing || editor.pending || editor.dragged === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setTarget(beforeId === undefined ? { kind: "end" } : { kind: "before", id: beforeId });
  }

  function drop(event: DragEvent, beforeId?: string) {
    event.preventDefault();
    event.stopPropagation();
    setTarget(null);
    editor.drop(beforeId);
  }

  return (
    <>
      <div
        className={`${styles.viewScroll} ${editing && editor.dragged !== null && target?.kind === "end" ? styles.dropAtEnd : ""}`}
        onDragOver={(event) => dragOver(event)}
        onDrop={editing ? (event) => drop(event) : undefined}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setTarget(null);
          }
        }}
      >
        <ul aria-label="Sidebar views" aria-busy={editor.pending} className={styles.viewList}>
          {views.map((view) => (
            <li key={view.id}>
              <div
                className={`${styles.sidebarView} ${
                  editing &&
                  editor.dragged !== null &&
                  target?.kind === "before" &&
                  target.id === view.id
                    ? styles.dropBefore
                    : ""
                }`}
                onDragOver={(event) => dragOver(event, view.id)}
                onDrop={editing ? (event) => drop(event, view.id) : undefined}
              >
                <ViewCard sidebarStyle={sidebarStyle} view={view} />
                {editing ? (
                  <button
                    aria-label={`Remove ${view.label}`}
                    className={styles.removeView}
                    onClick={() => editor.remove(view.id)}
                    disabled={editor.pending}
                    type="button"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {editing && editor.error ? (
        <p className={styles.editStatus} role="alert">
          {editor.error}
        </p>
      ) : null}
    </>
  );
}
