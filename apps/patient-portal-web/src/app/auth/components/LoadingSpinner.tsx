"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
}

export default function LoadingSpinner({ 
  size = "md", 
  message = "Loading..." 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const containerSize = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-18 h-18",
    xl: "w-28 h-28",
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className={`relative ${containerSize[size]}`}>
        {/* Outer rotating circle with gradient */}
        <div className="absolute inset-0 rounded-full">
          <div className={`${sizeClasses[size]} rounded-full border-4 border-transparent border-t-emerald-500 border-r-emerald-400 animate-spin`}></div>
        </div>
        
        {/* Medical cross icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : size === 'lg' ? 'w-8 h-8' : 'w-12 h-12'} text-emerald-600 animate-pulse`}
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-9 h-9' : size === 'lg' ? 'w-12 h-12' : 'w-18 h-18'} rounded-full bg-emerald-100 animate-ping opacity-20`}></div>
        </div>
      </div>
      
      {message && (
        <p className={`mt-4 text-gray-600 font-medium ${size === 'sm' ? 'text-sm' : size === 'lg' || size === 'xl' ? 'text-lg' : 'text-base'} animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  );
}
