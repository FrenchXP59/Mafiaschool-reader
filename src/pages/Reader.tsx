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
  Settings,
  Eye,
  EyeOff,
  Zap,
  ZapOff
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
    guidedReadingEnabled,
    cinemaModeEnabled,
    toggleGuidedReading,
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
        case 'g':
        case 'G':
          e.preventDefault();
          toggleGuidedReading();
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
  }, [previousPage, nextPage, goToPage, totalPages, navigate, toggleGuidedReading, toggleCinemaMode]);

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
          text: `Découvrez "${comicData?.title || 'Mafia School'}" - Version 2 avec lecture guidée et mode cinéma`,
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

  return (
    <>
      {/* Écran Red Flags - affiché en priorité */}
      {showRedFlags && redFlagsData && (
        <RedFlagsScreen
          data={redFlagsData}
          onClose={() => {
            setShowRedFlags(false);
            setShowCompletion(true);
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
            cinemaModeEnabled ? "bg-black/80 backdrop-blur-sm" : "bg-background/95 backdrop-blur-sm border-b"
          )}>
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Navigation gauche */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                    className={cinemaModeEnabled ? "text-white hover:bg-white/20" : ""}
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                  {currentChapterData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChapterSummary(true)}
                      className={cinemaModeEnabled ? "text-white hover:bg-white/20" : ""}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Chapitres
                    </Button>
                  )}
                </div>

                {/* Info centrale */}
                <div className="flex items-center gap-3">
                  {currentChapterData && 
                    <Badge 
                      variant={cinemaModeEnabled ? "secondary" : "outline"} 
                      className="text-xs"
                    >
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

                {/* Boutons de droite avec Tooltips */}
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    {/* Bouton Lecture guidée */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleGuidedReading}
                          className={cn(
                            cinemaModeEnabled ? "text-white hover:bg-white/20" : "hover:bg-accent",
                            cinemaModeEnabled && guidedReadingEnabled && "bg-white/20"
                          )}
                        >
                          {guidedReadingEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{guidedReadingEnabled ? 'Désactiver' : 'Activer'} la lecture guidée (touche G)</p>
                      </TooltipContent>
                    </Tooltip>

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
                        <p>Partager cette BD</p>
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
                        <p>Basculer en mode {theme === 'dark' ? 'clair' : 'sombre'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>

          {/* Zone d'affichage de l'image */}
          <div className="fixed inset-0 overflow-y-auto pt-16 pb-20">
            <div className="max-w-5xl mx-auto p-4 min-h-full flex items-center">
              <div className="relative w-full">
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">
                      Chargement...
                    </div>
                  </div>
                )}

                {imageError && (
                  <div className="text-center text-destructive py-8">
                    Erreur de chargement de l'image
                  </div>
                )}

                <img
                  ref={imageRef}
                  src={currentPageData?.image}
                  alt={`Planche ${currentPage}`}
                  className={cn(
                    "w-full h-auto mx-auto transition-opacity duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>
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
            cinemaModeEnabled ? "bg-black/80 backdrop-blur-sm" : "bg-background/95 backdrop-blur-sm border-t"
          )}>
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={previousPage}
                  disabled={isFirstPage}
                  className={cinemaModeEnabled ? "text-white hover:bg-white/20 disabled:text-white/30" : ""}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetProgress}
                    className={cinemaModeEnabled ? "text-white hover:bg-white/20" : ""}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Bouton Suivant OU Terminer */}
                {isLastPage && imageLoaded ? (
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
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextPage}
                    disabled={isLastPage}
                    className={cinemaModeEnabled ? "text-white hover:bg-white/20 disabled:text-white/30" : ""}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Messages narratifs */}
          {showNarrativeMessage && pendingNarrativeMessage && (
            <NarrativeMessageComponent
              message={pendingNarrativeMessage}
              onClose={() => {
                setShowNarrativeMessage(false);
                markNarrativeMessageAsSeen(currentPage);
                setPendingNarrativeMessage(null);
              }}
            />
          )}

          {/* Résumé des chapitres */}
          {showChapterSummary && comicData && (
            <ChapterSummary
              chapters={comicData.chapters}
              currentChapter={currentChapter}
              completedChapters={getCompletedChapters()}
              onChapterSelect={goToChapter}
              onClose={() => setShowChapterSummary(false)}
              isOpen={showChapterSummary}
            />
          )}

          {/* Écran de complétion */}
          {showCompletion && (
            <div className="fixed inset-0 z-[100] bg-background">
              <ReadingCompletion
                statistics={getStatistics()}
                onRestart={() => {
                  resetProgress();
                  setShowCompletion(false);
                  goToPage(1);
                }}
                onNextEpisode={handleNextEpisode}
                onDownloadPDF={handleDownloadPDF}
                onShare={handleShare}
                onRedFlags={redFlagsData ? () => {
                  setShowCompletion(false);
                  setShowRedFlags(true);
                  markRedFlagsAccessed();
                } : undefined}
                hasRedFlags={!!redFlagsData}
                hasNextEpisode={false}
                hasAccessedRedFlagsBefore={hasAccessedBefore}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Reader;
