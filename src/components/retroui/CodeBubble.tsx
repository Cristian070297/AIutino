import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

interface CodeBubbleProps {
  code: string;
  label?: string;
  language?: string;
  className?: string;
}

export const CodeBubble: React.FC<CodeBubbleProps> = ({ code, label, language = "python", className }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div
      className={cn(
        "my-2 rounded-xl bg-gradient-to-br from-zinc-900/95 to-zinc-800/90 shadow-lg overflow-x-auto p-4 text-sm text-white font-head",
        className
      )}
      style={{ fontFamily: 'inherit', minWidth: 0 }}
    >
      {label && (
        <div className="mb-2 text-base font-bold text-primary/90">{label}</div>
      )}
      <pre className="whitespace-pre-wrap break-words">
        <code ref={codeRef} className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBubble;
