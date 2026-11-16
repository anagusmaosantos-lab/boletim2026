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

// Instâncias dos gráficos (Chart.js)
let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;

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
      } else if (typeof item.faltas === "object" && item.faltas !== null) {
        f1 = item.faltas.tri1 ?? 0;
        f2 = item.faltas.tri2 ?? 0;
        f3 = item.faltas.tri3 ?? 0;
      } else {
        f1 = item.faltas ?? 0;
      }

      tr.innerHTML = `
        <td><strong class="nome-disc"></strong></td>
        <td><input type="text" class="input-edicao input-nota" data-index="${index}" data-campo="tri1" value="${valorInputNota(item.tri1)}"></td>
        <td><input type="text" class="input-edicao input-nota" data-index="${index}" data-campo="tri2" value="${valorInputNota(item.tri2)}"></td>
        <td><input type="text" class="input-edicao input-nota" data-index="${index}" data-campo="tri3" value="${valorInputNota(item.tri3)}"></td>
        <td><strong>${formatarNotaVisivel(media)}</strong></td>
        <td>
          <input type="text" title="1º Tri" class="input-edicao input-falta" data-index="${index}" data-tri="0" value="${f1}">
          <input type="text" title="2º Tri" class="input-edicao input-falta" data-index="${index}" data-tri="1" value="${f2}">
          <input type="text" title="3º Tri" class="input-edicao input-falta" data-index="${index}" data-tri="2" value="${f3}">
        </td>
        <td class="${classeSituacao}">${situacao}</td>
      `;
      tr.querySelector(".nome-disc").textContent = item.disciplina;
    } else {
      tr.innerHTML = `
        <td><strong class="nome-disc"></strong></td>
        <td>${formatarNotaVisivel(n1)}</td>
        <td>${formatarNotaVisivel(n2)}</td>
        <td>${formatarNotaVisivel(n3)}</td>
        <td><strong>${formatarNotaVisivel(media)}</strong></td>
        <td>${faltasTotal}</td>
        <td class="${classeSituacao}">${situacao}</td>
      `;
      tr.querySelector(".nome-disc").textContent = item.disciplina;
    }

    tabelaCorpo.appendChild(tr);
  });

  const mediaGeral = qtdDisciplinasComMedia > 0 
    ? (somaMediasValidas / qtdDisciplinasComMedia).toFixed(1).replace(".", ",") 
    : "—";

  document.getElementById("media-geral").textContent = mediaGeral;
  document.getElementById("total-faltas").textContent = totalFaltasGeral;
  document.getElementById("bom-desempenho").textContent = bomDesempenhoQtd;
  document.getElementById("precisa-atencao").textContent = atencaoQtd;

  atualizarGraficos();
}

// Alterna entre o modo de visualização e edição
function alternarEdicao() {
  modoEdicao = !modoEdicao;
  const btnEdicao = document.getElementById("btn-alternar-edicao");
  const btnSalvar = document.getElementById("btn-salvar");

  if (modoEdicao) {
    btnEdicao.textContent = "Cancelar edição";
    btnSalvar.style.display = "inline-block";
  } else {
    btnEdicao.textContent = "Alterar dados";
    btnSalvar.style.display = "none";
  }

  renderizarBoletim();
}

// Valida uma nota digitada pelo estudante (Regra 2)
function validarNotaDigitada(str) {
  if (str === null || str === undefined || str.trim() === "") {
    return { ok: true, valor: null };
  }
  const limpo = str.trim().replace(",", ".");
  const num = Number(limpo);

  if (isNaN(num) || num < 0 || num > 10) {
    return { ok: false };
  }

  return { ok: true, valor: num };
}

// Valida uma falta digitada pelo estudante
function validarFaltaDigitada(str) {
  if (str === null || str === undefined || str.trim() === "") {
    return { ok: false };
  }
  const limpo = str.trim();
  if (!/^\d+$/.test(limpo)) {
    return { ok: false };
  }
  const num = Number(limpo);
  if (num < 0) {
    return { ok: false };
  }

  return { ok: true, valor: num };
}

// Função para salvar as alterações efetuadas na API
async function salvarAlteracoes() {
  const statusEl = document.getElementById("status-salvamento");
  statusEl.textContent = "";

  // Remove marcações de erros anteriores
  document.querySelectorAll(".input-invalido").forEach(el => el.classList.remove("input-invalido"));

  let possuiErro = false;
  const inputsNotas = document.querySelectorAll(".input-nota");
  const inputsFaltas = document.querySelectorAll(".input-falta");

  // Validação dos campos de notas
  inputsNotas.forEach(input => {
    const val = input.value;
    const res = validarNotaDigitada(val);
    if (!res.ok) {
      input.classList.add("input-invalido");
      possuiErro = true;
    }
  });

  // Validação dos campos de faltas
  inputsFaltas.forEach(input => {
    const val = input.value;
    const res = validarFaltaDigitada(val);
    if (!res.ok) {
      input.classList.add("input-invalido");
      possuiErro = true;
    }
  });

  if (possuiErro) {
    statusEl.textContent = "Verifique os campos destacados em vermelho.";
    return;
  }

  // Atualiza o objeto de dados com os valores validados
  inputsNotas.forEach(input => {
    const idx = input.getAttribute("data-index");
    const campo = input.getAttribute("data-campo");
    const res = validarNotaDigitada(input.value);
    dadosBoletimAtual[idx][campo] = res.valor;
  });

  inputsFaltas.forEach(input => {
    const idx = input.getAttribute("data-index");
    const triIdx = Number(input.getAttribute("data-tri"));
    const res = validarFaltaDigitada(input.value);

    if (!Array.isArray(dadosBoletimAtual[idx].faltas)) {
      dadosBoletimAtual[idx].faltas = [0, 0, 0];
    }
    dadosBoletimAtual[idx].faltas[triIdx] = res.valor;
  });

  statusEl.textContent = "Salvando...";

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinSessao,
        dados: {
          disciplinas: dadosBoletimAtual
        }
      })
    });

    if (!resposta.ok) {
      statusEl.textContent = "Erro ao salvar alterações no servidor.";
      return;
    }

    statusEl.textContent = "Dados salvos com sucesso.";

    // Desativa o modo de edição e atualiza a exibição
    modoEdicao = false;
    document.getElementById("btn-alternar-edicao").textContent = "Alterar dados";
    document.getElementById("btn-salvar").style.display = "none";

    renderizarBoletim();

  } catch (erro) {
    statusEl.textContent = "Erro ao salvar alterações no servidor.";
  }
}

// =========================================================================
// CAMADA DE LEITURA: GRÁFICOS (CHART.JS)
// =========================================================================

function atualizarGraficoMedias() {
  const canvas = document.getElementById("graficoMediasDisciplinas");
  if (!canvas || typeof Chart === "undefined") return;

  if (graficoMedias) {
    graficoMedias.destroy();
  }

  const labels = [];
  const medias = [];
  const coresBarras = [];

  dadosBoletimAtual.forEach(item => {
    labels.push(item.disciplina);
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);
    const validas = [n1, n2, n3].filter(n => n !== null);

    if (validas.length > 0) {
      const soma = validas.reduce((acc, v) => acc + v, 0);
      const media = Number((soma / validas.length).toFixed(2));
      medias.push(media);
      coresBarras.push(media >= 6.0 ? "#2563eb" : "#b91c1c");
    } else {
      medias.push(null);
      coresBarras.push("#94a3b8");
    }
  });

  graficoMedias = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Média",
        data: medias,
        backgroundColor: coresBarras,
        borderRadius: 0
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 10,
          ticks: { stepSize: 2, color: "#475569" },
          grid: { color: "#e2e8f0" }
        },
        y: {
          ticks: { color: "#1e293b", font: { size: 11 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed.x;
              if (val === null || val === undefined) return "Sem nota";
              return `${context.label}: ${val.toFixed(1).replace(".", ",")}`;
            }
          }
        }
      }
    }
  });
}

function atualizarGraficoEvolucao() {
  const canvas = document.getElementById("graficoEvolucaoTrimestres");
  if (!canvas || typeof Chart === "undefined") return;

  if (graficoEvolucao) {
    graficoEvolucao.destroy();
  }

  let somaT1 = 0, qtdT1 = 0;
  let somaT2 = 0, qtdT2 = 0;
  let somaT3 = 0, qtdT3 = 0;

  dadosBoletimAtual.forEach(item => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    if (n1 !== null) { somaT1 += n1; qtdT1++; }
    if (n2 !== null) { somaT2 += n2; qtdT2++; }
    if (n3 !== null) { somaT3 += n3; qtdT3++; }
  });

  const mediaT1 = qtdT1 > 0 ? Number((somaT1 / qtdT1).toFixed(2)) : null;
  const mediaT2 = qtdT2 > 0 ? Number((somaT2 / qtdT2).toFixed(2)) : null;
  const mediaT3 = qtdT3 > 0 ? Number((somaT3 / qtdT3).toFixed(2)) : null;

  graficoEvolucao = new Chart(canvas, {
    type: "line",
    data: {
      labels: ["1º Tri", "2º Tri", "3º Tri"],
      datasets: [{
        label: "Média Geral",
        data: [mediaT1, mediaT2, mediaT3],
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124, 58, 237, 0.15)",
        pointBackgroundColor: "#2563eb",
        pointRadius: 5,
        borderWidth: 3,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { stepSize: 2, color: "#475569" },
          grid: { color: "#e2e8f0" }
        },
        x: {
          ticks: { color: "#1e293b" },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              if (val === null || val === undefined) return "Sem notas";
              return `Média: ${val.toFixed(1).replace(".", ",")}`;
            }
          }
        }
      }
    }
  });
}

function atualizarGraficoFaltas() {
  const canvas = document.getElementById("graficoFaltasTrimestres");
  if (!canvas || typeof Chart === "undefined") return;

  if (graficoFaltas) {
    graficoFaltas.destroy();
  }

  let faltasTri1 = 0;
  let faltasTri2 = 0;
  let faltasTri3 = 0;

  dadosBoletimAtual.forEach(item => {
    if (Array.isArray(item.faltas)) {
      faltasTri1 += Number(item.faltas[0]) || 0;
      faltasTri2 += Number(item.faltas[1]) || 0;
      faltasTri3 += Number(item.faltas[2]) || 0;
    } else if (typeof item.faltas === "object" && item.faltas !== null) {
      faltasTri1 += Number(item.faltas.tri1) || 0;
      faltasTri2 += Number(item.faltas.tri2) || 0;
      faltasTri3 += Number(item.faltas.tri3) || 0;
    } else {
      faltasTri1 += Number(item.faltas) || 0;
    }
  });

  const totalFaltas = faltasTri1 + faltasTri2 + faltasTri3;
  const estadoEl = document.getElementById("estadoFaltas");
  const cardFaltas = document.getElementById("card-faltas-trimestre");
  const emPerigo = totalFaltas >= 350;

  if (estadoEl && cardFaltas) {
    if (emPerigo) {
      estadoEl.style.display = "inline-block";
      cardFaltas.classList.add("grafico-card-perigo");
    } else {
      estadoEl.style.display = "none";
      cardFaltas.classList.remove("grafico-card-perigo");
    }
  }

  const corBarra = emPerigo ? "#b91c1c" : "#1d4ed8";

  graficoFaltas = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["1º Tri", "2º Tri", "3º Tri"],
      datasets: [{
        label: "Faltas",
        data: [faltasTri1, faltasTri2, faltasTri3],
        backgroundColor: [corBarra, "#6d28d9", "#2563eb"],
        borderRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: "#475569" },
          grid: { color: "#e2e8f0" }
        },
        x: {
          ticks: { color: "#1e293b" },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              return `${context.label}: ${val} faltas`;
            }
          }
        }
      }
    }
  });
}

function atualizarGraficos() {
  atualizarGraficoMedias();
  atualizarGraficoEvolucao();
  atualizarGraficoFaltas();
}