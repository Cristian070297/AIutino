import React from 'react';
import { cn } from '../../lib/utils';

interface RadioGroupProps {
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function RadioGroup({
  options,
  selectedValue,
  onChange,
  label,
  className,
}: RadioGroupProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-xs font-semibold text-primary/80 pl-1 select-none tracking-wide">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              'px-3 py-1 text-sm rounded-md border-2',
              selectedValue === option
                ? 'bg-primary/80 border-primary text-white'
                : 'bg-zinc-800/80 border-zinc-700/80 hover:bg-zinc-700/90'
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
