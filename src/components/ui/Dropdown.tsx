"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className,
  menuClassName,
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00F5FF] transition-colors",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#8B949E]",
          selectedOption ? "text-[#E6EDF3]" : "text-[#8B949E]"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <selectedOption.icon className="w-4 h-4 text-[#8B949E]" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 text-[#8B949E] transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-full mt-1.5 bg-[#161B22] border border-[#30363D] rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2",
            menuClassName
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left",
                  isSelected ? "bg-[#00F5FF]/10 text-[#00F5FF]" : "text-[#E6EDF3] hover:bg-[#21262D]"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon && (
                    <option.icon
                      className={cn("w-4 h-4", isSelected ? "text-[#00F5FF]" : "text-[#8B949E]")}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#00F5FF]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
