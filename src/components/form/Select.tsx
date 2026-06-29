"use client";
import React, { useState } from "react";
import SelectField from "./SelectField";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
}

/**
 * Uncontrolled select that keeps the original API (options/defaultValue/onChange)
 * but renders the fully-themed {@link SelectField} dropdown instead of a native
 * <select>, so the open list matches the app's UI system everywhere it's used.
 */
const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
}) => {
  const [value, setValue] = useState<string>(defaultValue);

  // Keep in sync if the parent swaps defaultValue (e.g. an edit form loads data).
  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (next: string) => {
    setValue(next);
    onChange(next);
  };

  return (
    <SelectField
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default Select;
