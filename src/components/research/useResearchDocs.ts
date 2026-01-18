import { useState, useEffect, useMemo } from "react";
import type { DocNode, FolderNode, DocTree, TreeNode } from "./types";

// Dynamically import all .md files from research directory (up to 3 levels deep)
// Path is relative from src/components/research/ -> need to go up 3 levels to reach project root
const allModules = import.meta.glob([
  "../../../research/*.md",
  "../../../research/*/*.md",
  "../../../research/*/*/*.md",
], { query: "?raw", import: "default" });

// Convert slug to title
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Strip YAML frontmatter from markdown content
export function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? content.slice(match[0].length) : content;
}

// Build the document tree from glob results
function buildDocTree(): { tree: DocTree; docFiles: Record<string, () => Promise<string>>; slugSet: Set<string> } {
  const docFiles: Record<string, () => Promise<string>> = {};
  const rootDocs: DocNode[] = [];
  const foldersMap: Map<string, FolderNode> = new Map();
  const slugSet = new Set<string>();

  // Process all discovered files
  for (const [path, loader] of Object.entries(allModules)) {
    // Extract path components: ../../research/[path/to/file].md
    const match = path.match(/\/research\/(.+)\.md$/);
    if (!match || !match[1]) continue;

    const relativePath = match[1]; // e.g., "plan", "plants/tomato", "topic/sub/file"
    const parts = relativePath.split("/");
    const fileName = parts[parts.length - 1] ?? relativePath;
    const slug = relativePath;

    // Register the file loader
    docFiles[slug] = loader as () => Promise<string>;
    slugSet.add(slug);

    const docNode: DocNode = {
      type: "doc",
      slug,
      title: slugToTitle(fileName),
      path,
    };

    if (parts.length === 1) {
      // Root-level document
      rootDocs.push(docNode);
    } else {
      // Nested document - ensure folder hierarchy exists
      let currentPath = "";
      let parentFolder: FolderNode | null = null;

      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i] ?? "";
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        if (!foldersMap.has(currentPath)) {
          const folder: FolderNode = {
            type: "folder",
            name: folderName,
            title: slugToTitle(folderName),
            path: currentPath,
            children: [],
          };
          foldersMap.set(currentPath, folder);

          // Add to parent folder or root
          if (parentFolder) {
            parentFolder.children.push(folder);
          }
        }

        parentFolder = foldersMap.get(currentPath)!;
      }

      // Add document to its immediate parent folder
      if (parentFolder) {
        parentFolder.children.push(docNode);
      }
    }
  }

  // Sort root docs: "plan" first, then alphabetically
  rootDocs.sort((a, b) => {
    if (a.slug === "plan") return -1;
    if (b.slug === "plan") return 1;
    return a.title.localeCompare(b.title);
  });

  // Get top-level folders (those without a "/" in their path)
  const topLevelFolders = Array.from(foldersMap.values()).filter(
    (f) => !f.path.includes("/")
  );

  // Sort folders alphabetically
  topLevelFolders.sort((a, b) => a.title.localeCompare(b.title));

  // Sort children within each folder
  const sortChildren = (folder: FolderNode) => {
    folder.children.sort((a, b) => {
      // Folders before docs
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });

    // Recursively sort nested folders
    folder.children.forEach((child) => {
      if (child.type === "folder") {
        sortChildren(child);
      }
    });
  };

  topLevelFolders.forEach(sortChildren);

  return {
    tree: { rootDocs, folders: topLevelFolders },
    docFiles,
    slugSet,
  };
}

// Build once at module load
const { tree: docTree, docFiles, slugSet } = buildDocTree();

// Flatten tree for dropdown display
export function flattenTree(tree: DocTree): Array<{ node: TreeNode; depth: number; folderPath?: string }> {
  const result: Array<{ node: TreeNode; depth: number; folderPath?: string }> = [];

  // Add root docs first
  tree.rootDocs.forEach((doc) => {
    result.push({ node: doc, depth: 0 });
  });

  // Add folders with their contents
  const addFolder = (folder: FolderNode, depth: number) => {
    result.push({ node: folder, depth, folderPath: folder.path });

    folder.children.forEach((child) => {
      if (child.type === "folder") {
        addFolder(child, depth + 1);
      } else {
        result.push({ node: child, depth: depth + 1, folderPath: folder.path });
      }
    });
  };

  tree.folders.forEach((folder) => addFolder(folder, 0));

  return result;
}

// Hook for loading document content
export function useDocContent(slug: string) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docFiles[slug]) {
      setContent("# Document not found");
      setLoading(false);
      setError("Document not found");
      return;
    }

    setLoading(true);
    setError(null);

    docFiles[slug]()
      .then((text) => {
        setContent(stripFrontmatter(text));
        setLoading(false);
      })
      .catch((err) => {
        setContent("# Error loading document");
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  return { content, loading, error };
}

// Hook for accessing the document tree
export function useResearchDocs() {
  return useMemo(
    () => ({
      tree: docTree,
      docFiles,
      slugSet,
      flatList: flattenTree(docTree),
    }),
    []
  );
}

// Find a document by slug
export function findDocBySlug(slug: string): DocNode | null {
  // Check root docs
  const rootDoc = docTree.rootDocs.find((d) => d.slug === slug);
  if (rootDoc) return rootDoc;

  // Search recursively in folders
  const searchFolder = (folder: FolderNode): DocNode | null => {
    for (const child of folder.children) {
      if (child.type === "doc" && child.slug === slug) {
        return child;
      }
      if (child.type === "folder") {
        const found = searchFolder(child);
        if (found) return found;
      }
    }
    return null;
  };

  for (const folder of docTree.folders) {
    const found = searchFolder(folder);
    if (found) return found;
  }

  return null;
}

// Check if a slug exists
export function isValidSlug(slug: string): boolean {
  return slugSet.has(slug);
}

// Get breadcrumb path for a slug
export function getBreadcrumbs(slug: string): Array<{ slug: string; title: string }> {
  const parts = slug.split("/");
  const breadcrumbs: Array<{ slug: string; title: string }> = [];

  for (let i = 0; i < parts.length; i++) {
    const partialSlug = parts.slice(0, i + 1).join("/");
    const isLast = i === parts.length - 1;
    const part = parts[i] ?? "";

    if (isLast) {
      // Document
      const doc = findDocBySlug(partialSlug);
      if (doc) {
        breadcrumbs.push({ slug: doc.slug, title: doc.title });
      }
    } else {
      // Folder
      breadcrumbs.push({ slug: partialSlug, title: slugToTitle(part) });
    }
  }

  return breadcrumbs;
}
