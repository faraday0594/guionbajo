import { motion } from 'framer-motion';

interface ScoreDisplayProps {
  scores: {
    pronunciation: number;
    grammar: number;
    relevance: number;
    overall: number;
  };
  feedback: string;
}

const ScoreBar = ({ label, score }: { label: string; score: number }) => {
  const color = score > 75 ? 'bg-brand-success' : score > 50 ? 'bg-brand-gold' : 'bg-brand-error';
  
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-brand-text-secondary">{label}</span>
        <span className="font-bold">{score}%</span>
      </div>
      <div className="h-2 bg-brand-surface rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
};

export default function ScoreDisplay({ scores, feedback }: ScoreDisplayProps) {
  return (
    <div className="glass p-6 rounded-2xl w-full">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-brand-accent mb-2">
          <span className="text-2xl font-bold">{scores.overall}</span>
        </div>
        <div className="text-sm text-brand-text-secondary">Overall Score</div>
      </div>
      
      <div className="space-y-2 mb-6">
        <ScoreBar label="Pronunciation" score={scores.pronunciation} />
        <ScoreBar label="Grammar" score={scores.grammar} />
        <ScoreBar label="Relevance" score={scores.relevance} />
      </div>

      <div className="bg-brand-surface p-4 rounded-xl relative">
        <div className="absolute -top-2 left-4 w-4 h-4 bg-brand-surface rotate-45" />
        <p className="text-sm text-brand-text-primary italic">"{feedback}"</p>
      </div>
    </div>
  );
}
