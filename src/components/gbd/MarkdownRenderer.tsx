import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-foreground mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed text-muted-foreground mb-2">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside text-sm text-muted-foreground mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-muted-foreground mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 pl-3 my-2 text-sm italic text-muted-foreground" style={{ borderColor: 'hsl(var(--primary))' }}>
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClassName }) => {
            const isBlock = codeClassName?.includes('language-');
            if (isBlock) {
              return (
                <pre className="rounded-lg p-3 my-2 text-xs overflow-x-auto" style={{ background: 'hsl(var(--bg-input))' }}>
                  <code className="text-foreground">{children}</code>
                </pre>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded text-xs font-mono text-primary" style={{ background: 'hsl(var(--accent-dim))' }}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {children}
            </a>
          ),
          hr: () => <hr className="my-3 border-t" style={{ borderColor: 'hsl(var(--border))' }} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
