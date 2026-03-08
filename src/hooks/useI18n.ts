import { useState, useEffect, useCallback } from 'react';
import { getLang, setLang, subscribe, t as translate, type Lang, type TranslationKey } from '@/lib/i18n';

export function useI18n() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => setTick(t => t + 1));
  }, []);

  const toggleLang = useCallback(() => {
    setLang(getLang() === 'en' ? 'bn' : 'en');
  }, []);

  return {
    lang: getLang(),
    t: translate,
    setLang,
    toggleLang,
  };
}
