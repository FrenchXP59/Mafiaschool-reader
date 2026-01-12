import { useState, useEffect } from 'react';

export interface Episode {
  id: number;
  title: string;
  description: string;
  available: boolean;
}

export interface Chapter {
  id: number;
  title: string;
  episodeId: number;
  startPage: number;
  endPage: number;
  description: string;
}

export interface NarrativeMessage {
  enabled: boolean;
  position: 'before' | 'after';
  title: string;
  content: string;
  type: 'context' | 'investigation' | 'revelation' | 'transition';
}

export interface PageV2 {
  id: number;
  chapterId: number;
  image: string;
  alt: string;
  narrativeMessage?: NarrativeMessage;
}

export interface ComicDataV2 {
  title: string;
  author: string;
  description: string;
  version: string;
  episodes: Episode[];
  chapters: Chapter[];
  pages: PageV2[];
  settings: {
    guidedReading: {
      enabled: boolean;
      defaultActive: boolean;
    };
    cinemaMode: {
      enabled: boolean;
      defaultActive: boolean;
    };
    statistics: {
      enabled: boolean;
      trackCompletion: boolean;
      trackMostViewed: boolean;
    };
  };
}

export interface ReadingProgressV2 {
  currentPage: number;
  currentChapter: number;
  totalPages: number;
  lastReadAt: string;
  completedChapters: number[];
  readingTime: number;
  guidedReadingEnabled: boolean;
  cinemaModeEnabled: boolean;
  seenNarrativeMessages: number[]; // IDs des messages narratifs déjà vus
}

export interface ReadingStatistics {
  totalReads: number;
  completionRate: number;
  mostViewedPages: { pageId: number; views: number }[];
  averageReadingTime: number;
  lastUpdated: string;
}

const STORAGE_KEY_V2 = 'mafia-school-progress-v2';
const STATS_KEY = 'mafia-school-stats';
const NARRATIVE_SEEN_KEY = 'mafia-school-narrative-seen';

export function useComicReaderV2() {
  const [comicData, setComicData] = useState<ComicDataV2 | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [guidedReadingEnabled, setGuidedReadingEnabled] = useState(false);
  const [cinemaModeEnabled, setCinemaModeEnabled] = useState(false);
  const [seenNarrativeMessages, setSeenNarrativeMessages] = useState<number[]>(() => {
    // Charger les messages déjà vus depuis localStorage
    try {
      const saved = localStorage.getItem(NARRATIVE_SEEN_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingStartTime, setReadingStartTime] = useState<number>(Date.now());

  // Charger les données de la BD V2
  useEffect(() => {
    const loadComicData = async () => {
      try {
        const response = await fetch('/data/comic-v2.json');
        if (!response.ok) {
          throw new Error('Impossible de charger les données de la BD V2');
        }
        const data: ComicDataV2 = await response.json();
        setComicData(data);
        
        // Charger la progression sauvegardée
        const savedProgress = loadProgress();
        if (savedProgress && savedProgress.currentPage <= data.pages.length) {
          setCurrentPage(savedProgress.currentPage);
          setCurrentChapter(savedProgress.currentChapter);
          setGuidedReadingEnabled(savedProgress.guidedReadingEnabled);
          setCinemaModeEnabled(savedProgress.cinemaModeEnabled);
          // Charger les messages narratifs vus si disponibles
          if (savedProgress.seenNarrativeMessages) {
            setSeenNarrativeMessages(savedProgress.seenNarrativeMessages);
            localStorage.setItem(NARRATIVE_SEEN_KEY, JSON.stringify(savedProgress.seenNarrativeMessages));
          }
        } else {
          // Utiliser les paramètres par défaut
          setGuidedReadingEnabled(data.settings.guidedReading.defaultActive);
          setCinemaModeEnabled(data.settings.cinemaMode.defaultActive);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    loadComicData();
  }, []);

  // Sauvegarder la progression V2
  const saveProgress = (page: number, chapter?: number) => {
    if (!comicData) return;
    
    const currentChapterData = getCurrentChapter(page);
    const chapterToSave = chapter || currentChapterData?.id || 1;
    
    const progress: ReadingProgressV2 = {
      currentPage: page,
      currentChapter: chapterToSave,
      totalPages: comicData.pages.length,
      lastReadAt: new Date().toISOString(),
      completedChapters: getCompletedChapters(page),
      readingTime: Date.now() - readingStartTime,
      guidedReadingEnabled,
      cinemaModeEnabled,
      seenNarrativeMessages,
    };
    
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(progress));
    updateStatistics(page);
  };

  // Charger la progression sauvegardée V2
  const loadProgress = (): ReadingProgressV2 | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_V2);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Obtenir le chapitre actuel basé sur la page
  const getCurrentChapter = (page: number): Chapter | null => {
    if (!comicData) return null;
    return comicData.chapters.find(chapter => 
      page >= chapter.startPage && page <= chapter.endPage
    ) || null;
  };

  // Obtenir les chapitres complétés
  const getCompletedChapters = (currentPage: number): number[] => {
    if (!comicData) return [];
    return comicData.chapters
      .filter(chapter => currentPage > chapter.endPage)
      .map(chapter => chapter.id);
  };

  // Mettre à jour les statistiques
  const updateStatistics = (page: number) => {
    if (!comicData?.settings.statistics.enabled) return;
    
    try {
      const stats: ReadingStatistics = loadStatistics();
      
      // Incrémenter les vues de la page
      const pageViewIndex = stats.mostViewedPages.findIndex(p => p.pageId === page);
      if (pageViewIndex >= 0) {
        stats.mostViewedPages[pageViewIndex].views++;
      } else {
        stats.mostViewedPages.push({ pageId: page, views: 1 });
      }
      
      // Trier par nombre de vues
      stats.mostViewedPages.sort((a, b) => b.views - a.views);
      
      // Garder seulement les 10 pages les plus vues
      stats.mostViewedPages = stats.mostViewedPages.slice(0, 10);
      
      // Calculer le taux de complétion
      stats.completionRate = (page / comicData.pages.length) * 100;
      
      stats.lastUpdated = new Date().toISOString();
      
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.warn('Erreur lors de la mise à jour des statistiques:', error);
    }
  };

  // Charger les statistiques
  const loadStatistics = (): ReadingStatistics => {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des statistiques:', error);
    }
    
    // Statistiques par défaut
    return {
      totalReads: 0,
      completionRate: 0,
      mostViewedPages: [],
      averageReadingTime: 0,
      lastUpdated: new Date().toISOString(),
    };
  };

  // Marquer une lecture comme terminée
  const markReadingComplete = () => {
    if (!comicData?.settings.statistics.enabled) return;
    
    const stats = loadStatistics();
    stats.totalReads++;
    stats.completionRate = 100;
    stats.averageReadingTime = (stats.averageReadingTime + (Date.now() - readingStartTime)) / 2;
    stats.lastUpdated = new Date().toISOString();
    
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  };

  // Navigation
  const goToPage = (page: number) => {
    if (!comicData || page < 1 || page > comicData.pages.length) return;
    setCurrentPage(page);
    const chapter = getCurrentChapter(page);
    if (chapter) {
      setCurrentChapter(chapter.id);
    }
    saveProgress(page);
  };

  const nextPage = () => {
    if (!comicData || currentPage >= comicData.pages.length) return;
    goToPage(currentPage + 1);
  };

  const previousPage = () => {
    if (currentPage <= 1) return;
    goToPage(currentPage - 1);
  };

  const goToChapter = (chapterId: number) => {
    if (!comicData) return;
    const chapter = comicData.chapters.find(c => c.id === chapterId);
    if (chapter) {
      goToPage(chapter.startPage);
    }
  };

  const nextChapter = () => {
    if (!comicData) return;
    const nextChapterData = comicData.chapters.find(c => c.id === currentChapter + 1);
    if (nextChapterData) {
      goToPage(nextChapterData.startPage);
    }
  };

  const previousChapter = () => {
    if (!comicData) return;
    const prevChapterData = comicData.chapters.find(c => c.id === currentChapter - 1);
    if (prevChapterData) {
      goToPage(prevChapterData.startPage);
    }
  };

  const resetProgress = () => {
    localStorage.removeItem(STORAGE_KEY_V2);
    localStorage.removeItem(NARRATIVE_SEEN_KEY);
    setCurrentPage(1);
    setCurrentChapter(1);
    setSeenNarrativeMessages([]);
    setReadingStartTime(Date.now());
  };

  const hasProgress = () => {
    const progress = loadProgress();
    return progress && progress.currentPage > 1;
  };

  const resumeReading = () => {
    const progress = loadProgress();
    if (progress && comicData && progress.currentPage <= comicData.pages.length) {
      setCurrentPage(progress.currentPage);
      setCurrentChapter(progress.currentChapter);
    }
  };

  const toggleGuidedReading = () => {
    const newValue = !guidedReadingEnabled;
    setGuidedReadingEnabled(newValue);
    saveProgress(currentPage);
  };

  const toggleCinemaMode = () => {
    const newValue = !cinemaModeEnabled;
    setCinemaModeEnabled(newValue);
    saveProgress(currentPage);
  };

  const getCurrentPageData = () => {
    if (!comicData) return null;
    return comicData.pages.find(p => p.id === currentPage) || null;
  };

  const getCurrentChapterData = () => {
    if (!comicData) return null;
    return comicData.chapters.find(c => c.id === currentChapter) || null;
  };

  const getStatistics = () => {
    return loadStatistics();
  };

  // Fonctions pour gérer les messages narratifs vus
  const markNarrativeMessageAsSeen = (pageId: number) => {
    if (!seenNarrativeMessages.includes(pageId)) {
      const newSeenMessages = [...seenNarrativeMessages, pageId];
      setSeenNarrativeMessages(newSeenMessages);
      localStorage.setItem(NARRATIVE_SEEN_KEY, JSON.stringify(newSeenMessages));
    }
  };

  const isNarrativeMessageSeen = (pageId: number) => {
    return seenNarrativeMessages.includes(pageId);
  };

  const shouldShowNarrativeMessage = (pageId: number) => {
    const pageData = comicData?.pages.find(p => p.id === pageId);
    return (
      guidedReadingEnabled &&
      pageData?.narrativeMessage?.enabled &&
      !isNarrativeMessageSeen(pageId)
    );
  };

  return {
    // Données
    comicData,
    currentPage,
    currentChapter,
    isLoading,
    error,
    
    // États
    guidedReadingEnabled,
    cinemaModeEnabled,
    
    // Navigation
    goToPage,
    nextPage,
    previousPage,
    goToChapter,
    nextChapter,
    previousChapter,
    
    // Gestion
    resetProgress,
    hasProgress,
    resumeReading,
    markReadingComplete,
    
    // Modes
    toggleGuidedReading,
    toggleCinemaMode,
    
    // Messages narratifs
    markNarrativeMessageAsSeen,
    isNarrativeMessageSeen,
    shouldShowNarrativeMessage,
    
    // Utilitaires
    getCurrentPageData,
    getCurrentChapterData,
    getCompletedChapters: () => getCompletedChapters(currentPage),
    getStatistics,
    
    // Informations
    totalPages: comicData?.pages.length || 0,
    totalChapters: comicData?.chapters.length || 0,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === (comicData?.pages.length || 0),
    isFirstChapter: currentChapter === 1,
    isLastChapter: currentChapter === (comicData?.chapters.length || 0),
  };
}