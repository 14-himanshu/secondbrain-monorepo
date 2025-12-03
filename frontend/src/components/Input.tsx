interface InputProps {
  placeholder: string;
  ref?: any;
}

export function Input({ placeholder, ref }: InputProps) {
  return (
    <div>
      <input
        ref={ref}
        placeholder={placeholder}
        type={"text"}
        className="px-4 py-2 border rounded m-2"
      />
    </div>
  );
}
