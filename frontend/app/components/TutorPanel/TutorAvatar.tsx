import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

interface TutorAvatarProps {
  state: 'idle' | 'speaking' | 'listening' | 'thinking';
}

export default function TutorAvatar({ state }: TutorAvatarProps) {
  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
      {state === 'speaking' && (
        <>
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute inset-0 bg-brand-cyan/20 rounded-full" />
          <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="absolute inset-0 bg-brand-cyan/10 rounded-full" />
        </>
      )}
      
      {state === 'listening' && (
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-brand-accent/20 rounded-full" />
      )}

      {state === 'thinking' && (
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute inset-[-10px] border-t-2 border-r-2 border-brand-accent rounded-full opacity-50" />
      )}

      <div className="relative z-10 w-24 h-24 bg-brand-surface border border-brand-border rounded-full flex items-center justify-center shadow-lg">
        <Brain className={`w-12 h-12 ${state === 'speaking' ? 'text-brand-cyan' : 'text-brand-accent'}`} />
      </div>
    </div>
  );
}
