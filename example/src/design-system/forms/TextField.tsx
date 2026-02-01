import { FormField } from "./FormField";
import { Input } from "@/design-system/ui/input";

interface TextFieldProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  type?: string;
}

/** @renders {FormField} */
export function TextField({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
}: TextFieldProps) {
  return (
    <FormField label={label} error={error}>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </FormField>
  );
}
