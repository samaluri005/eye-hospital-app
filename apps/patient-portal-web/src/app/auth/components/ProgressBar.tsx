import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
      <div
        className="h-1.5 rounded-full transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          backgroundColor: '#2ecc71' 
        }}
      />
    </div>
  );
}
