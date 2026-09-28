// Dados brutos padronizados do 8º Ano
const dadosBoletim = [
  { disciplina: "Língua Portuguesa", tri1: 82, tri2: "7,8", tri3: 85, faltas: [2, 1, 1] },
  { disciplina: "Matemática", tri1: 52, tri2: "5,8", tri3: null, faltas: [3, 2, 1] },
  { disciplina: "Ciências", tri1: "8,1", tri2: 76, tri3: 8.0, faltas: [1, 2, 0] },
  { disciplina: "História", tri1: 7.0, tri2: 84, tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Geografia", tri1: 68, tri2: 7.3, tri3: "7,9", faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 86, tri2: "8,1", tri3: 8.7, faltas: [1, 0, 0] },
  { disciplina: "Arte", tri1: 9.0, tri2: 92, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 95, tri2: 9.0, tri3: "9,4", faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 88, tri2: 9.1, tri3: 93, faltas: [1, 0, 1] },
  { disciplina: "Educação Financeira", tri1: 74, tri2: "7,8", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Estudo Orientado", tri1: 8.0, tri2: 83, tri3: "8,5", faltas: [0, 1, 0] },
  { disciplina: "Redação e Leitura", tri1: 62, tri2: "6,8", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 48, tri2: 5.6, tri3: "6,0", faltas: [2, 2, 1] },
  { disciplina: "Literatura Arte e Movimento", tri1: "7,7", tri2: 80, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Práticas Experimentais", tri1: 58, tri2: "6,2", tri3: 6.4, faltas: [1, 1, 1] }
];

// Função obrigatória para ajustar e validar as notas na escala 0 a 10
function normalizarNota(valor) {
  // Se for vazio, nulo ou indefinido, retorna nulo (nota não lançada)
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Converte vírgula para ponto se o valor for uma texto
  let strValor = String(valor).replace(",", ".");
  let num = parseFloat(strValor);

  // Se não for um número válido, descarta
  if (isNaN(num)) {
    return null;
  }

  // Regras de ajuste da escala
  if (num > 10 && num <= 100) {
    num = num / 10;
  }

  // Valida se está dentro do intervalo 0 a 10
  if (num >= 0 && num <= 10) {
    return num;
  }

  return null; // Valores fora das regras são descartados
}

// Função principal que constrói o boletim na tela
function renderizarBoletim() {
  const tabelaCorpo = document.getElementById("tabela-corpo");
  tabelaCorpo.innerHTML = "";

  let somaMediasValidas = 0;
  let qtdDisciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let bomDesempenhoQtd = 0;
  let atencaoQtd = 0;

  // Passa por cada disciplina da lista
  dadosBoletim.forEach(item => {
    // Normaliza as 3 notas
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    // Calcula total de faltas da disciplina
    const faltasTotal = item.faltas.reduce((acc, f) => acc + f, 0);
    totalFaltasGeral += faltasTotal;

    // Seleciona e calcula apenas as notas válidas disponíveis
    const notasDisponiveis = [n1, n2, n3].filter(n => n !== null);
    
    let media = null;
    let situacao = "Nota ainda não disponível";
    let classeSituacao = "situacao-indisponivel";

    if (notasDisponiveis.length > 0) {
      const soma = notasDisponiveis.reduce((acc, n) => acc + n, 0);
      media = soma / notasDisponiveis.length;

      somaMediasValidas += media;
      qtdDisciplinasComMedia++;

      if (media >= 6.0) {
        situacao = "Bom desempenho";
        classeSituacao = "situacao-bom";
        bomDesempenhoQtd++;
      } else {
        situacao = "Atenção";
        classeSituacao = "situacao-atencao";
        atencaoQtd++;
      }
    }

    // Formatação visual das notas para a tabela
    const formatarNota = (nota) => nota !== null ? nota.toFixed(1).replace(".", ",") : "—";

    // Cria a linha HTML para a tabela
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.disciplina}</strong></td>
      <td>${formatarNota(n1)}</td>
      <td>${formatarNota(n2)}</td>
      <td>${formatarNota(n3)}</td>
      <td><strong>${formatarNota(media)}</strong></td>
      <td>${faltasTotal}</td>
      <td class="${classeSituacao}">${situacao}</td>
    `;
    tabelaCorpo.appendChild(tr);
  });

  // Atualização dos Cards de Resumo
  const mediaGeral = qtdDisciplinasComMedia > 0 
    ? (somaMediasValidas / qtdDisciplinasComMedia).toFixed(1).replace(".", ",") 
    : "—";

  document.getElementById("media-geral").textContent = mediaGeral;
  document.getElementById("total-faltas").textContent = totalFaltasGeral;
  document.getElementById("bom-desempenho").textContent = bomDesempenhoQtd;
  document.getElementById("precisa-atencao").textContent = atencaoQtd;

  /* 
    NOTA: O percentual de frequência de 92% exibido no card é APENAS FICTÍCIO/DEMONSTRATIVO 
    para esta primeira etapa do projeto. Ele não é calculado a partir do total de faltas.
  */
}

// Executa a função assim que a página é carregada
document.addEventListener("DOMContentLoaded", renderizarBoletim);