export const katexify = (html) => {
  if (typeof window === 'undefined' || !window.katex) return html;
  return html.replace(/\$\$([^$]+)\$\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false, displayMode: true }))
    .replace(/\$([^$]+)\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false }));
};
