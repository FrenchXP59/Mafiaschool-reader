import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useComicReaderV2, type PageV2 } from '@/hooks/useComicReaderV2';
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
  GalleryHorizontalEnd,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReaderSpread } from '@/lib/readerSpread';

type ReaderViewMode = 'page' | 'book';
const BOOK_MODE_QUERY = '(min-width: 1100px)';
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

function ReaderThumbnail({ page, active, onSelect }: { page: PageV2; active: boolean; onSelect: (page: number) => void }) {
  return <button type="button" data-reader-thumbnail={page.id} onClick={() => onSelect(page.id)} aria-current={active ? 'page' : undefined}
    className={cn('relative aspect-[2/3] w-12 shrink-0 overflow-hidden border transition sm:w-16', active ? 'border-primary ring-2 ring-primary/40' : 'border-white/20 opacity-70 hover:opacity-100')}>
    <img src={page.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
  </button>;
}

const Reader = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [loadedPages, setLoadedPages] = useState<Set<number>>(() => new Set());
  const [erroredPages, setErroredPages] = useState<Set<number>>(() => new Set());
  const [showNarrativeMessage, setShowNarrativeMessage] = useState(false);
  const [showChapterSummary, setShowChapterSummary] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(false);
  const [preferredViewMode, setPreferredViewMode] = useState<ReaderViewMode>(() => window.matchMedia(BOOK_MODE_QUERY).matches ? 'book' : 'page');
  const [isWideReader, setIsWideReader] = useState(() => window.matchMedia(BOOK_MODE_QUERY).matches);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [pendingNarrativeMessage, setPendingNarrativeMessage] = useState<any>(null);

  const hideControlsTimer = useRef<NodeJS.Timeout>();
  const readerRootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRailRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const preloadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  zoomRef.current = zoom;

  const viewMode = isWideReader ? preferredViewMode : 'page';
  const visiblePageNumbers = useMemo(() => viewMode === 'book' ? getReaderSpread(currentPage, totalPages) : [currentPage], [currentPage, totalPages, viewMode]);
  const visiblePages = useMemo(() => visiblePageNumbers.map(id => comicData?.pages.find(page => page.id === id)).filter((page): page is PageV2 => Boolean(page)), [comicData, visiblePageNumbers]);
  const imageLoaded = visiblePageNumbers.length > 0 && visiblePageNumbers.every(id => loadedPages.has(id));
  const firstVisiblePage = visiblePageNumbers[0] ?? currentPage;
  const lastVisiblePage = visiblePageNumbers.at(-1) ?? currentPage;
  const pageLabel = visiblePageNumbers.join('–');
  const pageHeight = Math.min(Math.max(1, viewportSize.height - 32), (Math.max(1, viewportSize.width - 32) / (viewMode === 'book' && visiblePages.length === 2 ? 2 : 1)) * 1.5);
  const pageWidth = pageHeight * (2 / 3) * (zoom / 100);
  const canvasWidth = Math.max(viewportSize.width, pageWidth * visiblePages.length + 32);
  const canvasHeight = Math.max(viewportSize.height, pageHeight * (zoom / 100) + 32);

  const setZoomAtPoint = useCallback((requestedZoom: number, clientX?: number, clientY?: number) => {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(requestedZoom)));
    const viewport = scrollContainerRef.current;
    if (viewport && nextZoom !== zoomRef.current) {
      const bounds = viewport.getBoundingClientRect();
      const x = clientX === undefined ? viewport.clientWidth / 2 : clientX - bounds.left;
      const y = clientY === undefined ? viewport.clientHeight / 2 : clientY - bounds.top;
      const ratioX = (viewport.scrollLeft + x) / Math.max(1, viewport.scrollWidth);
      const ratioY = (viewport.scrollTop + y) / Math.max(1, viewport.scrollHeight);
      requestAnimationFrame(() => requestAnimationFrame(() => viewport.scrollTo({ left: ratioX * viewport.scrollWidth - x, top: ratioY * viewport.scrollHeight - y, behavior: 'instant' as ScrollBehavior })));
    }
    setZoom(nextZoom);
  }, []);
  const handleNext = useCallback(() => { if (lastVisiblePage < totalPages) goToPage(viewMode === 'book' ? lastVisiblePage + 1 : currentPage + 1); }, [currentPage, goToPage, lastVisiblePage, totalPages, viewMode]);
  const handlePrevious = useCallback(() => { if (firstVisiblePage > 1) goToPage(viewMode === 'book' ? firstVisiblePage === 2 ? 1 : Math.max(2, firstVisiblePage - 2) : currentPage - 1); }, [currentPage, firstVisiblePage, goToPage, viewMode]);

  useEffect(() => {
    if (!comicData) return;
    const page = Number(searchParams.get('page'));
    if (Number.isInteger(page) && page >= 1 && page <= totalPages && page !== currentPage) goToPage(page);
    else if (searchParams.get('page') !== String(currentPage)) { const next = new URLSearchParams(searchParams); next.set('page', String(currentPage)); setSearchParams(next, { replace: true }); }
  }, [comicData, currentPage, goToPage, searchParams, setSearchParams, totalPages]);
  useEffect(() => { const query = window.matchMedia(BOOK_MODE_QUERY); const update = () => setIsWideReader(query.matches); update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update); }, []);
  useEffect(() => { const viewport = scrollContainerRef.current; if (!viewport) return; const update = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight }); const observer = new ResizeObserver(update); update(); observer.observe(viewport); return () => observer.disconnect(); }, [comicData]);
  useEffect(() => { const listener = () => setIsFullscreen(document.fullscreenElement === readerRootRef.current); document.addEventListener('fullscreenchange', listener); return () => document.removeEventListener('fullscreenchange', listener); }, []);
  useEffect(() => { const viewport = scrollContainerRef.current; if (!viewport) return; const wheel = (event: WheelEvent) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); setZoomAtPoint(zoomRef.current + (event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), event.clientX, event.clientY); }; viewport.addEventListener('wheel', wheel, { passive: false }); return () => viewport.removeEventListener('wheel', wheel); }, [setZoomAtPoint]);
  useEffect(() => { if (!comicData || !imageLoaded || lastVisiblePage >= totalPages) return; const next = viewMode === 'book' ? getReaderSpread(lastVisiblePage + 1, totalPages) : [lastVisiblePage + 1]; const preload = () => next.map(id => comicData.pages.find(page => page.id === id)?.image).filter(Boolean).forEach(url => { if (url && !preloadedImagesRef.current.has(url)) { const image = new Image(); image.src = url; preloadedImagesRef.current.set(url, image); } }); const timer = window.setTimeout(preload, 250); return () => clearTimeout(timer); }, [comicData, imageLoaded, lastVisiblePage, totalPages, viewMode]);

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
          handlePrevious();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          handleNext();
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
        case '+': case '=':
          e.preventDefault(); setZoomAtPoint(zoomRef.current + ZOOM_STEP); break;
        case '-':
          e.preventDefault(); setZoomAtPoint(zoomRef.current - ZOOM_STEP); break;
        case '0':
          e.preventDefault(); setZoomAtPoint(100); break;
        case 'g': case 'G':
          e.preventDefault(); setShowFilmstrip(current => !current); break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, goToPage, totalPages, navigate, toggleCinemaMode, setZoomAtPoint]);

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
    setLoadedPages(new Set());
    setErroredPages(new Set());
    scrollContainerRef.current?.scrollTo({ left: 0, top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentPage]);

  const handleImageLoad = (pageId: number) => {
    setLoadedPages(current => new Set(current).add(pageId));
    setErroredPages(current => { const next = new Set(current); next.delete(pageId); return next; });
  };

  const handleImageError = (pageId: number) => {
    setErroredPages(current => new Set(current).add(pageId));
    setLoadedPages(current => { const next = new Set(current); next.delete(pageId); return next; });
  };

  const toggleFullscreen = async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await readerRootRef.current?.requestFullscreen(); };
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => { if (event.touches.length === 2) { const [first, second] = [event.touches[0], event.touches[1]]; pinchRef.current = { distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY), zoom: zoomRef.current }; touchStartRef.current = null; } else if (event.touches.length === 1) touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; };
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => { if (event.touches.length !== 2 || !pinchRef.current) return; event.preventDefault(); const [first, second] = [event.touches[0], event.touches[1]]; setZoomAtPoint(pinchRef.current.zoom * Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY) / Math.max(1, pinchRef.current.distance), (first.clientX + second.clientX) / 2, (first.clientY + second.clientY) / 2); };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => { if (pinchRef.current) { pinchRef.current = null; return; } const start = touchStartRef.current; touchStartRef.current = null; const touch = event.changedTouches[0]; if (!start || !touch || zoomRef.current > 100) return; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY)) deltaX < 0 ? handleNext() : handlePrevious(); };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => { const viewport = scrollContainerRef.current; if (!viewport || zoomRef.current <= 100 || event.pointerType !== 'mouse') return; viewport.setPointerCapture(event.pointerId); dragStartRef.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }; };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => { const viewport = scrollContainerRef.current; const start = dragStartRef.current; if (!viewport || !start) return; viewport.scrollLeft = start.left - (event.clientX - start.x); viewport.scrollTop = start.top - (event.clientY - start.y); };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: comicData?.title || 'Mafia School V2',
          text: `Découvrez "${comicData?.title || 'Mafia School'}" - Version 2 avec mode cinéma`,
          url: `${window.location.origin}${window.location.pathname}${window.location.search}`,
        });
      } catch (err) {
        // L'utilisateur a annulé le partage
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${window.location.search}`);
    }
  };

  const handleDownloadPDF = () => {
    console.log('Téléchargement PDF demandé');
  };

  const handleNextEpisode = () => {
    if (!comicData || !currentChapterData) return;
    const nextEpisodeId = currentChapterData.episodeId + 1;
    const nextEpisode = comicData.episodes.find(ep => ep.id === nextEpisodeId);
    
    if (nextEpisode && nextEpisode.available) {
      const firstChapterOfNextEpisode = comicData.chapters.find(c => c.episodeId === nextEpisodeId);
      if (firstChapterOfNextEpisode) {
        goToPage(firstChapterOfNextEpisode.startPage);
        setShowCompletion(false);
      }
    }
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
        <div ref={readerRootRef} className={cn(
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
                  Planche {pageLabel} / {totalPages}
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

          <div className="fixed inset-0 z-10 bg-[hsl(var(--reader-bg))]">
            <div ref={scrollContainerRef} className={cn('absolute inset-x-0 top-20 bottom-20 overflow-auto overscroll-contain', zoom > 100 && 'cursor-grab active:cursor-grabbing')} style={{ touchAction: 'none' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onDoubleClick={event => setZoomAtPoint(zoomRef.current === 100 ? 150 : 100, event.clientX, event.clientY)} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => { dragStartRef.current = null; }}>
              <div className="flex items-center justify-center" style={{ width: canvasWidth, height: canvasHeight }}>
                <div className="flex items-center justify-center gap-3">
                  {visiblePages.map(page => {
                    const failed = erroredPages.has(page.id);
                    return <div key={page.id} className="relative shrink-0 overflow-hidden comic-panel bg-muted" style={{ width: pageWidth, height: pageHeight * (zoom / 100) }}>
                      {!loadedPages.has(page.id) && !failed && <div className="absolute inset-0 grid place-items-center animate-pulse text-sm text-muted-foreground">Chargement…</div>}
                      {failed ? <div className="grid h-full place-items-center text-destructive">Erreur de chargement</div> : <img src={page.image} alt={page.alt || `Planche ${page.id}`} className={cn('h-full w-full select-none object-contain transition-opacity', loadedPages.has(page.id) ? 'opacity-100' : 'opacity-0')} onLoad={() => handleImageLoad(page.id)} onError={() => handleImageError(page.id)} draggable={false} />}
                    </div>;
                  })}
                </div>
              </div>
            </div>
            {showFilmstrip && <aside className="navigation-overlay fixed inset-x-0 bottom-20 z-40 h-36 border-t border-white/15 p-3 text-white"><div className="mb-2 flex items-center gap-3 text-sm"><span className="flex-1">Toutes les planches · {pageLabel} / {totalPages}</span><input type="range" min={1} max={totalPages} value={currentPage} onChange={event => goToPage(Number(event.target.value))} /><Button variant="ghost" size="icon" onClick={() => setShowFilmstrip(false)}><X className="h-4 w-4" /></Button></div><div ref={thumbnailRailRef} className="flex gap-2 overflow-x-auto">{comicData.pages.map(page => <ReaderThumbnail key={page.id} page={page} active={page.id === currentPage} onSelect={goToPage} />)}</div></aside>}
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
                onClick={handlePrevious}
                disabled={firstVisiblePage <= 1}
                className={cn(
                  cinemaModeEnabled ? "text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" : "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <ChevronLeft className="h-6 w-6 mr-2" />
                Précédent
              </Button>

              <div className="hidden min-[1100px]:flex items-center border border-current/20">
                <Button variant={viewMode === 'page' ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setPreferredViewMode('page')}>Page</Button>
                <Button variant={viewMode === 'book' ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setPreferredViewMode('book')}>Livre</Button>
              </div>
              <div className="flex items-center"><Button variant="ghost" size="icon" onClick={() => setZoomAtPoint(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}><Minus className="h-4 w-4" /></Button><button type="button" className="min-w-12 text-xs" onClick={() => setZoomAtPoint(100)}>{zoom}%</button><Button variant="ghost" size="icon" onClick={() => setZoomAtPoint(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}><Plus className="h-4 w-4" /></Button></div>
              <Button variant={showFilmstrip ? 'secondary' : 'ghost'} size="icon" onClick={() => setShowFilmstrip(current => !current)} aria-label="Toutes les planches"><GalleryHorizontalEnd className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label="Plein écran">{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={handleNext}
                disabled={lastVisiblePage >= totalPages}
                className={cn(
                  cinemaModeEnabled 
                    ? "text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed" 
                    : "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Suivant
                <ChevronRight className="h-6 w-6 ml-2" />
              </Button>

              {lastVisiblePage >= totalPages && imageLoaded && (
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
