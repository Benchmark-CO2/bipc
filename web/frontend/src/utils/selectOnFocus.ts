// Elemento que estava focado quando a janela perdeu o foco. Ao voltar para a
// janela (Alt+Tab, minimizar/restaurar), o navegador redispara `focus` nele;
// esse foco não é uma nova entrada no campo e não deve selecionar o conteúdo.
let activeElementOnWindowBlur: Element | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("blur", () => {
    activeElementOnWindowBlur = document.activeElement;
  });
  // O `focus` devolvido ao campo chega junto com o da janela; depois disso a
  // referência não vale mais (o campo pode ter sido desmontado ou desfocado
  // enquanto a janela estava em segundo plano).
  window.addEventListener("focus", () => {
    setTimeout(() => {
      activeElementOnWindowBlur = null;
    }, 0);
  });
}

/**
 * Seleciona o conteúdo de um input ao focar (ex.: "0,00" importado do IFC),
 * para digitar o valor sem apagar antes.
 *
 * - O rAF evita que o clique reposicione o cursor por cima da seleção.
 * - O foco devolvido pela volta da janela não seleciona nada.
 * - Se o usuário começar a digitar antes do rAF rodar (o rAF atrasa com a
 *   janela em segundo plano), a seleção é cancelada; senão o próximo dígito
 *   substituiria o que já foi digitado.
 */
export const selectContentOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  const input = e.currentTarget;

  if (activeElementOnWindowBlur === input) {
    activeElementOnWindowBlur = null;
    return;
  }
  activeElementOnWindowBlur = null;

  const cancel = () => {
    cancelAnimationFrame(frame);
    input.removeEventListener("keydown", cancel);
  };
  input.addEventListener("keydown", cancel, { once: true });

  const frame = requestAnimationFrame(() => {
    input.removeEventListener("keydown", cancel);
    if (document.activeElement !== input) return;
    try {
      input.select();
    } catch {
      /* no-op */
    }
  });
};
