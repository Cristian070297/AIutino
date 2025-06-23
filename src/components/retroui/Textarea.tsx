import React from "react";
import { cn } from "../../lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  className?: string;
}

export function Textarea({
  label,
  placeholder = "Enter text...",
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-200 block">
          {label}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        rows={4}
        className="w-full bg-gray-800 text-white placeholder:text-gray-400 px-3 py-2 border border-gray-600 rounded resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px]"
        {...props}
      />
    </div>
  );
}
