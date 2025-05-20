import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'link';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = 'default',
  size = 'md',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        // Base styles
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
        
        // Size variants
        size === 'sm' && "h-8 px-3 text-xs",
        size === 'md' && "h-9 px-4 py-2",
        size === 'lg' && "h-10 px-8 py-2 text-base",
        
        // Color variants
        variant === 'default' && "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700",
        variant === 'primary' && "bg-blue-600 text-white hover:bg-blue-700",
        variant === 'secondary' && "bg-gray-600 text-white hover:bg-gray-700",
        variant === 'danger' && "bg-red-600 text-white hover:bg-red-700",
        variant === 'success' && "bg-green-600 text-white hover:bg-green-700",
        variant === 'warning' && "bg-yellow-500 text-white hover:bg-yellow-600",
        variant === 'outline' && "border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800",
        variant === 'link' && "bg-transparent text-blue-600 hover:underline dark:text-blue-500",
        
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, type ButtonProps }; 