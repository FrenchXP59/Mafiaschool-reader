import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronRight, Lightbulb, Search, Eye, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NarrativeMessage } from '@/hooks/useComicReaderV2';

interface NarrativeMessageProps {
  message: NarrativeMessage;
  onContinue: () => void;
  onSkip: () => void;
  className?: string;
}

const getMessageIcon = (type: string) => {
  switch (type) {
    case 'context':
      return <Lightbulb className="h-5 w-5" />;
    case 'investigation':
      return <Search className="h-5 w-5" />;
    case 'revelation':
      return <Eye className="h-5 w-5" />;
    case 'transition':
      return <ArrowRight className="h-5 w-5" />;
    default:
      return <Lightbulb className="h-5 w-5" />;
  }
};

const getMessageColor = (type: string) => {
  switch (type) {
    case 'context':
      return 'text-blue-400';
    case 'investigation':
      return 'text-amber-400';
    case 'revelation':
      return 'text-red-400';
    case 'transition':
      return 'text-green-400';
    default:
      return 'text-blue-400';
  }
};

export function NarrativeMessageComponent({ 
  message, 
  onContinue, 
  onSkip, 
  className 
}: NarrativeMessageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    setIsVisible(false);
    setTimeout(onContinue, 200);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 200);
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300",
      isVisible ? "opacity-100" : "opacity-0",
      className
    )}>
      <Card className={cn(
        "max-w-lg w-full bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl transition-all duration-500",
        isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
      )}>
        <CardContent className="p-6 space-y-4">
          {/* En-tête */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-accent/20", getMessageColor(message.type))}>
                {getMessageIcon(message.type)}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {message.title}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {message.type === 'context' && 'Contexte narratif'}
                  {message.type === 'investigation' && "Indice d'enquête"}
                  {message.type === 'revelation' && 'Révélation'}
                  {message.type === 'transition' && 'Transition'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contenu */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {message.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Passer
            </Button>
            <Button
              onClick={handleContinue}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              Continuer
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}