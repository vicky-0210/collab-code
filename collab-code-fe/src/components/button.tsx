import type { ReactElement } from "react";

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  text: string;
  Icon?: ReactElement;
  onClick?: () => void;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const variantStyles = {
  primary: "bg-[#7aa2f7] text-white hover:bg-[#6493f1] active:bg-[#6692e0] transition-colors duration-200",
  secondary: "bg-[#24283b] text-[#c0caf5] hover:bg-[#2a2e43] active:bg-[#202333] transition-colors duration-200",
};

const defaultStyles = "px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200 hover:shadow-md hover:shadow-[#7aa2f7]/20 active:translate-y-0.5 active:shadow-none focus:outline-none focus:ring-2 focus:ring-[#7aa2f7]/50";

export const Button = ({ variant = 'primary', text, Icon, onClick, fullWidth, type = "button", className = '' }: ButtonProps) => {
  return (
    <button
      className={`${variantStyles[variant]} ${defaultStyles} ${fullWidth ? " w-full" : ""} ${className}`}
      onClick={onClick}
      type={type}
    >
      {Icon && <span className="text-lg">{Icon}</span>}
      <span>{text}</span>
    </button>
  );
};
