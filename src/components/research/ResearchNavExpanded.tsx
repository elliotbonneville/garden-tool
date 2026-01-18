import type { DocTree } from "./types";
import { ResearchNavItem } from "./ResearchNavItem";

interface ResearchNavExpandedProps {
  tree: DocTree;
  activeSlug: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectDoc: (slug: string) => void;
}

export function ResearchNavExpanded({
  tree,
  activeSlug,
  expandedFolders,
  onToggleFolder,
  onSelectDoc,
}: ResearchNavExpandedProps) {
  return (
    <nav
      style={{
        width: 260,
        minWidth: 260,
        height: "100%",
        borderRight: "1px solid var(--bg-tertiary)",
        background: "var(--bg-secondary)",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--space-4) var(--space-4)",
          borderBottom: "1px solid var(--bg-tertiary)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          Research
        </h2>
      </div>

      {/* Tree content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-2) 0",
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
            onSelectDoc={onSelectDoc}
          />
        ))}

        {/* Separator between root docs and folders */}
        {tree.folders.length > 0 && tree.rootDocs.length > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--bg-tertiary)",
              margin: "var(--space-3) var(--space-3)",
            }}
          />
        )}

        {/* Folders */}
        {tree.folders.map((folder) => (
          <ResearchNavItem
            key={folder.path}
            node={folder}
            depth={0}
            activeSlug={activeSlug}
            expandedFolders={expandedFolders}
            onToggleFolder={onToggleFolder}
            onSelectDoc={onSelectDoc}
          />
        ))}
      </div>
    </nav>
  );
}
