"use client";
import React, { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type Props = {
  children: ReactNode;
};

const doctorImages = [
  "/professional_eye_doc_a055069b.jpg",
  "/professional_eye_doc_6dcff35b.jpg",
  "/professional_eye_doc_21f2206e.jpg",
  "/professional_eye_doc_acee3b2e.jpg",
  "/professional_eye_doc_7f10f64f.jpg",
];

export default function PersistentAuthLayout({ children }: Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % doctorImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Top Right Branding - Fixed Position */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Eye Care</h1>
      </div>

      {/* Left Side - Animated Doctor Carousel (Persistent) */}
      <div className="w-full lg:w-1/2 relative bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 overflow-hidden">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundSize: '200% 200%',
          }}
        />

        {/* Carousel - Doctor images with smooth transitions */}
        <div className="relative z-10 h-64 lg:h-full flex items-center justify-center p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: [0, -20, 0],
              }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{
                opacity: { duration: 0.7 },
                scale: { duration: 0.7 },
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="w-full max-w-md"
            >
              <Image
                src={doctorImages[currentImageIndex]}
                alt="Eye Care Professional"
                width={500}
                height={600}
                priority={currentImageIndex === 0}
                className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {doctorImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white w-8' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Decorative floating circles */}
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Right Side - Dynamic Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white relative">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </div>

      {/* Bottom Copyright - Fixed Position on Right Side */}
      <div className="absolute bottom-6 right-0 lg:right-6 z-50 lg:w-1/2 w-full">
        <p className="text-center text-xs text-gray-900 font-semibold">
          © 2025 Eye Care. All rights reserved
        </p>
      </div>

      {/* Reduced motion support */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
