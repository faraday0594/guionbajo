'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, Brain, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-accent/20 via-brand-dark to-brand-dark" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-brand-cyan" />
          <span className="font-outfit text-2xl font-bold tracking-tight text-white">Guionbajo</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-5 py-2 text-sm font-medium text-brand-text-secondary hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="px-5 py-2 text-sm font-medium bg-brand-accent hover:bg-brand-accent/80 text-white rounded-full transition-all glass">
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <span className="text-sm font-medium text-brand-text-secondary">AI-Powered English Learning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-outfit font-extrabold tracking-tight mb-8">
            Master English with <br className="hidden md:block" />
            <span className="text-gradient">Your AI Tutor</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-brand-text-secondary mb-12 max-w-2xl mx-auto">
            16 progressive levels. Personalized learning paths. Real-time pronunciation feedback. Speak with confidence.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(108,99,255,0.4)]">
              Start Learning Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </main>
      
      {/* Decorative stars */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full opacity-20 animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-brand-cyan rounded-full opacity-20 animate-pulse delay-700" />
      <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-brand-accent rounded-full opacity-20 animate-pulse delay-1000" />
    </div>
  );
}
