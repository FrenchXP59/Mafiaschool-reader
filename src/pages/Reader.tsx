import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useComicReaderV2 } from '@/hooks/useComicReaderV2';
import { useTheme } from '@/hooks/useTheme';
import { useRedFlags } from '@/hooks/useRedFlags';
import { NarrativeMessageComponent } from '@/components/NarrativeMessage';
import { ChapterSummary } from '@/components/ChapterSummary';
import { ReadingCompletion } from '@/components/ReadingCompletion';
import { RedFlagsScreen } from '@/components/RedFlagsScreen';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Moon,
  Sun,
  RotateCcw,
  Share2,
  Download,
  BookOpen,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Reader = () => {
  const navigate = useNavigate();
  const {
    comicData,
    currentPage,
    currentChapter,
    isLoading,
    error,
    nextPage,
    previousPage,
    goToPage,
    goToChapter,
    resetProgress,
    markReadingComplete,
    cinemaModeEnabled,
    toggleCinemaMode,
    markNarrativeMessageAsSeen,
    shouldShowNarrativeMessage,
    getCurrentPageData,
    getCurrentChapterData,
    getCompletedChapters,
    getStatistics,
    totalPages,
    totalChapters,
    isFirstPage,
    isLastPage
  } = useComicReaderV2();
  const { theme, toggleTheme } = useTheme();
  const { 
    redFlagsData, 
    markRedFlagsAccessed, 
    hasAccessedBefore 
  } = useRedFlags();

  const [showControls, setShowControls] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showNarrativeMessage, setShowNarrativeMessage] = useState(false);
  const [showChapterSummary, setShowChapterSummary] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [pendingNarrativeMessage, setPendingNarrativeMessage] = useState<any>(null);

  const hideControlsTimer = useRef<NodeJS.Timeout>();
  const imageRef = useRef<HTMLImageElement>(null);

  // Gestion de l'affichage des contrôles (plus lent en mode cinéma)
  useEffect(() => {
    const hideDelay = cinemaModeEnabled ? 2000 : 3000;

    const resetTimer = () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      setShowControls(true);
      hideControlsTimer.current = setTimeout(() => {
        if (cinemaModeEnabled) {
          setShowControls(false);
        }
      }, hideDelay);
    };

    const handleMouseMove = () => resetTimer();
    const handleTouchStart = () => resetTimer();
    const handleKeyDown = () => resetTimer();
    const handleClick = () => resetTimer();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    resetTimer();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [cinemaModeEnabled]);

  // Navigation au clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          previousPage();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          nextPage();
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
        case 'Escape':
          navigate('/');
          break;
        case 's':
        case 'S':
          e.preventDefault();
          setShowChapterSummary(true);
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          toggleCinemaMode();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previousPage, nextPage, goToPage, totalPages, navigate, toggleCinemaMode]);

  // Gestion des messages narratifs
  useEffect(() => {
    if (shouldShowNarrativeMessage(currentPage) && imageLoaded) {
      const pageData = getCurrentPageData();
      if (pageData?.narrativeMessage?.position === 'after') {
        const timer = setTimeout(() => {
          setPendingNarrativeMessage(pageData.narrativeMessage);
          setShowNarrativeMessage(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPage, shouldShowNarrativeMessage, imageLoaded, getCurrentPageData]);

  // Reset de l'état de l'image lors du changement de page
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [currentPage]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: comicData?.title || 'Mafia School V2',
          text: `Découvrez "${comicData?.title || 'Mafia School'}" - Version 2 avec mode cinéma`,
          url: window.location.origin,
        });
      } catch (err) {
        // L'utilisateur a annulé le partage
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
    }
  };

  const handleDownloadPDF = () => {
    console.log('Téléchargement PDF demandé');
  };

  const handleNextEpisode = () => {
    console.log('Épisode suivant demandé');
  };

  if (isLoading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center transition-colors duration-500",
        cinemaModeEnabled ? "bg-black" : "reader-container"
      )}>
        <div className="animate-pulse text-muted-foreground">
          Chargement de la planche...
        </div>
      </div>
    );
  }

  if (error || !comicData) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        cinemaModeEnabled ? "bg-black" : "reader-container"
      )}>
        <div className="text-center space-y-4">
          <p className="text-destructive">Erreur lors du chargement de la BD V2</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const currentPageData = getCurrentPageData();
  const currentChapterData = getCurrentChapterData();
  const hasNextEpisode = comicData.episodes.some(ep => ep.id > 1 && ep.available);

  return (
    <TooltipProvider>
      {showRedFlags && (
        <RedFlagsScreen
          flags={redFlagsData}
          hasAccessedBefore={hasAccessedBefore}
          onClose={() => {
            setShowRedFlags(false);
            markRedFlagsAccessed();
          }}
          onMarkAccessed={markRedFlagsAccessed}
          isOpen={showRedFlags}
        />
      )}

      {/* Tout le reste du Reader - masqué quand Red Flags est affiché */}
      {!showRedFlags && (
        <div className={cn(
          "min-h-screen relative overflow-y-auto transition-all duration-500",
          cinemaModeEnabled ? "bg-black" : "reader-container"
        )}>
          {/* Header avec contrôles */}
          <div className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            cinemaModeEnabled 
              ? showControls 
                ? "translate-y-0 opacity-100" 
                : "-translate-y-full opacity-0"
              : "translate-y-0 opacity-100",
            cinemaModeEnabled ? "navigation-overlay" : "bg-background/80 backdrop-blur-sm border-b border-border/50"
          )}>
            <div className="flex items-center justify-between p-4">
              {/* Groupe gauche */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/')}
                      className={cn(
                        cinemaModeEnabled ? "text-white hover:bg-white/20" : "hover:bg-accent"
                      )}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Accueil
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retour à l'accueil (touche Échap)</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChapterSummary(true)}
                      className={cn(
                        cinemaModeEnabled ? "text-white hover:bg-white/20" : "hover:bg-accent"
                      )}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Sommaire
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ouvrir le sommaire (touche S)</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Groupe centre */}
              <div className="flex items-center gap-3">
                {currentChapterData && 
                  <Badge variant={cinemaModeEnabled ? "secondary" : "outline"} className="text-xs">
                    {currentChapterData.title}
                  </Badge>
                }
                <span className={cn(
                  "text-sm font-medium",
                  cinemaModeEnabled ? "text-white" : "text-foreground"
                )}>
                  Planche {currentPage} / {totalPages}
                </span>
              </div>

              {/* Groupe droite */}
              <div className="flex items-center gap-2">
                {/* Bouton Mode cinéma */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleCinemaMode}
                      className={cn(
                        cinemaModeEnabled ? "text-white hover:bg-white/20" : "hover:bg-accent",
                        cinemaModeEnabled && "bg-white/20"
                      )}
                    >
                      {cinemaModeEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{cinemaModeEnabled ? 'Désactiver' : 'Activer'} le mode cinéma (touche C)</p>
                  </TooltipContent>
                </Tooltip>

                {/* Bouton Partager */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className={cn(
                        cinemaModeEnabled ? "text-white hover:bg-white/20" : "hover:bg-accent"
                      )}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Partager</p>
                  </TooltipContent>
                </Tooltip>

                {/* Bouton Thème */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleTheme}
                      className={cn(
                        cinemaModeEnabled ? "text-white hover:bg-white/20" : "hover:bg-accent"
                      )}
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Changer le thème</p>
                  </TooltipContent>
                </Tooltip>

                {/* Bouton Reset */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetProgress}
                      className={cn(
                        cinemaModeEnabled ? "text-white hover:bg-white/20" : "hover:bg-accent"
                      )}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Réinitialiser la progression</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Contenu principal - Image de la planche */}
          <div className="flex items-center justify-center min-h-screen pt-20 pb-24 px-4">
            <div className="relative max-w-4xl w-full">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
                  <div className="animate-pulse text-muted-foreground">
                    Chargement de la planche {currentPage}...
                  </div>
                </div>
              )}
              
              {imageError && (
                <div className="aspect-[3/4] flex items-center justify-center bg-muted/20 rounded-lg">
                  <div className="text-center space-y-2">
                    <p className="text-destructive">Erreur de chargement</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.reload()}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Réessayer
                    </Button>
                  </div>
                </div>
              )}

              <img
                ref={imageRef}
                src={currentPageData?.image}
                alt={currentPageData?.alt || `Planche ${currentPage}`}
                className={cn(
                  "w-full h-auto rounded-lg shadow-2xl transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="eager"
              />
            </div>
          </div>

          {/* Footer avec navigation */}
          <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300",
            cinemaModeEnabled 
              ? showControls 
                ? "translate-y-0 opacity-100" 
                : "translate-y-full opacity-0"
              : "translate-y-0 opacity-100",
            cinemaModeEnabled ? "navigation-overlay" : "bg-background/80 backdrop-blur-sm border-t border-border/50"
          )}>
            <div className="flex items-center justify-center p-4 gap-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={previousPage}
                disabled={isFirstPage}
                className={cn(
                  cinemaModeEnabled ? "text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" : "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <ChevronLeft className="h-6 w-6 mr-2" />
                Précédent
              </Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={nextPage}
                disabled={isLastPage}
                className={cn(
                  cinemaModeEnabled 
                    ? "text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" 
                    : "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Suivant
                <ChevronRight className="h-6 w-6 ml-2" />
              </Button>

              {isLastPage && imageLoaded && (
                <Button
                  size="lg"
                  onClick={() => {
                    markReadingComplete();
                    setShowCompletion(true);
                  }}
                  className={cn(
                    "ml-4",
                    cinemaModeEnabled
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  Terminer la lecture
                  <span className="text-xs text-muted-foreground ml-2">
                    Accéder au bilan de lecture
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages narratifs */}
      {showNarrativeMessage && pendingNarrativeMessage && (
        <NarrativeMessageComponent
          message={pendingNarrativeMessage}
          onContinue={() => {
            markNarrativeMessageAsSeen(currentPage);
            setShowNarrativeMessage(false);
            setPendingNarrativeMessage(null);
          }}
          onSkip={() => {
            markNarrativeMessageAsSeen(currentPage);
            setShowNarrativeMessage(false);
            setPendingNarrativeMessage(null);
          }}
        />
      )}

      {/* Sommaire */}
      {showChapterSummary && (
        <ChapterSummary
          chapters={comicData.chapters}
          episodes={comicData.episodes}
          currentChapter={currentChapter}
          completedChapters={getCompletedChapters()}
          onChapterSelect={goToChapter}
          onClose={() => setShowChapterSummary(false)}
          isOpen={showChapterSummary}
        />
      )}

           {/* Écran de completion */}
      {showCompletion && (
        <ReadingCompletion
          onRestart={() => {
            resetProgress();
            setShowCompletion(false);
            goToPage(1);
          }}
          onNextEpisode={handleNextEpisode}
          onDownloadPDF={handleDownloadPDF}
          onShare={handleShare}
          onRedFlags={
            redFlagsData?.length
              ? () => {
                  markRedFlagsAccessed();
                  setShowCompletion(false);
                  setShowRedFlags(true);
                }
              : undefined
          }
          hasNextEpisode={hasNextEpisode}
          statistics={getStatistics()}
          redFlagsCount={redFlagsData?.length ?? 0}
          hasAccessedRedFlags={hasAccessedBefore}
        />
      )}
    </TooltipProvider>
  );
}

export default Reader;
