import { FormField } from "./FormField";

interface SelectFieldProps {
  label: string;
  options: { label: string; value: string }[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
}

/** @renders {FormField} */
export function SelectField({
  label,
  options,
  value,
  onChange,
  error,
  placeholder,
}: SelectFieldProps) {
  return (
    <FormField label={label} error={error}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
