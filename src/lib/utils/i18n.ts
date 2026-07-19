/**
 * Função utilitária para pluralização em português.
 * Retorna o termo correto baseado na quantidade.
 */
export function formatPlural(value: number, singularText: string, pluralText: string): string {
  const absValue = Math.abs(value);
  if (absValue === 1) {
    return `${value} ${singularText}`;
  }
  return `${value} ${pluralText}`;
}
