import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDocContent, isValidSlug } from "./useResearchDocs";

interface ResearchContentProps {
  slug: string;
  onNavigate: (slug: string) => void;
}

export function ResearchContent({ slug, onNavigate }: ResearchContentProps) {
  const { content, loading } = useDocContent(slug);

  if (loading) {
    return (
      <div style={{ color: "var(--text-tertiary)", padding: "var(--space-5)" }}>
        Loading...
      </div>
    );
  }

  return (
    <article
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-base)",
        lineHeight: "var(--leading-relaxed)",
        color: "var(--text-secondary)",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--bg-tertiary)",
                paddingBottom: "var(--space-3)",
                marginBottom: "var(--space-5)",
                marginTop: 0,
                lineHeight: "var(--leading-tight)",
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--bg-tertiary)",
                paddingBottom: "var(--space-2)",
                marginTop: "var(--space-8)",
                marginBottom: "var(--space-4)",
                lineHeight: "var(--leading-tight)",
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-primary)",
                marginTop: "var(--space-6)",
                marginBottom: "var(--space-3)",
                lineHeight: "var(--leading-snug)",
              }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p
              style={{
                marginBottom: "var(--space-4)",
                lineHeight: "var(--leading-relaxed)",
              }}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              style={{
                paddingLeft: "var(--space-5)",
                marginBottom: "var(--space-4)",
              }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              style={{
                paddingLeft: "var(--space-5)",
                marginBottom: "var(--space-4)",
              }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li
              style={{
                marginBottom: "var(--space-2)",
                lineHeight: "var(--leading-relaxed)",
              }}
            >
              {children}
            </li>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", marginBottom: "var(--space-4)" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: "var(--text-sm)",
                }}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: "var(--bg-secondary)" }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th
              style={{
                border: "1px solid var(--bg-tertiary)",
                padding: "var(--space-3) var(--space-4)",
                textAlign: "left",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-primary)",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                border: "1px solid var(--bg-tertiary)",
                padding: "var(--space-3) var(--space-4)",
              }}
            >
              {children}
            </td>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  style={{
                    background: "var(--bg-secondary)",
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent-secondary)",
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  display: "block",
                  background: "var(--bg-secondary)",
                  padding: "var(--space-4)",
                  borderRadius: "var(--border-radius)",
                  fontSize: "var(--text-sm)",
                  fontFamily: "var(--font-mono)",
                  overflowX: "auto",
                  whiteSpace: "pre",
                }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              style={{
                background: "var(--bg-secondary)",
                padding: "var(--space-4)",
                borderRadius: "var(--border-radius)",
                marginBottom: "var(--space-4)",
                overflowX: "auto",
              }}
            >
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "4px solid var(--accent-primary)",
                paddingLeft: "var(--space-4)",
                margin: "0 0 var(--space-4) 0",
                color: "var(--text-tertiary)",
                fontStyle: "italic",
              }}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr
              style={{
                border: "none",
                borderTop: "1px solid var(--bg-tertiary)",
                margin: "var(--space-6) 0",
              }}
            />
          ),
          a: ({ href, children }) => {
            // Check if this is an internal link to another research doc
            // Handle formats: "file.md", "./file.md", "folder/file.md", "folder/file"
            const match = href?.match(/^\.?\/?([a-z0-9-/]+)(\.md)?$/i);
            const potentialSlug = match?.[1];

            if (potentialSlug && isValidSlug(potentialSlug)) {
              return (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(potentialSlug);
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
            <strong
              style={{
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-primary)",
              }}
            >
              {children}
            </strong>
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
  );
}
