import React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

export function Input({
  label,
  placeholder = "Enter text...",
  className = "",
  ...props
}: InputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-gray-200 block">
          {label}
        </label>
      )}
      <input
        placeholder={placeholder}
        className="w-full bg-gray-800 text-white placeholder:text-gray-400 px-3 py-2 border border-gray-600 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        {...props}
      />
    </div>
  );
}
