import { useState, useRef, useEffect } from "react";
import type { DocTree } from "./types";
import { ResearchNavItem } from "./ResearchNavItem";
import { findDocBySlug } from "./useResearchDocs";

interface ResearchNavCompactProps {
  tree: DocTree;
  activeSlug: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectDoc: (slug: string) => void;
}

export function ResearchNavCompact({
  tree,
  activeSlug,
  expandedFolders,
  onToggleFolder,
  onSelectDoc,
}: ResearchNavCompactProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentDoc = findDocBySlug(activeSlug);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (slug: string) => {
    onSelectDoc(slug);
    setMenuOpen(false);
  };

  return (
    <div
      ref={menuRef}
      style={{
        padding: "var(--space-3) var(--space-4)",
        borderBottom: "1px solid var(--bg-tertiary)",
      }}
    >
      {/* Dropdown trigger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--bg-secondary)",
          border: "1px solid var(--bg-tertiary)",
          borderRadius: "var(--border-radius)",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          transition: "all var(--transition-fast)",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-tertiary)" }}
          >
            <path d="M8 1H3C2.44772 1 2 1.44772 2 2V12C2 12.5523 2.44772 13 3 13H11C11.5523 13 12 12.5523 12 12V5L8 1Z" />
            <path d="M8 1V5H12" />
          </svg>
          {currentDoc?.title || "Select document"}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-fast)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </span>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            left: "var(--space-4)",
            right: "var(--space-4)",
            marginTop: "var(--space-2)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-tertiary)",
            borderRadius: "var(--border-radius)",
            boxShadow: "var(--shadow-medium)",
            maxHeight: 400,
            overflow: "auto",
            zIndex: 100,
          }}
        >
          {/* Root documents */}
          {tree.rootDocs.map((doc) => (
            <ResearchNavItem
              key={doc.slug}
              node={doc}
              depth={0}
              activeSlug={activeSlug}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectDoc={handleSelect}
            />
          ))}

          {/* Folders */}
          {tree.folders.length > 0 && tree.rootDocs.length > 0 && (
            <div
              style={{
                borderTop: "1px solid var(--bg-tertiary)",
                margin: "var(--space-2) 0",
              }}
            />
          )}

          {tree.folders.map((folder) => (
            <ResearchNavItem
              key={folder.path}
              node={folder}
              depth={0}
              activeSlug={activeSlug}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectDoc={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
