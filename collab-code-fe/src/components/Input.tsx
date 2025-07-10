interface InputProps {
  ref?: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  type?: string;
}

export const Input = ({ ref, placeholder, value, onChange, className = '', type = 'text' }: InputProps) => {
  return (
    <input
      ref={ref}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
      className={`w-full px-4 py-2 rounded-lg bg-[#24283b] border border-[#3b4261] text-[#c0caf5] focus:outline-none focus:border-[#7aa2f7] focus:ring-2 focus:ring-[#7aa2f7]/50 transition-all duration-200 ${className}`}
    />
  );
};