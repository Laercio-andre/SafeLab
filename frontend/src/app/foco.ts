const SELETORES_FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function elementosFocaveis(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(SELETORES_FOCAVEIS));
}

export function prenderTab(evento: KeyboardEvent, container: Element | null): void {
  if (!container) return;
  const itens = elementosFocaveis(container);
  if (!itens.length) return;
  const primeiro = itens[0];
  const ultimo = itens[itens.length - 1];
  if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primeiro.focus();
  }
}

export function focar(elemento: Element | null | undefined): void {
  if (elemento instanceof HTMLElement) elemento.focus();
}
