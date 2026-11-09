// Configuração fixa do aluno
const CONFIG_ALUNO = {
  turma: "8B",
  numeroChamada: 1,
  apiUrl: "https://boletim-api.profbt.com.br"
};

// Variável em memória para armazenar o PIN durante a sessão
let pinSessao = "";

// Estado de edição da tabela
let modoEdicao = false;

// Dados brutos padronizados locais do 8º Ano (fallback quando a API não retornar dados)
const dadosBoletimPadrao = [
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

// Dados atualmente ativos na aplicação (locais ou vindos da API)
let dadosBoletimAtual = [];

// Função obrigatória para ajustar e validar as notas antigas na escala 0 a 10
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  let strValor = String(valor).replace(",", ".");
  let num = parseFloat(strValor);

  if (isNaN(num)) {
    return null;
  }

  if (num > 10 && num <= 100) {
    num = num / 10;
  }

  if (num >= 0 && num <= 10) {
    return num;
  }

  return null;
}

// Função para fazer o login/abrir boletim na API
async function fazerLogin() {
  const inputPin = document.getElementById("input-pin");
  const msgLogin = document.getElementById("mensagem-login");
  const pinDigitado = inputPin.value.trim();

  if (!pinDigitado) {
    msgLogin.textContent = "Por favor, digite o PIN.";
    return;
  }

  msgLogin.textContent = "Conectando...";

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinDigitado
      })
    });

    if (resposta.status === 401) {
      msgLogin.textContent = "Turma, chamada ou PIN inválidos.";
      return;
    }

    if (resposta.status === 429) {
      msgLogin.textContent = "Muitas tentativas. Aguarde um minuto e tente novamente.";
      return;
    }

    if (!resposta.ok) {
      msgLogin.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
      return;
    }

    const resultado = await resposta.json();

    // Salva o PIN somente em memória e limpa o campo input imediatamente por segurança
    pinSessao = pinDigitado;
    inputPin.value = "";

    // Oculta a área de login e exibe o conteúdo do boletim
    document.getElementById("area-login").style.display = "none";
    document.getElementById("conteudo-boletim").style.display = "block";

    // Verifica se vieram dados da API
    if (resultado.dados && Array.isArray(resultado.dados.disciplinas) && resultado.dados.disciplinas.length > 0) {
      dadosBoletimAtual = resultado.dados.disciplinas;
    } else {
      // Quando não existirem dados salvos na API, usa os dados do script.js
      dadosBoletimAtual = JSON.parse(JSON.stringify(dadosBoletimPadrao));
    }

    renderizarBoletim();

  } catch (erro) {
    msgLogin.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  }
}

// Renderiza os cards e a tabela na tela
function renderizarBoletim() {
  const tabelaCorpo = document.getElementById("tabela-corpo");
  tabelaCorpo.innerHTML = "";

  let somaMediasValidas = 0;
  let qtdDisciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let bomDesempenhoQtd = 0;
  let atencaoQtd = 0;

  dadosBoletimAtual.forEach((item, index) => {
    // Tratamento flexível para faltas (array ou número direto)
    let faltasTotal = 0;
    if (Array.isArray(item.faltas)) {
      faltasTotal = item.faltas.reduce((acc, f) => acc + (Number(f) || 0), 0);
    } else if (typeof item.faltas === "object" && item.faltas !== null) {
      faltasTotal = (Number(item.faltas.tri1) || 0) + (Number(item.faltas.tri2) || 0) + (Number(item.faltas.tri3) || 0);
    } else {
      faltasTotal = Number(item.faltas) || 0;
    }

    totalFaltasGeral += faltasTotal;

    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

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

    const formatarNotaVisivel = (nota) => nota !== null ? nota.toFixed(1).replace(".", ",") : "—";
    const valorInputNota = (valor) => {
      if (valor === null || valor === undefined || valor === "") return "";
      return String(valor).replace(".", ",");
    };

    const tr = document.createElement("tr");

    if (modoEdicao) {
      // Obter faltas individuais para os campos de edição
      let f1 = 0, f2 = 0, f3 = 0;
      if (Array.isArray(item.faltas)) {
        f1 = item.faltas[0] ?? 0;
        f2 = item.faltas[1] ?? 0;
        f3 = item.faltas[2] ?? 0;
      } else if (