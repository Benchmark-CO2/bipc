/**
 * Duplo clique seleciona o conteúdo inteiro do campo. O duplo clique nativo
 * para nos separadores ("1.234,56" selecionaria só uma parte).
 *
 * O clique simples não seleciona nada: o cursor fica onde o usuário clicou.
 * Selecionar ao focar foi removido porque qualquer `focus` repetido (troca de
 * janela, extensões, IME) selecionava de novo e o próximo dígito apagava o
 * que já tinha sido digitado.
 */
export const selectAllOnDoubleClick = (
  e: React.MouseEvent<HTMLInputElement>,
) => {
  e.currentTarget.select();
};
