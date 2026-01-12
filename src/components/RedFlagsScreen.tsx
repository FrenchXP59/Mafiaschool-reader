import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  AlertTriangle, 
  Eye, 
  BookOpen, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RedFlagsData, RedFlag } from '@/hooks/useRedFlags';

interface RedFlagsScreenProps {
  data: RedFlagsData;
  onClose: () => void;
  onMarkAccessed: () => void;
  isOpen: boolean;
  className?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'communication':
      return '💬';
    case 'financier':
      return '💰';
    case 'organisation':
      return '🏢';
    case 'relationnel':
      return '👥';
    default:
      return '⚠️';
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'communication':
      return 'Communication';
    case 'financier':
      return 'Aspects financiers';
    case 'organisation':
      return 'Organisation';
    case 'relationnel':
      return 'Relations humaines';
    default:
      return 'Général';
  }
};

export function RedFlagsScreen({ 
  data, 
  onClose, 
  onMarkAccessed, 
  isOpen, 
  className 
}: RedFlagsScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hasMarkedAccessed, setHasMarkedAccessed] = useState(false);

  if (!isOpen) return null;

  // Marquer comme consulté au premier affichage
  if (!hasMarkedAccessed) {
    onMarkAccessed();
    setHasMarkedAccessed(true);
  }

  // Grouper les red flags par catégorie
  const redFlagsByCategory = data.redFlags.reduce((acc, flag) => {
    if (!acc[flag.category]) {
      acc[flag.category] = [];
    }
    acc[flag.category].push(flag);
    return acc;
  }, {} as Record<string, RedFlag[]>);

  const categories = Object.keys(redFlagsByCategory);
  const displayedFlags = selectedCategory 
    ? redFlagsByCategory[selectedCategory] 
    : data.redFlags;

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm",
      className
    )}>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {data.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Espace de recul éditorial
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la lecture
            </Button>
          </div>

          {/* Introduction */}
          <Card className="mb-6 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-foreground font-medium">
                    {data.introduction}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtres par catégorie */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-xs"
            >
              Tous ({data.redFlags.length})
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs"
              >
                {getCategoryIcon(category)} {getCategoryLabel(category)} ({redFlagsByCategory[category].length})
              </Button>
            ))}
          </div>

          {/* Liste des red flags */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Signaux d'alerte
                {selectedCategory && (
                  <Badge variant="secondary" className="ml-2">
                    {getCategoryLabel(selectedCategory)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {displayedFlags.map((flag, index) => (
                    <div
                      key={flag.id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-foreground leading-relaxed">
                          {flag.text}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryIcon(flag.category)} {getCategoryLabel(flag.category)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card className="mb-6 bg-muted/30">
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Mots-clés associés
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.hashtags.map(hashtag => (
                    <Badge 
                      key={hashtag} 
                      variant="secondary" 
                      className="text-xs font-normal"
                    >
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="text-center">
            <Separator className="mb-4" />
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {data.disclaimer}
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="min-w-[200px]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la lecture
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}