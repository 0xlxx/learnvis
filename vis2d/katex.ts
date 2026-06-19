declare global { interface Window { katex?: { renderToString(src: string, opts?: Record<string, unknown>): string } } }

export const katexify = (html: string): string => {
  if (typeof window === 'undefined' || !window.katex) return html;
  return html.replace(/\$\$([^$]+)\$\$/g, (_: string, m: string) => window.katex!.renderToString(m, { throwOnError: false, displayMode: true }))
    .replace(/\$([^$]+)\$/g, (_: string, m: string) => window.katex!.renderToString(m, { throwOnError: false }));
};
