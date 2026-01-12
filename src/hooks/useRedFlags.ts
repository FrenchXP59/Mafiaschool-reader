import { useState, useEffect } from 'react';

export interface RedFlag {
  id: number;
  text: string;
  category: string;
}

export interface RedFlagsData {
  title: string;
  introduction: string;
  description: string;
  redFlags: RedFlag[];
  hashtags: string[];
  disclaimer: string;
}

export interface RedFlagsPreferences {
  hasAccessedRedFlags: boolean;
  lastAccessedAt: string;
  preferredAccess: 'direct' | 'subtle';
}

const RED_FLAGS_PREFS_KEY = 'mafia-school-red-flags-prefs';

export function useRedFlags() {
  const [redFlagsData, setRedFlagsData] = useState<RedFlagsData | null>(null);
  const [preferences, setPreferences] = useState<RedFlagsPreferences>(() => {
    // Charger les préférences depuis localStorage
    try {
      const saved = localStorage.getItem(RED_FLAGS_PREFS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des préférences red flags:', error);
    }
    
    // Préférences par défaut
    return {
      hasAccessedRedFlags: false,
      lastAccessedAt: '',
      preferredAccess: 'subtle' as const,
    };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données des red flags
  useEffect(() => {
    const loadRedFlagsData = async () => {
      try {
        const response = await fetch('/data/red-flags.json');
        if (!response.ok) {
          throw new Error('Impossible de charger les données des red flags');
        }
        const data: RedFlagsData = await response.json();
        setRedFlagsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    loadRedFlagsData();
  }, []);

  // Sauvegarder les préférences
  const savePreferences = (newPrefs: Partial<RedFlagsPreferences>) => {
    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);
    localStorage.setItem(RED_FLAGS_PREFS_KEY, JSON.stringify(updatedPrefs));
  };

  // Marquer l'accès aux red flags
  const markRedFlagsAccessed = () => {
    savePreferences({
      hasAccessedRedFlags: true,
      lastAccessedAt: new Date().toISOString(),
    });
  };

  // Définir la préférence d'accès
  const setAccessPreference = (preference: 'direct' | 'subtle') => {
    savePreferences({ preferredAccess: preference });
  };

  // Obtenir les red flags par catégorie
  const getRedFlagsByCategory = () => {
    if (!redFlagsData) return {};
    
    return redFlagsData.redFlags.reduce((acc, flag) => {
      if (!acc[flag.category]) {
        acc[flag.category] = [];
      }
      acc[flag.category].push(flag);
      return acc;
    }, {} as Record<string, RedFlag[]>);
  };

  // Obtenir un échantillon aléatoire de red flags
  const getRandomRedFlags = (count: number = 5) => {
    if (!redFlagsData) return [];
    
    const shuffled = [...redFlagsData.redFlags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Réinitialiser les préférences
  const resetPreferences = () => {
    localStorage.removeItem(RED_FLAGS_PREFS_KEY);
    setPreferences({
      hasAccessedRedFlags: false,
      lastAccessedAt: '',
      preferredAccess: 'subtle',
    });
  };

  return {
    // Données
    redFlagsData,
    preferences,
    isLoading,
    error,
    
    // Actions
    markRedFlagsAccessed,
    setAccessPreference,
    resetPreferences,
    
    // Utilitaires
    getRedFlagsByCategory,
    getRandomRedFlags,
    
    // États calculés
    hasAccessedBefore: preferences.hasAccessedRedFlags,
    shouldShowDirectAccess: preferences.hasAccessedRedFlags && preferences.preferredAccess === 'direct',
  };
}