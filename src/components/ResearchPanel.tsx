import { useLocation, useNavigate } from "react-router";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Dynamically import all .md files from research directory and subdirectories
const mdModules = import.meta.glob("../../research/*.md", { query: "?raw", import: "default" });
const plantModules = import.meta.glob("../../research/plants/*.md", { query: "?raw", import: "default" });

// Strip YAML frontmatter from markdown content
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? content.slice(match[0].length) : content;
}

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

// Build slug lookup for internal link detection
const slugSet = new Set([...researchDocs.map(d => d.slug), ...plantDocs.map(d => d.slug)]);

export function ResearchPanel() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract slug from path
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
        setContent(stripFrontmatter(text));
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
      background: "var(--bg-primary)",
      fontFamily: "var(--font-body)",
    }}>
      {/* Navigation bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderBottom: "1px solid var(--bg-tertiary)",
        background: "var(--bg-secondary)",
      }}>
        {/* Back button */}
        <button
          onClick={handleBack}
          disabled={history.length === 0}
          aria-label="Go back"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            border: "1px solid var(--bg-tertiary)",
            borderRadius: "var(--border-radius-sm)",
            background: history.length === 0 ? "var(--bg-secondary)" : "var(--bg-elevated)",
            color: history.length === 0 ? "var(--text-tertiary)" : "var(--text-secondary)",
            cursor: history.length === 0 ? "not-allowed" : "pointer",
            fontSize: "var(--text-base)",
            transition: "all var(--transition-fast)",
          }}
        >
          ←
        </button>

        {/* Current page title */}
        <div style={{
          flex: 1,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {currentDoc?.title || "Document"}
        </div>

        {/* Menu dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--bg-tertiary)",
              borderRadius: "var(--border-radius)",
              background: menuOpen ? "var(--bg-tertiary)" : "var(--bg-elevated)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--weight-medium)",
              fontFamily: "var(--font-body)",
              transition: "all var(--transition-fast)",
            }}
          >
            Jump to
            <span style={{ fontSize: "var(--text-xs)" }}>{menuOpen ? "▲" : "▼"}</span>
          </button>

          {menuOpen && (
            <div
              role="listbox"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "var(--space-1)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-tertiary)",
                borderRadius: "var(--border-radius)",
                boxShadow: "var(--shadow-medium)",
                minWidth: 220,
                maxHeight: 400,
                overflow: "auto",
                zIndex: 100,
              }}
            >
              {researchDocs.map((doc) => (
                <button
                  key={doc.slug}
                  role="option"
                  aria-selected={doc.slug === activeSlug}
                  onClick={() => handleNavigate(doc.slug)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "var(--space-3) var(--space-4)",
                    border: "none",
                    background: doc.slug === activeSlug ? "var(--bg-secondary)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                    fontWeight: doc.slug === activeSlug ? "var(--weight-semibold)" : "var(--weight-normal)",
                    fontFamily: "var(--font-body)",
                    borderLeft: doc.slug === activeSlug
                      ? "3px solid var(--accent-primary)"
                      : "3px solid transparent",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    if (doc.slug !== activeSlug) {
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (doc.slug !== activeSlug) {
                      e.currentTarget.style.background = "var(--bg-elevated)";
                    }
                  }}
                >
                  {doc.title}
                </button>
              ))}

              {/* Plant docs section */}
              {plantDocs.length > 0 && (
                <>
                  <div style={{
                    padding: "var(--space-2) var(--space-4)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-semibold)",
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderTop: "1px solid var(--bg-tertiary)",
                    marginTop: "var(--space-1)",
                  }}>
                    Plants
                  </div>
                  {plantDocs.map((doc) => (
                    <button
                      key={doc.slug}
                      role="option"
                      aria-selected={doc.slug === activeSlug}
                      onClick={() => handleNavigate(doc.slug)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "var(--space-2) var(--space-4)",
                        paddingLeft: "var(--space-6)",
                        border: "none",
                        background: doc.slug === activeSlug ? "var(--bg-secondary)" : "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "var(--text-sm)",
                        fontWeight: doc.slug === activeSlug ? "var(--weight-semibold)" : "var(--weight-normal)",
                        fontFamily: "var(--font-body)",
                        borderLeft: doc.slug === activeSlug
                          ? "3px solid var(--accent-primary)"
                          : "3px solid transparent",
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        if (doc.slug !== activeSlug) {
                          e.currentTarget.style.background = "var(--bg-secondary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (doc.slug !== activeSlug) {
                          e.currentTarget.style.background = "var(--bg-elevated)";
                        }
                      }}
                    >
                      {doc.title}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        overflow: "auto",
        padding: "var(--space-6)",
      }}>
        {loading ? (
          <div style={{ color: "var(--text-tertiary)", padding: "var(--space-5)" }}>
            Loading...
          </div>
        ) : (
          <article style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-secondary)",
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-2xl)",
                    fontWeight: "var(--weight-semibold)",
                    color: "var(--text-primary)",
                    borderBottom: "1px solid var(--bg-tertiary)",
                    paddingBottom: "var(--space-3)",
                    marginBottom: "var(--space-5)",
                    marginTop: 0,
                    lineHeight: "var(--leading-tight)",
                  }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-xl)",
                    fontWeight: "var(--weight-semibold)",
                    color: "var(--text-primary)",
                    borderBottom: "1px solid var(--bg-tertiary)",
                    paddingBottom: "var(--space-2)",
                    marginTop: "var(--space-8)",
                    marginBottom: "var(--space-4)",
                    lineHeight: "var(--leading-tight)",
                  }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--weight-semibold)",
                    color: "var(--text-primary)",
                    marginTop: "var(--space-6)",
                    marginBottom: "var(--space-3)",
                    lineHeight: "var(--leading-snug)",
                  }}>{children}</h3>
                ),
                p: ({ children }) => (
                  <p style={{ marginBottom: "var(--space-4)", lineHeight: "var(--leading-relaxed)" }}>{children}</p>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: "var(--space-5)", marginBottom: "var(--space-4)" }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: "var(--space-5)", marginBottom: "var(--space-4)" }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: "var(--space-2)", lineHeight: "var(--leading-relaxed)" }}>{children}</li>
                ),
                table: ({ children }) => (
                  <div style={{ overflowX: "auto", marginBottom: "var(--space-4)" }}>
                    <table style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: "var(--text-sm)",
                    }}>{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead style={{ background: "var(--bg-secondary)" }}>{children}</thead>
                ),
                th: ({ children }) => (
                  <th style={{
                    border: "1px solid var(--bg-tertiary)",
                    padding: "var(--space-3) var(--space-4)",
                    textAlign: "left",
                    fontWeight: "var(--weight-semibold)",
                    color: "var(--text-primary)",
                  }}>{children}</th>
                ),
                td: ({ children }) => (
                  <td style={{
                    border: "1px solid var(--bg-tertiary)",
                    padding: "var(--space-3) var(--space-4)",
                  }}>{children}</td>
                ),
                code: ({ className, children }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code style={{
                        background: "var(--bg-secondary)",
                        padding: "var(--space-1) var(--space-2)",
                        borderRadius: "var(--border-radius-sm)",
                        fontSize: "var(--text-sm)",
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-secondary)",
                      }}>{children}</code>
                    );
                  }
                  return (
                    <code style={{
                      display: "block",
                      background: "var(--bg-secondary)",
                      padding: "var(--space-4)",
                      borderRadius: "var(--border-radius)",
                      fontSize: "var(--text-sm)",
                      fontFamily: "var(--font-mono)",
                      overflowX: "auto",
                      whiteSpace: "pre",
                    }}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre style={{
                    background: "var(--bg-secondary)",
                    padding: "var(--space-4)",
                    borderRadius: "var(--border-radius)",
                    marginBottom: "var(--space-4)",
                    overflowX: "auto",
                  }}>{children}</pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: "4px solid var(--accent-primary)",
                    paddingLeft: "var(--space-4)",
                    margin: "0 0 var(--space-4) 0",
                    color: "var(--text-tertiary)",
                    fontStyle: "italic",
                  }}>{children}</blockquote>
                ),
                hr: () => (
                  <hr style={{
                    border: "none",
                    borderTop: "1px solid var(--bg-tertiary)",
                    margin: "var(--space-6) 0",
                  }} />
                ),
                a: ({ href, children }) => {
                  // Check if this is an internal link to another research doc
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
                          color: "var(--accent-secondary)",
                          textDecoration: "none",
                          cursor: "pointer",
                          fontWeight: "var(--weight-medium)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
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
                      style={{
                        color: "var(--accent-secondary)",
                        textDecoration: "none",
                        fontWeight: "var(--weight-medium)",
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {children}
                    </a>
                  );
                },
                strong: ({ children }) => (
                  <strong style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>{children}</strong>
                ),
                input: ({ type, checked, disabled }) => {
                  if (type === "checkbox") {
                    return (
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        readOnly
                        style={{
                          marginRight: "var(--space-2)",
                          accentColor: "var(--accent-primary)",
                        }}
                      />
                    );
                  }
                  return null;
                },
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
