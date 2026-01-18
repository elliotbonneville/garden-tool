import type { TreeNode, FolderNode, DocNode } from "./types";

interface ResearchNavItemProps {
  node: TreeNode;
  depth: number;
  activeSlug: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectDoc: (slug: string) => void;
}

export function ResearchNavItem({
  node,
  depth,
  activeSlug,
  expandedFolders,
  onToggleFolder,
  onSelectDoc,
}: ResearchNavItemProps) {
  const indent = depth * 16;

  if (node.type === "folder") {
    return (
      <FolderItem
        folder={node}
        depth={depth}
        indent={indent}
        activeSlug={activeSlug}
        expandedFolders={expandedFolders}
        onToggleFolder={onToggleFolder}
        onSelectDoc={onSelectDoc}
      />
    );
  }

  return (
    <DocItem
      doc={node}
      indent={indent}
      isActive={node.slug === activeSlug}
      onSelect={onSelectDoc}
    />
  );
}

interface FolderItemProps {
  folder: FolderNode;
  depth: number;
  indent: number;
  activeSlug: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectDoc: (slug: string) => void;
}

function FolderItem({
  folder,
  depth,
  indent,
  activeSlug,
  expandedFolders,
  onToggleFolder,
  onSelectDoc,
}: FolderItemProps) {
  const isExpanded = expandedFolders.has(folder.path);

  return (
    <div>
      <button
        onClick={() => onToggleFolder(folder.path)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          width: "100%",
          padding: "var(--space-2) var(--space-3)",
          paddingLeft: `calc(var(--space-3) + ${indent}px)`,
          border: "none",
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)",
          fontFamily: "var(--font-body)",
          textAlign: "left",
          transition: "all var(--transition-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Folder expand/collapse icon */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            color: "var(--text-tertiary)",
            transition: "transform var(--transition-fast)",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            <path d="M3 1L7 5L3 9" />
          </svg>
        </span>

        {/* Folder icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--accent-primary)", flexShrink: 0 }}
        >
          {isExpanded ? (
            <path d="M1 4V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V5C13 4.44772 12.5523 4 12 4H7L5 2H2C1.44772 2 1 2.44772 1 3V4Z" />
          ) : (
            <path d="M1 3C1 2.44772 1.44772 2 2 2H5L7 4H12C12.5523 4 13 4.44772 13 5V12C13 12.5523 12.5523 13 12 13H2C1.44772 13 1 12.5523 1 12V3Z" />
          )}
        </svg>

        <span>{folder.title}</span>
      </button>

      {/* Folder children */}
      {isExpanded && (
        <div>
          {folder.children.map((child) => (
            <ResearchNavItem
              key={child.type === "folder" ? child.path : child.slug}
              node={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectDoc={onSelectDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DocItemProps {
  doc: DocNode;
  indent: number;
  isActive: boolean;
  onSelect: (slug: string) => void;
}

function DocItem({ doc, indent, isActive, onSelect }: DocItemProps) {
  return (
    <button
      onClick={() => onSelect(doc.slug)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        width: "100%",
        padding: "var(--space-2) var(--space-3)",
        paddingLeft: `calc(var(--space-3) + ${indent}px)`,
        border: "none",
        background: isActive ? "var(--bg-secondary)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: "var(--text-sm)",
        fontWeight: isActive ? "var(--weight-medium)" : "var(--weight-normal)",
        fontFamily: "var(--font-body)",
        textAlign: "left",
        borderLeft: isActive
          ? "3px solid var(--accent-primary)"
          : "3px solid transparent",
        transition: "all var(--transition-fast)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "var(--bg-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {/* Document icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
      >
        <path d="M8 1H3C2.44772 1 2 1.44772 2 2V12C2 12.5523 2.44772 13 3 13H11C11.5523 13 12 12.5523 12 12V5L8 1Z" />
        <path d="M8 1V5H12" />
      </svg>

      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {doc.title}
      </span>
    </button>
  );
}
