import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  note?: string;
  children: ReactNode;
}

export function Field({ label, note, children }: FieldProps) {
  return (
    <label className="sm-field">
      <span>{label}</span>
      {children}
      {note && <small>{note}</small>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="sm-input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="sm-input sm-textarea" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="sm-input" {...props} />;
}
