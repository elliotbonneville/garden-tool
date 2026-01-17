import { useLocation, useNavigate } from "react-router";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Dynamically import all .md files from research directory and subdirectories
const mdModules = import.meta.glob("../../research/*.md", { query: "?raw", import: "default" });
const plantModules = import.meta.glob("../../research/plants/*.md", { query: "?raw", import: "default" });

// Convert file paths to slug/title pairs
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Build document list from glob results
const docFiles: Record<string, () => Promise<string>> = {};
const researchDocs: { slug: string; title: string }[] = [];
const plantDocs: { slug: string; title: string }[] = [];

// Add main research docs
for (const path of Object.keys(mdModules)) {
  const match = path.match(/\/([^/]+)\.md$/);
  if (match && match[1]) {
    const slug = match[1];
    docFiles[slug] = mdModules[path] as () => Promise<string>;
    researchDocs.push({ slug, title: slugToTitle(slug) });
  }
}

// Add plant docs with "plants/" prefix
for (const path of Object.keys(plantModules)) {
  const match = path.match(/\/plants\/([^/]+)\.md$/);
  if (match && match[1]) {
    const slug = `plants/${match[1]}`;
    docFiles[slug] = plantModules[path] as () => Promise<string>;
    plantDocs.push({ slug, title: slugToTitle(match[1]) });
  }
}

// Sort with "plan" first, then alphabetically
researchDocs.sort((a, b) => {
  if (a.slug === "plan") return -1;
  if (b.slug === "plan") return 1;
  return a.title.localeCompare(b.title);
});

// Sort plant docs alphabetically
plantDocs.sort((a, b) => a.title.localeCompare(b.title));

// Build slug lookup for internal link detection (include both research and plant docs)
const slugSet = new Set([...researchDocs.map(d => d.slug), ...plantDocs.map(d => d.slug)]);

export function ResearchPanel() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract slug from path: /research/slug or /research/plants/slug
  const pathMatch = location.pathname.match(/^\/research\/(.+)$/);
  const slug = pathMatch?.[1] || null;
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeSlug = slug || "plan";
  const currentDoc = researchDocs.find(d => d.slug === activeSlug)
    || plantDocs.find(d => d.slug === activeSlug);

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

  const handleNavigate = (newSlug: string) => {
    if (newSlug !== activeSlug) {
      setHistory(prev => [...prev, activeSlug]);
      navigate(newSlug === "plan" ? "/" : `/research/${newSlug}`);
    }
    setMenuOpen(false);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prevSlug = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      navigate(prevSlug === "plan" ? "/" : `/research/${prevSlug}`);
    }
  };

  useEffect(() => {
    if (!docFiles[activeSlug]) {
      setContent("# Document not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    docFiles[activeSlug]()
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent("# Error loading document");
        setLoading(false);
      });
  }, [activeSlug]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#fff",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "#f6f8fa",
        borderBottom: "1px solid #d0d7de",
      }}>
        {/* Back button */}
        <button
          onClick={handleBack}
          disabled={history.length === 0}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            border: "1px solid #d0d7de",
            borderRadius: 6,
            background: history.length === 0 ? "#f6f8fa" : "#fff",
            color: history.length === 0 ? "#8c959f" : "#24292f",
            cursor: history.length === 0 ? "not-allowed" : "pointer",
            fontSize: 16,
          }}
        >
          ←
        </button>

        {/* Current page title */}
        <div style={{
          flex: 1,
          fontSize: 15,
          fontWeight: 600,
          color: "#24292f",
        }}>
          {currentDoc?.title || "Document"}
        </div>

        {/* Menu dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              border: "1px solid #d0d7de",
              borderRadius: 6,
              background: menuOpen ? "#e1e4e8" : "#fff",
              color: "#24292f",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Jump to
            <span style={{ fontSize: 10 }}>{menuOpen ? "▲" : "▼"}</span>
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 4,
              background: "#fff",
              border: "1px solid #d0d7de",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(140,149,159,0.2)",
              minWidth: 200,
              zIndex: 100,
              overflow: "hidden",
            }}>
              {researchDocs.map((doc) => (
                <button
                  key={doc.slug}
                  onClick={() => handleNavigate(doc.slug)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    background: doc.slug === activeSlug ? "#f6f8fa" : "#fff",
                    color: "#24292f",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: doc.slug === activeSlug ? 600 : 400,
                    borderLeft: doc.slug === activeSlug ? "3px solid #0969da" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (doc.slug !== activeSlug) {
                      e.currentTarget.style.background = "#f6f8fa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (doc.slug !== activeSlug) {
                      e.currentTarget.style.background = "#fff";
                    }
                  }}
                >
                  {doc.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        overflow: "auto",
        padding: "24px",
      }}>
        {loading ? (
          <div style={{ color: "#666", padding: 20 }}>Loading...</div>
        ) : (
          <article style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            fontSize: 14,
            lineHeight: 1.6,
            color: "#24292f",
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 style={{
                    fontSize: 24,
                    fontWeight: 600,
                    borderBottom: "1px solid #d0d7de",
                    paddingBottom: 8,
                    marginBottom: 16,
                    marginTop: 0,
                  }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{
                    fontSize: 18,
                    fontWeight: 600,
                    borderBottom: "1px solid #d0d7de",
                    paddingBottom: 6,
                    marginTop: 24,
                    marginBottom: 12,
                  }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    marginTop: 20,
                    marginBottom: 8,
                  }}>{children}</h3>
                ),
                p: ({ children }) => (
                  <p style={{ marginBottom: 12 }}>{children}</p>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: 4 }}>{children}</li>
                ),
                table: ({ children }) => (
                  <div style={{ overflowX: "auto", marginBottom: 12 }}>
                    <table style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: 13,
                    }}>{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead style={{ background: "#f6f8fa" }}>{children}</thead>
                ),
                th: ({ children }) => (
                  <th style={{
                    border: "1px solid #d0d7de",
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: 600,
                  }}>{children}</th>
                ),
                td: ({ children }) => (
                  <td style={{
                    border: "1px solid #d0d7de",
                    padding: "8px 10px",
                  }}>{children}</td>
                ),
                code: ({ className, children }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code style={{
                        background: "#f6f8fa",
                        padding: "2px 5px",
                        borderRadius: 4,
                        fontSize: 13,
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      }}>{children}</code>
                    );
                  }
                  return (
                    <code style={{
                      display: "block",
                      background: "#f6f8fa",
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      overflowX: "auto",
                      whiteSpace: "pre",
                    }}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre style={{
                    background: "#f6f8fa",
                    padding: 12,
                    borderRadius: 6,
                    marginBottom: 12,
                    overflowX: "auto",
                  }}>{children}</pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: "4px solid #d0d7de",
                    paddingLeft: 12,
                    margin: "0 0 12px 0",
                    color: "#57606a",
                  }}>{children}</blockquote>
                ),
                hr: () => (
                  <hr style={{
                    border: "none",
                    borderTop: "1px solid #d0d7de",
                    margin: "20px 0",
                  }} />
                ),
                a: ({ href, children }) => {
                  // Check if this is an internal link to another research doc
                  // Matches: "slug.md", "./slug.md", "slug", etc.
                  const match = href?.match(/^\.?\/?([a-z0-9-]+)(\.md)?$/i);
                  const potentialSlug = match?.[1];

                  if (potentialSlug && slugSet.has(potentialSlug)) {
                    return (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigate(potentialSlug);
                        }}
                        style={{
                          color: "#0969da",
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                      >
                        {children}
                      </a>
                    );
                  }

                  // External link - open in new tab
                  return (
                    <a
                      href={href}
                      style={{ color: "#0969da", textDecoration: "none" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  );
                },
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600 }}>{children}</strong>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
