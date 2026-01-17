// Research file service - exposes markdown files to the agent

// Dynamically import all .md files from research directory
const mdModules = import.meta.glob("../../research/*.md", { query: "?raw", import: "default" });
const plantModules = import.meta.glob("../../research/plants/*.md", { query: "?raw", import: "default" });

// Also import the layout JSON
const layoutModules = import.meta.glob("../../research/*.json", { query: "?raw", import: "default" });

// Strip YAML frontmatter from markdown content
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? content.slice(match[0].length) : content;
}

// Build document registry
interface DocInfo {
  slug: string;
  title: string;
  loader: () => Promise<string>;
  type: "markdown" | "json";
}

const documents: Map<string, DocInfo> = new Map();

// Add main research docs
for (const path of Object.keys(mdModules)) {
  const match = path.match(/\/([^/]+)\.md$/);
  if (match && match[1]) {
    const slug = match[1];
    documents.set(slug, {
      slug,
      title: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      loader: mdModules[path] as () => Promise<string>,
      type: "markdown",
    });
  }
}

// Add plant docs
for (const path of Object.keys(plantModules)) {
  const match = path.match(/\/plants\/([^/]+)\.md$/);
  if (match && match[1]) {
    const slug = `plants/${match[1]}`;
    documents.set(slug, {
      slug,
      title: match[1].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      loader: plantModules[path] as () => Promise<string>,
      type: "markdown",
    });
  }
}

// Add layout JSON files
for (const path of Object.keys(layoutModules)) {
  const match = path.match(/\/([^/]+)\.json$/);
  if (match && match[1]) {
    const slug = match[1];
    documents.set(slug, {
      slug,
      title: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      loader: layoutModules[path] as () => Promise<string>,
      type: "json",
    });
  }
}

/**
 * List all available research documents
 */
export function listDocuments(): { slug: string; title: string; type: string }[] {
  return Array.from(documents.values()).map(d => ({
    slug: d.slug,
    title: d.title,
    type: d.type,
  })).sort((a, b) => {
    // Plan first, then alphabetically
    if (a.slug === "plan") return -1;
    if (b.slug === "plan") return 1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Read a specific document by slug
 */
export async function readDocument(slug: string): Promise<string | null> {
  const doc = documents.get(slug);
  if (!doc) {
    // Try with common variations
    const variations = [
      slug,
      slug.toLowerCase(),
      slug.replace(/ /g, "-").toLowerCase(),
    ];
    for (const variant of variations) {
      const found = documents.get(variant);
      if (found) {
        const content = await found.loader();
        return found.type === "markdown" ? stripFrontmatter(content) : content;
      }
    }
    return null;
  }
  const content = await doc.loader();
  return doc.type === "markdown" ? stripFrontmatter(content) : content;
}

/**
 * Search documents for a keyword (searches titles and content)
 */
export async function searchDocuments(query: string): Promise<{ slug: string; title: string; snippet: string }[]> {
  const results: { slug: string; title: string; snippet: string }[] = [];
  const lowerQuery = query.toLowerCase();

  for (const doc of documents.values()) {
    // Check title match
    if (doc.title.toLowerCase().includes(lowerQuery)) {
      const content = await doc.loader();
      const cleanContent = doc.type === "markdown" ? stripFrontmatter(content) : content;
      results.push({
        slug: doc.slug,
        title: doc.title,
        snippet: cleanContent.slice(0, 200) + "...",
      });
      continue;
    }

    // Check content match
    const content = await doc.loader();
    const cleanContent = doc.type === "markdown" ? stripFrontmatter(content) : content;
    const lowerContent = cleanContent.toLowerCase();
    const idx = lowerContent.indexOf(lowerQuery);
    if (idx !== -1) {
      // Extract snippet around the match
      const start = Math.max(0, idx - 50);
      const end = Math.min(cleanContent.length, idx + query.length + 150);
      const snippet = (start > 0 ? "..." : "") + cleanContent.slice(start, end) + (end < cleanContent.length ? "..." : "");
      results.push({
        slug: doc.slug,
        title: doc.title,
        snippet,
      });
    }
  }

  return results;
}
