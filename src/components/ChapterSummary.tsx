import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, BookOpen, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chapter, Episode } from '@/hooks/useComicReaderV2';

interface ChapterSummaryProps {
  chapters: Chapter[];
  episodes: Episode[];
  currentChapter: number;
  completedChapters: number[];
  onChapterSelect: (chapterId: number) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function ChapterSummary({
  chapters,
  episodes,
  currentChapter,
  completedChapters,
  onChapterSelect,
  onClose,
  isOpen
}: ChapterSummaryProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);

  const getChaptersByEpisode = (episodeId: number) =>
    chapters.filter(chapter => chapter.episodeId === episodeId);

  const getChapterStatus = (chapterId: number) => {
    if (completedChapters.includes(chapterId)) return 'completed';
    if (chapterId === currentChapter) return 'current';
    return 'available';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'current':
        return <Circle className="h-4 w-4 text-blue-500 fill-current" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card className="max-w-2xl w-full max-h-[80vh] bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl">
        
        {/* HEADER */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Sommaire</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <ScrollArea className="h-[50vh]">
            <div className="space-y-6">
              {episodes.map(episode => {
                const episodeChapters = getChaptersByEpisode(episode.id);
                const isExpanded =
                  selectedEpisode === episode.id ||
                  episodeChapters.some(c => c.id === currentChapter);

                return (
                  <div key={episode.id} className="space-y-3">

                    {/* EPISODE HEADER COLORÉ */}
                    <div
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                        episode.id === 1 &&
                          "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10",
                        episode.id === 2 &&
                          "border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10",
                        !episode.available && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (episode.available) {
                          setSelectedEpisode(isExpanded ? null : episode.id);
                        }
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-base">
                            {episode.title}
                          </h3>

                          <Badge
                            variant="outline"
                            className={cn(
                              episode.id === 1 &&
                                "border-blue-500 text-blue-600",
                              episode.id === 2 &&
                                "border-purple-500 text-purple-600"
                            )}
                          >
                            Épisode {episode.id}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {episode.description}
                        </p>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {episodeChapters.length} chapitre
                        {episodeChapters.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* CHAPITRES */}
                    {isExpanded && episode.available && (
                      <div className="ml-4 space-y-2">
                        {episodeChapters.map(chapter => {
                          const status = getChapterStatus(chapter.id);

                          return (
                            <div
                              key={chapter.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/30",
                                status === 'current' &&
                                  "bg-accent/20 border-primary/30"
                              )}
                              onClick={() => {
                                onChapterSelect(chapter.id);
                                onClose();
                              }}
                            >
                              {getStatusIcon(status)}

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm">
                                    {chapter.title}
                                  </h4>

                                  {status === 'current' && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      En cours
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                  {chapter.description}
                                </p>

                                <p className="text-xs text-muted-foreground/70">
                                  Pages {chapter.startPage}-
                                  {chapter.endPage}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* FOOTER */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
            <span>
              {completedChapters.length} / {chapters.length} chapitres terminés
            </span>
            <span>Chapitre actuel : {currentChapter}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}