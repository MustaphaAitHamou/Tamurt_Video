import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Rendu Markdown sûr : le HTML brut éventuel est ignoré (pas de rehype-raw),
 * les liens externes s'ouvrent sans transmettre l'origine.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      dir="auto"
      className={cn(
        "space-y-4 leading-relaxed text-white/85 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-s-2 [&_blockquote]:border-primary [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ms-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:text-foreground [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:text-start [&_ul]:list-disc [&_ul]:space-y-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children: content }) =>
            href?.startsWith("/") ? (
              <a href={href}>{content}</a>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                {content}
              </a>
            ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
