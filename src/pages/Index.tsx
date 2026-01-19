import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useComicReaderV2 } from "@/hooks/useComicReaderV2";
import { useTheme } from "@/hooks/useTheme";
import BackgroundLayout from "@/layouts/BackgroundLayout";

import {
  Moon,
  Sun,
  BookOpen,
  Play,
  Zap,
  BarChart3,
  Flag,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const {
    comicData,
    hasProgress,
    resumeReading,
    isLoading,
    getStatistics,
    getCurrentChapterData,
  } = useComicReaderV2();

  const { theme, toggleTheme } = useTheme();
  const statistics = getStatistics();
  const currentChapter = getCurrentChapterData();

  const handleStartReading = () => {
    navigate("/reader");
  };

  const handleResumeReading = () => {
    resumeReading();
    navigate("/reader");
  };

  if (isLoading) {
    return (
      <BackgroundLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-white/70">
            Chargement…
          </div>
        </div>
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      {/* Bouton thème */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-20 hover:bg-white/10 text-white"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

      {/* Contenu */}
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-2xl mx-auto text-center space-y-8 fade-in">

          {/* Titre */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 mb-6">
              <BookOpen className="h-8 w-8 text-white drop-shadow-md" />
              <h1 className="text-5xl md:text-6xl font-light tracking-tight text-white drop-shadow-md">
                {comicData?.title || "Mafia School"}
              </h1>
            </div>

            <p className="text-lg md:text-xl text-white/80 font-light leading-relaxed max-w-xl mx-auto">
              {comicData?.description ||
                "Une œuvre de fiction immersive explorant les mécanismes du pouvoir, les dérives institutionnelles et les signaux faibles à ne pas ignorer."}
            </p>

            {comicData?.author && (
              <p className="text-sm text-white/60 font-medium">
                Par {comicData.author}
              </p>
            )}

            {/* Features V1 */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="outline" className="text-xs text-white border-white/30">
                <Zap className="mr-1 h-3 w-3" />
                Mode cinéma
              </Badge>

              <Badge variant="outline" className="text-xs text-white border-white/30">
                <BarChart3 className="mr-1 h-3 w-3" />
                Suivi de lecture
              </Badge>

              <Badge
                variant="outline"
                className="text-xs border-amber-300 text-amber-400"
              >
                <Flag className="mr-1 h-3 w-3" />
                Red Flags
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button
              onClick={handleStartReading}
              size="lg"
              className="min-w-[200px] h-12 text-base font-medium bg-black/80 text-white hover:bg-black shadow-lg ring-1 ring-white/20"
            >
              <Play className="mr-2 h-5 w-5" />
              Commencer la lecture
            </Button>

            {hasProgress() && (
              <Button
                onClick={handleResumeReading}
                variant="outline"
                size="lg"
                className="min-w-[200px] h-12 text-base font-medium text-white border-white/40 hover:bg-white/10"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Reprendre
                {currentChapter && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Ch. {currentChapter.id}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* Infos BD */}
          {comicData && (
            <Card className="mt-12 bg-black/60 backdrop-blur border-white/10">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-white/70">
                  <div className="text-center">
                    <div className="font-semibold text-white">
                      {comicData.pages.length}
                    </div>
                    <div>Planches</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-white">
                      {comicData.chapters.length}
                    </div>
                    <div>Chapitres</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-white">
                      {statistics.totalReads || 0}
                    </div>
                    <div>Lectures</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-white">Gratuit</div>
                    <div>Accès libre</div>
                  </div>
                </div>

                {hasProgress() && statistics.completionRate > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-xs mb-2 text-white/70">
                      <span>Progression</span>
                      <span>{Math.round(statistics.completionRate)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full"
                        style={{ width: `${statistics.completionRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BackgroundLayout>
  );
};

export default Index;