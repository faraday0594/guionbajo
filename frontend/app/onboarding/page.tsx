'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Brain, Map, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleManualSelection = async (level: string) => {
    setLoading(true);
    try {
      await api.skipDiagnosis(level);
      setStep(3);
    } catch (err: any) {
      toast.error('Error selecting level');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto flex flex-col justify-center">
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-4xl font-outfit font-bold mb-4">Welcome to Guionbajo!</h1>
          <p className="text-brand-text-secondary text-lg mb-12">How would you like to start your journey?</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <button 
              onClick={() => setStep(2)}
              className="glass p-8 rounded-3xl text-left hover:border-brand-accent transition-all group"
            >
              <Brain className="w-12 h-12 text-brand-accent mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Take Placement Test</h3>
              <p className="text-brand-text-secondary">AI will evaluate your current level in ~15 mins.</p>
            </button>

            <button 
              onClick={() => setStep(2.5)}
              className="glass p-8 rounded-3xl text-left hover:border-brand-cyan transition-all group"
            >
              <Map className="w-12 h-12 text-brand-cyan mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Choose My Level</h3>
              <p className="text-brand-text-secondary">I already know my CEFR level and want to start directly.</p>
            </button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-2xl font-bold text-center mb-8">Diagnostic Test</h2>
          {/* Diagnostic UI simplified for demo */}
          <div className="glass p-8 rounded-3xl max-w-2xl mx-auto text-center">
            <p className="mb-8">Feature coming soon. Please choose your level manually for now.</p>
            <button 
              onClick={() => setStep(2.5)}
              className="px-6 py-2 bg-brand-surface rounded-full text-sm"
            >
              Go to manual selection
            </button>
          </div>
        </motion.div>
      )}

      {step === 2.5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-outfit font-bold text-center mb-8">Select Your Level</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['A1', 'A2', 'B1', 'B2'].map((lvl) => (
              <div key={lvl} className="space-y-4">
                <div className="text-center font-bold text-brand-text-secondary">{lvl}</div>
                {[1, 2, 3, 4].map(sub => (
                  <button
                    key={`${lvl}.${sub}`}
                    onClick={() => handleManualSelection(`${lvl}.${sub}`)}
                    disabled={loading}
                    className="w-full glass p-4 rounded-xl text-center hover:bg-brand-surface hover:border-brand-accent transition-all font-semibold"
                  >
                    {lvl}.{sub}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-success/20 text-brand-success mb-6">
            <Map className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-outfit font-bold mb-4">You're All Set!</h2>
          <p className="text-brand-text-secondary mb-12">Your personalized learning map is ready.</p>
          
          <button 
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-full font-bold transition-all"
          >
            Let's Begin
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
