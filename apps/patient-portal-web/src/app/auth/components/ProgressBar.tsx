import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ 
            width: `${progress}%`,
            backgroundColor: '#2ecc71' 
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground whitespace-nowrap">
        {currentStep}/{totalSteps}
      </p>
    </div>
  );
}
