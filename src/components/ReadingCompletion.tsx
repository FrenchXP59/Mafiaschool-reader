import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  RotateCcw, 
  Download, 
  Share2, 
  ArrowRight,
  Clock,
  Eye,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadingStatistics } from '@/hooks/useComicReaderV2';

interface ReadingCompletionProps {
  onRestart: () => void;
  onNextEpisode: () => void;
  onDownloadPDF: () => void;
  onShare: () => void;
  onRedFlags?: () => void;
  statistics: ReadingStatistics;
  hasNextEpisode: boolean;
  hasAccessedRedFlagsBefore?: boolean;
  className?: string;
}

export function ReadingCompletion({
  onRestart,
  onNextEpisode,
  onDownloadPDF,
  onShare,
  onRedFlags,
  statistics,
  hasNextEpisode,
  hasAccessedRedFlagsBefore = false,
  className
}: ReadingCompletionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatReadingTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getCompletionMessage = () => {
    const messages = [
      "Félicitations ! Vous avez terminé cette enquête captivante.",
      "L'histoire ne fait que commencer... Que révélera la suite ?",
      "Vous avez découvert tous les secrets de ce chapitre.",
      "Une lecture complète ! L'enquête continue..."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all duration-500",
      isVisible ? "opacity-100" : "opacity-0",
      className
    )}>
      <Card className={cn(
        "max-w-lg w-full bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl transition-all duration-700",
        isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-8"
      )}>
        <CardContent className="p-8 space-y-6 text-center">
          {/* Icône de succès */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-green-500/20">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          {/* Message principal */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              Lecture terminée !
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {getCompletionMessage()}
            </p>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                {statistics.totalReads + 1}
              </div>
              <div className="text-xs text-muted-foreground">
                Lecture{statistics.totalReads > 0 ? 's' : ''}
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-primary">
                100%
              </div>
              <div className="text-xs text-muted-foreground">
                Complété
              </div>
            </div>
          </div>

          {/* Statistiques détaillées */}
          {showStats && (
            <div className="space-y-3 p-4 bg-accent/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Temps de lecture</span>
                </div>
                <span className="font-medium">
                  {formatReadingTime(statistics.averageReadingTime)}
                </span>
              </div>
              
              {statistics.mostViewedPages.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>Page la plus vue</span>
                  </div>
                  <span className="font-medium">
                    Planche {statistics.mostViewedPages[0].pageId}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>Progression</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Excellent lecteur
                </Badge>
              </div>
            </div>
          )}

          {/* Actions principales */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onRestart}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Recommencer
              </Button>
              
              {hasNextEpisode && (
                <Button
                  onClick={onNextEpisode}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Épisode suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Actions secondaires */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownloadPDF}
                className="text-muted-foreground hover:text-foreground"
              >
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                className="text-muted-foreground hover:text-foreground"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Partager
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="text-muted-foreground hover:text-foreground"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Stats
              </Button>
            </div>
            
            {/* Accès optionnel aux Red Flags */}
            {onRedFlags && (
              <div className="pt-4 border-t border-border/30">
                <div className="text-center space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {hasAccessedRedFlagsBefore 
                      ? "Revoir les signaux d'alerte professionnels" 
                      : "Prendre du recul sur cette histoire"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRedFlags}
                    className="text-xs text-muted-foreground hover:text-foreground border-muted-foreground/30 hover:border-muted-foreground/50"
                  >
                    <AlertTriangle className="mr-2 h-3 w-3" />
                    {hasAccessedRedFlagsBefore 
                      ? "Signaux d'alerte" 
                      : "Repérer les red flags"}
                  </Button>
                  <p className="text-xs text-muted-foreground/70">
                    Facultatif • Espace de réflexion
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Message d'encouragement */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Merci d'avoir lu Mafia School. L'enquête continue...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}