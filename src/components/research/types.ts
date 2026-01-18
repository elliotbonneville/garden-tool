// Types for research wiki navigation

export interface DocNode {
  type: "doc";
  slug: string;      // Full path slug, e.g., "plants/tomato"
  title: string;     // Display title, e.g., "Tomato"
  path: string;      // Original file path for loading
}

export interface FolderNode {
  type: "folder";
  name: string;      // Folder name, e.g., "plants"
  title: string;     // Display title, e.g., "Plants"
  path: string;      // Full folder path, e.g., "plants" or "plants/vegetables"
  children: TreeNode[];
}

export type TreeNode = DocNode | FolderNode;

export interface DocTree {
  rootDocs: DocNode[];
  folders: FolderNode[];
}

export type NavMode = "compact" | "expanded";
