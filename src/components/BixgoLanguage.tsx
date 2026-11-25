import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { bixgoLanguage, BIXGO_LANGUAGES } from '@/lib/bixgo-language';

export function BixgoLanguage() {
  const { language, setLanguage } = useI18n();
  return <div data-no-translate role="group" aria-label="BIXGO language" className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
    {BIXGO_LANGUAGES.map(code => <Button key={code} size="sm" variant={bixgoLanguage(language) === code ? 'default' : 'ghost'} title={code === 'id' ? 'Bahasa Indonesia' : 'English'} aria-label={code === 'id' ? 'Bahasa Indonesia' : 'English'} aria-pressed={bixgoLanguage(language) === code} onClick={() => setLanguage(code)} className="h-8 gap-1 px-2 text-[11px]"><span aria-hidden>{code === 'id' ? '🇮🇩' : '🇬🇧'}</span>{code.toUpperCase()}</Button>)}
  </div>;
}