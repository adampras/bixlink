import { useI18n } from './i18n';
import { bixgoText } from './bixgo-language';
export function useBixgoText() {
  const { language } = useI18n();
  return (text: string) => bixgoText(text, language);
}