/** English replacements for older owner-saved Indonesian copy, applied when content is read so the English UI stays consistent until the owner re-saves. */
const MAP: Record<string, string> = {
  'Setting up BIXLINK identity and account access.': 'Establishing the BIXLINK identity and account access.',
  'Testing staking and internal records.': 'Testing staking and internal records.',
  'Building an asset verification framework.': 'Building the asset verification framework.',
  'Developing utility and community.': 'Expanding utilities and the community.',
  'Designing community governance.': 'Designing community governance.',
  'Reviewing ecosystem development with a planned supply of 21 million BIX, not a price target.': 'Reviewing ecosystem progress against the planned 21 million BIX supply — not a price target.',
  '21 MILLION MILESTONE': '21M MILESTONE',
  'Planned foreign exchange research for BIXLINK diversification. Results are shown only after recording and review.': 'Planned foreign-exchange research to diversify BIXLINK. Results are shown only after they are recorded and reviewed.',
  'Digital utility development and crypto research. Internal BIX records are separate from trading and on-chain tokens.': 'Digital utility development and crypto research. Internal BIX records are separate from trading and on-chain tokens.',
  'Planned transparent reporting of real-world assets. Asset verification and legal review are required before integration.': 'Planned transparent real-world asset reporting. Asset verification and legal review are required before integration.',
  'Planned promotional space in the app, on the website and in the community. Revenue is shown after recording and review.': 'Planned promotional space across the app, website and community. Revenue is shown only after it is recorded and reviewed.',
};
const PARTS: Array<[string, string]> = [['A full merchandise range for your loyalty collection as part of BIXLINK', 'Complete merchandise for your loyalty collection as part of BIXLINK']];

export function toEnglish<T>(value: T): T {
  if (typeof value === 'string') {
    let s: string = MAP[value.trim()] ?? value;
    for (const [a, b] of PARTS) s = s.split(a).join(b);
    return s as T;
  }
  if (Array.isArray(value)) return value.map(toEnglish) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toEnglish(v)])) as T;
  return value;
}
