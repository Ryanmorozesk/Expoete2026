(function () {
  "use strict";

  /* =====================================================
     Compartilhamento via QR Code: guarda o último resultado
     calculado e monta um resumo simples de texto para o QR
  ===================================================== */
  let resultadoAtual = null;

  // Remove acentos: alguns leitores de QR/celulares mais antigos
  // exibem caracteres acentuados errado, então o resumo do QR
  // sai sem acento por segurança (o site continua acentuado normalmente).
  function removerAcentos(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[—–]/g, "-");
  }

  const TEMAS_QR = [
    ["alimentacao", "Alimentacao"],
    ["atividade", "Atividade fisica"],
    ["sono", "Sono e bem-estar"],
    ["hidratacao", "Hidratacao"],
  ];

  // dicasPorTema = quantas sugestões entram em cada tema (0 = só os números)
  function montarResumoTexto(r, dicasPorTema) {
    const linhas = [
      "NutriVida - seu panorama",
      `IMC: ${r.imc.toFixed(1)} (${r.classeIMC})`,
      `Calorias/dia: ${r.calorias} kcal`,
      `Agua recomendada: ${r.aguaLitrosRecomendado}L/dia`,
      `Proteina: ${r.macros.proteina}g | Carboidratos: ${r.macros.carbo}g | Gordura: ${r.macros.gordura}g`,
    ];

    if (dicasPorTema > 0 && r.dicas) {
      linhas.push("", "SUGESTOES POR TEMA");
      TEMAS_QR.forEach(([chave, titulo]) => {
        const lista = r.dicas[chave] || [];
        if (!lista.length) return;
        linhas.push("", `[${titulo}]`);
        lista.slice(0, dicasPorTema).forEach((dica) => linhas.push(`- ${dica}`));
      });
    }
    return removerAcentos(linhas.join("\n"));
  }

  // Um QR muito cheio fica difícil de ler na tela. Tenta 2 sugestões por
  // tema e, se o texto ficar grande demais, cai para 1 por tema.
  const LIMITE_CARACTERES_QR = 900;
  function escolherResumoQR(r) {
    let resumo = montarResumoTexto(r, 2);
    if (resumo.length > LIMITE_CARACTERES_QR) resumo = montarResumoTexto(r, 1);
    return resumo;
  }

  /* =====================================================
     Navigation: mobile toggle + scrollspy
  ===================================================== */
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("nav-toggle");

  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".mobile-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  const navLinks = Array.from(document.querySelectorAll('a[data-nav]'));
  const spySections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && spySections.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === id);
          });
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    spySections.forEach((section) => spyObserver.observe(section));
  }

  /* =====================================================
     Scroll reveal
  ===================================================== */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* =====================================================
     Back to top
  ===================================================== */
  const backToTop = document.getElementById("back-to-top");
  window.addEventListener("scroll", () => {
    backToTop.classList.toggle("is-visible", window.scrollY > 600);
  });
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* =====================================================
     Avalie o projeto (ratings) — roda em qualquer página
     que tenha o formulário #rating-form
  ===================================================== */
  const RATINGS_KEY = "nutrivida-avaliacoes";
  const ratingForm = document.getElementById("rating-form");

  if (ratingForm) {
    const notaError = document.getElementById("nota-error");
    const ratingFeedback = document.getElementById("rating-feedback");

    const loadRatings = () => {
      try {
        const raw = JSON.parse(window.localStorage.getItem(RATINGS_KEY) || "[]");
        return Array.isArray(raw) ? raw : [];
      } catch (err) {
        return [];
      }
    };

    const saveRatings = (list) => {
      try {
        window.localStorage.setItem(RATINGS_KEY, JSON.stringify(list));
      } catch (err) {
        /* localStorage indisponível — segue sem salvar */
      }
    };

    const starsText = (nota) => {
      const cheias = Math.round(nota);
      return "★".repeat(cheias) + "☆".repeat(5 - cheias);
    };

    const escapeHtml = (str) => {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    };

    function renderRatings() {
      const list = loadRatings();
      const countEl = document.getElementById("ratings-count");
      const averageEl = document.getElementById("average-value");
      const averageStarsEl = document.getElementById("average-stars");
      const testimonialList = document.getElementById("testimonial-list");

      if (list.length === 0) {
        averageEl.textContent = "--";
        averageStarsEl.textContent = starsText(0);
        countEl.textContent = "Nenhuma avaliação ainda";
        testimonialList.innerHTML = '<li class="testimonial-empty">Seja a primeira pessoa a avaliar o projeto.</li>';
        return;
      }

      const soma = list.reduce((acc, item) => acc + Number(item.nota || 0), 0);
      const media = soma / list.length;

      averageEl.textContent = media.toFixed(1);
      averageStarsEl.textContent = starsText(media);
      countEl.textContent = `${list.length} avaliação${list.length === 1 ? "" : "ões"}`;

      testimonialList.innerHTML = "";
      list
        .slice()
        .reverse()
        .slice(0, 20)
        .forEach((item) => {
          const li = document.createElement("li");
          li.className = "testimonial-card";
          const nome = (item.nome || "Visitante anônimo").trim() || "Visitante anônimo";
          const comentario = (item.comentario || "").trim();
          li.innerHTML = `
            <div class="testimonial-stars">${starsText(Number(item.nota || 0))}</div>
            <div class="testimonial-name">${escapeHtml(nome)}</div>
            ${comentario ? `<p class="testimonial-text">${escapeHtml(comentario)}</p>` : ""}
          `;
          testimonialList.appendChild(li);
        });
    }

    ratingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const notaInput = ratingForm.querySelector('input[name="nota"]:checked');
      if (!notaInput) {
        notaError.classList.add("is-visible");
        notaError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      notaError.classList.remove("is-visible");

      const data = new FormData(ratingForm);
      const list = loadRatings();
      list.push({
        nota: Number(data.get("nota")),
        nome: (data.get("nome") || "").toString().trim().slice(0, 40),
        comentario: (data.get("comentario") || "").toString().trim().slice(0, 300),
        data: new Date().toISOString(),
      });
      saveRatings(list);
      renderRatings();

      ratingForm.reset();
      ratingFeedback.textContent = "Obrigado pela avaliação! 💚";
      setTimeout(() => (ratingFeedback.textContent = ""), 4000);
    });

    const exportBtn = document.getElementById("export-csv-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const list = loadRatings();
        if (list.length === 0) {
          window.alert("Ainda não há avaliações salvas neste dispositivo.");
          return;
        }
        const linhas = [["data", "nota", "nome", "comentario"]];
        list.forEach((item) => {
          linhas.push([
            item.data || "",
            String(item.nota || ""),
            (item.nome || "").replace(/"/g, '""'),
            (item.comentario || "").replace(/"/g, '""'),
          ]);
        });
        const csv = linhas.map((linha) => linha.map((campo) => `"${campo}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "avaliacoes-nutrivida.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }

    const clearBtn = document.getElementById("clear-ratings-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (!window.confirm("Apagar todas as avaliações salvas neste dispositivo?")) return;
        saveRatings([]);
        renderRatings();
      });
    }

    renderRatings();
  }

  /* =====================================================
     Wizard (só existe na página da calculadora)
  ===================================================== */
  const form = document.getElementById("nutri-form");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".form-step"));
  const leaves = Array.from(document.querySelectorAll(".progress-leaf"));
  const TOTAL_STEPS = steps.length;
  let currentStep = 1;

  function goToStep(stepNumber, semRolar) {
    steps.forEach((step) => {
      step.classList.toggle("is-active", Number(step.dataset.step) === stepNumber);
    });
    leaves.forEach((leaf) => {
      const n = Number(leaf.dataset.step);
      leaf.classList.toggle("active", n === stepNumber);
      leaf.classList.toggle("done", n < stepNumber);
    });
    document.querySelector(".progress-track").setAttribute("aria-valuenow", String(stepNumber));
    currentStep = stepNumber;
    const card = document.querySelector(".assessment-card");
    if (card && !semRolar) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearStepErrors(step) {
    step.querySelectorAll(".field-error.is-visible").forEach((el) => el.classList.remove("is-visible"));
    step.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    step.querySelectorAll("input.is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  }

  function validateStep(stepNumber) {
    const step = steps.find((s) => Number(s.dataset.step) === stepNumber);
    clearStepErrors(step);

    let valid = true;
    let firstInvalid = null;

    // Numeric / text required inputs
    step.querySelectorAll('input[required][type="number"], input[required][type="text"]').forEach((input) => {
      const value = input.value.trim();
      const min = input.min ? Number(input.min) : -Infinity;
      const max = input.max ? Number(input.max) : Infinity;
      const numeric = Number(value);
      const isValid = value !== "" && !Number.isNaN(numeric) && numeric >= min && numeric <= max;
      if (!isValid) {
        valid = false;
        input.classList.add("is-invalid");
        const err = step.querySelector(`.field-error[data-error-for="${input.id}"]`);
        if (err) err.classList.add("is-visible");
        if (!firstInvalid) firstInvalid = input;
      }
    });

    // Radio groups
    const radioGroups = new Set();
    step.querySelectorAll('input[type="radio"][required]').forEach((input) => radioGroups.add(input.name));
    radioGroups.forEach((name) => {
      const checked = step.querySelector(`input[name="${name}"]:checked`);
      if (!checked) {
        valid = false;
        const container = step.querySelector(`input[name="${name}"]`).closest(".choice-grid, .pill-group");
        if (container) container.classList.add("is-invalid");
        if (!firstInvalid) firstInvalid = step.querySelector(`input[name="${name}"]`);
      }
    });

    if (!valid && firstInvalid) {
      firstInvalid.closest(".field, .choice-grid, .pill-group").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return valid;
  }

  form.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      goToStep(Math.min(currentStep + 1, TOTAL_STEPS));
    });
  });

  form.querySelectorAll("[data-prev]").forEach((btn) => {
    btn.addEventListener("click", () => goToStep(Math.max(currentStep - 1, 1)));
  });

  /* =====================================================
     Live labels for range sliders
  ===================================================== */
  const sono = document.getElementById("sono");
  const sonoOut = document.getElementById("sono-out");
  sono.addEventListener("input", () => (sonoOut.textContent = `${sono.value}h`));

  const agua = document.getElementById("agua");
  const aguaOut = document.getElementById("agua-out");
  agua.addEventListener("input", () => (aguaOut.textContent = agua.value));

  const refeicoes = document.getElementById("refeicoes");
  const refeicoesOut = document.getElementById("refeicoes-out");
  refeicoes.addEventListener("input", () => (refeicoesOut.textContent = refeicoes.value));

  const tela = document.getElementById("tela");
  const telaOut = document.getElementById("tela-out");
  tela.addEventListener("input", () => (telaOut.textContent = `${tela.value}h`));

  const estresse = document.getElementById("estresse");
  const estresseOut = document.getElementById("estresse-out");
  const ESTRESSE_LABELS = { 1: "Bem tranquilo", 2: "Leve", 3: "Moderado", 4: "Alto", 5: "Muito alto" };
  estresse.addEventListener("input", () => (estresseOut.textContent = ESTRESSE_LABELS[estresse.value]));

  /* =====================================================
     Formulário sempre começa zerado (nada é salvo entre visitas)
  ===================================================== */
  function zerarFormulario() {
    form.reset();
    sonoOut.textContent = `${sono.value}h`;
    aguaOut.textContent = agua.value;
    refeicoesOut.textContent = refeicoes.value;
    telaOut.textContent = `${tela.value}h`;
    estresseOut.textContent = ESTRESSE_LABELS[estresse.value] || "Moderado";
    goToStep(1, true);
  }

  // apaga respostas antigas que versões anteriores do site guardavam no navegador
  try {
    window.localStorage.removeItem("nutrivida-respostas");
  } catch (err) {
    /* localStorage indisponível — sem problema */
  }

  zerarFormulario();

  // voltar/avançar no navegador pode restaurar a página com as respostas antigas
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      document.getElementById("resultados").hidden = true;
      zerarFormulario();
    }
  });

  /* =====================================================
     Submission & calculations
  ===================================================== */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateStep(TOTAL_STEPS)) return;

    const data = new FormData(form);
    const perfil = {
      altura: Number(data.get("altura")),
      peso: Number(data.get("peso")),
      idade: Number(data.get("idade")),
      sexo: data.get("sexo"),
      fatorAtividade: Number(data.get("atividade")),
      horasSono: Number(data.get("sono")),
      coposAgua: Number(data.get("agua")),
      refeicoesPorDia: Number(data.get("refeicoes")),
      horasTela: Number(data.get("tela")),
      frutas: data.get("frutas"),
      ultraprocessados: data.get("ultraprocessados"),
      estresse: Number(data.get("estresse")),
      objetivo: data.get("objetivo"),
      restricoes: data.getAll("restricao"),
    };

    const resultado = calcularPerfil(perfil);
    mostrarResultados(resultado);
  });

  function calcularPerfil(p) {
    const alturaM = p.altura / 100;
    const imc = p.peso / (alturaM * alturaM);

    let classeIMC;
    if (imc < 18.5) classeIMC = "Abaixo do peso";
    else if (imc < 25) classeIMC = "Peso adequado";
    else if (imc < 30) classeIMC = "Sobrepeso";
    else if (imc < 35) classeIMC = "Obesidade grau I";
    else classeIMC = "Obesidade grau II ou mais";

    // Mifflin-St Jeor
    const bmr = p.sexo === "masculino"
      ? 10 * p.peso + 6.25 * p.altura - 5 * p.idade + 5
      : 10 * p.peso + 6.25 * p.altura - 5 * p.idade - 161;

    let tdee = bmr * p.fatorAtividade;
    if (p.objetivo === "perder") tdee *= 0.85;
    if (p.objetivo === "ganhar") tdee *= 1.12;
    tdee = Math.round(tdee / 10) * 10;

    // Macronutrients
    const macroPercentuais = {
      perder: { proteina: 0.3, carbo: 0.4, gordura: 0.3 },
      manter: { proteina: 0.2, carbo: 0.5, gordura: 0.3 },
      ganhar: { proteina: 0.25, carbo: 0.5, gordura: 0.25 },
    }[p.objetivo] || { proteina: 0.25, carbo: 0.45, gordura: 0.3 };

    const macros = {
      proteina: Math.round((tdee * macroPercentuais.proteina) / 4),
      carbo: Math.round((tdee * macroPercentuais.carbo) / 4),
      gordura: Math.round((tdee * macroPercentuais.gordura) / 9),
      percentuais: macroPercentuais,
    };

    const aguaLitrosRecomendado = Math.round(((p.peso * 35) / 1000) * 10) / 10;
    const aguaLitrosAtual = Math.round(((p.coposAgua * 200) / 1000) * 10) / 10;

    const habitos = calcularHabitos(p, aguaLitrosAtual, aguaLitrosRecomendado);
    const dicas = gerarDicas(p, { imc, classeIMC }, aguaLitrosAtual, aguaLitrosRecomendado);

    return {
      imc: Math.round(imc * 10) / 10,
      classeIMC,
      bmr: Math.round(bmr),
      calorias: tdee,
      macros,
      aguaLitrosRecomendado,
      aguaLitrosAtual,
      objetivo: p.objetivo,
      habitos,
      dicas,
    };
  }

  function calcularHabitos(p, aguaAtual, aguaRecomendada) {
    const sonoScore = Math.max(0, Math.min(100, 100 - Math.abs(p.horasSono - 9) * 15));
    const aguaScore = Math.max(0, Math.min(100, (aguaAtual / aguaRecomendada) * 100));
    const atividadeScore = { 1.2: 25, 1.375: 50, 1.55: 75, 1.725: 100 }[p.fatorAtividade] || 50;
    const frutasScore = { raro: 20, asvezes: 60, diario: 100 }[p.frutas] || 50;
    const ultraScore = { raro: 100, asvezes: 55, diario: 20 }[p.ultraprocessados] || 50;

    return [
      { label: "Sono", score: Math.round(sonoScore) },
      { label: "Hidratação", score: Math.round(aguaScore) },
      { label: "Atividade física", score: Math.round(atividadeScore) },
      { label: "Frutas e vegetais", score: Math.round(frutasScore) },
      { label: "Longe de ultraprocessados", score: Math.round(ultraScore) },
    ];
  }

  function gerarDicas(p, imcInfo, aguaAtual, aguaRecomendada) {
    const dicas = { alimentacao: [], atividade: [], sono: [], hidratacao: [] };

    // Alimentação
    if (imcInfo.classeIMC === "Abaixo do peso") {
      dicas.alimentacao.push("Aumente a frequência das refeições e inclua fontes calóricas saudáveis, como castanhas, abacate e azeite.");
    } else if (imcInfo.classeIMC === "Sobrepeso" || imcInfo.classeIMC.startsWith("Obesidade")) {
      dicas.alimentacao.push("Priorize vegetais, proteínas magras e grãos integrais, reduzindo ultraprocessados e açúcar adicionado.");
    } else {
      dicas.alimentacao.push("Seu IMC está na faixa considerada adequada — mantenha uma alimentação variada e colorida.");
    }

    if (p.objetivo === "perder") {
      dicas.alimentacao.push("Para o déficit calórico ser sustentável, prefira reduzir porções gradualmente em vez de cortar refeições inteiras.");
    } else if (p.objetivo === "ganhar") {
      dicas.alimentacao.push("Combine o superávit calórico com treino de força para que o ganho de peso venha principalmente de massa muscular.");
    } else {
      dicas.alimentacao.push("Para manter o peso, ajuste as porções conforme o quanto você se movimenta em cada dia.");
    }

    if (p.frutas === "raro") {
      dicas.alimentacao.push("Tente incluir ao menos uma fruta ou vegetal em duas refeições do dia — comece pequeno e vá aumentando.");
    }
    if (p.ultraprocessados === "diario") {
      dicas.alimentacao.push("Ultraprocessados diários pesam bastante na alimentação. Troque um lanche processado por uma opção natural, como frutas ou castanhas.");
    }
    if (p.refeicoesPorDia <= 2) {
      dicas.alimentacao.push("Poucas refeições ao longo do dia podem levar a exageros nos horários seguintes. Considere distribuir a comida em mais momentos.");
    }

    if (p.restricoes.includes("vegetariano")) {
      dicas.alimentacao.push("Combine leguminosas (feijão, lentilha, grão-de-bico) com cereais para garantir todos os aminoácidos essenciais.");
    }
    if (p.restricoes.includes("lactose")) {
      dicas.alimentacao.push("Substitua o leite por versões vegetais fortificadas com cálcio, como as de soja ou amêndoas.");
    }
    if (p.restricoes.includes("gluten")) {
      dicas.alimentacao.push("Arroz, quinoa, milho e mandioca são boas bases livres de glúten para compor suas refeições.");
    }

    // Atividade física
    if (p.fatorAtividade <= 1.2) {
      dicas.atividade.push("Sua rotina está bem sedentária. Pequenas caminhadas diárias já ajudam bastante no gasto calórico e na disposição.");
    } else if (p.fatorAtividade >= 1.55) {
      dicas.atividade.push("Com esse nível de atividade, capriche na reposição de proteínas e carboidratos ao longo do dia.");
    } else {
      dicas.atividade.push("Você já se movimenta com regularidade — manter a constância importa mais do que aumentar a intensidade de uma vez.");
    }

    if (p.horasTela >= 8) {
      dicas.atividade.push("Muitas horas de tela por lazer costumam reduzir o tempo de movimento. Que tal pausas ativas a cada hora?");
    }

    // Sono e bem-estar
    if (p.horasSono < 6) {
      dicas.sono.push("Menos de 6h de sono por noite pode aumentar a fome e a vontade de comer doces — tente ajustar o horário de dormir aos poucos.");
    } else if (p.horasSono > 10) {
      dicas.sono.push("Seu sono está bem acima da média — vale conferir se a qualidade do descanso está adequada.");
    } else {
      dicas.sono.push("Sua quantidade de sono está dentro da faixa geralmente recomendada para a sua idade.");
    }

    if (p.estresse >= 4) {
      dicas.sono.push("Seu nível de estresse está alto. Pausas curtas, respiração consciente ou conversar com alguém de confiança podem ajudar bastante.");
    } else if (p.estresse <= 2) {
      dicas.sono.push("Seu nível de estresse está baixo — ótimo sinal para manter o equilíbrio da rotina.");
    }

    // Hidratação
    if (aguaAtual < aguaRecomendada - 0.3) {
      dicas.hidratacao.push(`Você está bebendo cerca de ${aguaAtual.toFixed(1)}L de água por dia, abaixo dos ${aguaRecomendada}L recomendados para o seu peso. Tente ter uma garrafa sempre por perto.`);
    } else {
      dicas.hidratacao.push("Sua hidratação está em um bom nível — continue assim.");
    }

    Object.keys(dicas).forEach((key) => {
      if (dicas[key].length === 0) {
        dicas[key].push("Sem observações específicas nesta área — continue com bons hábitos.");
      }
    });

    return dicas;
  }

  /* =====================================================
     Render results
  ===================================================== */
  function corPorIMC(imc) {
    if (imc < 18.5 || imc >= 30) return "#C1502E";
    if (imc >= 25) return "#E0A63A";
    return "#52B788";
  }

  function animateNumber(el, target) {
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const CATEGORY_LABELS = {
    alimentacao: "Alimentação",
    atividade: "Atividade física",
    sono: "Sono e bem-estar",
    hidratacao: "Hidratação",
  };

  function renderAccordion(dicas) {
    const container = document.getElementById("tips-accordion");
    container.innerHTML = "";

    Object.keys(CATEGORY_LABELS).forEach((key, index) => {
      const item = document.createElement("div");
      item.className = "accordion-item" + (index === 0 ? " is-open" : "");

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "accordion-trigger";
      trigger.setAttribute("aria-expanded", index === 0 ? "true" : "false");
      trigger.innerHTML = `<span>${CATEGORY_LABELS[key]}</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

      const panel = document.createElement("div");
      panel.className = "accordion-panel";
      const inner = document.createElement("div");
      inner.className = "accordion-panel-inner";
      (dicas[key] || []).forEach((texto) => {
        const p = document.createElement("p");
        p.textContent = texto;
        inner.appendChild(p);
      });
      panel.appendChild(inner);

      trigger.addEventListener("click", () => {
        const isOpen = item.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", String(isOpen));
      });

      item.appendChild(trigger);
      item.appendChild(panel);
      container.appendChild(item);
    });
  }

  function renderHabitBars(habitos) {
    const container = document.getElementById("habit-bars");
    container.innerHTML = "";
    habitos.forEach((h) => {
      const row = document.createElement("div");
      row.className = "habit-bar-row";

      const label = document.createElement("div");
      label.className = "habit-bar-label";
      label.innerHTML = `<span>${h.label}</span><strong>${h.score}/100</strong>`;

      const track = document.createElement("div");
      track.className = "habit-bar-track";
      const fill = document.createElement("div");
      fill.className = "habit-bar-fill";
      if (h.score < 40) fill.classList.add("is-warn");
      else if (h.score < 70) fill.classList.add("is-low");
      track.appendChild(fill);

      row.appendChild(label);
      row.appendChild(track);
      container.appendChild(row);

      requestAnimationFrame(() => {
        fill.style.width = `${h.score}%`;
      });
    });
  }

  function mostrarResultados(r) {
    resultadoAtual = r;
    const section = document.getElementById("resultados");
    section.hidden = false;

    document.getElementById("results-greeting").textContent = "Aqui estão as suas orientações";

    // IMC gauge: scale roughly 15 (min) to 40 (max) across 180°
    const imcClamped = Math.min(Math.max(r.imc, 15), 40);
    const imcPercent = (imcClamped - 15) / (40 - 15);
    const arc = document.getElementById("imc-arc");
    const arcLength = 283;
    arc.style.strokeDashoffset = String(arcLength - arcLength * imcPercent);
    arc.style.stroke = corPorIMC(r.imc);

    const needle = document.getElementById("imc-needle");
    const angle = imcPercent * 180 - 90;
    requestAnimationFrame(() => {
      needle.setAttribute("transform", `rotate(${angle} 110 110)`);
    });

    document.getElementById("imc-value").textContent = r.imc.toFixed(1);
    document.getElementById("imc-classe").textContent = r.classeIMC;

    // Calorie ring: scale against a practical range 1200-3500 kcal
    const calClamped = Math.min(Math.max(r.calorias, 1200), 3500);
    const calPercent = (calClamped - 1200) / (3500 - 1200);
    const calCircle = document.getElementById("cal-circle");
    const calLength = 414.7;
    calCircle.style.strokeDashoffset = String(calLength - calLength * calPercent);

    animateNumber(document.getElementById("cal-value"), r.calorias);

    const objetivoTexto = { perder: "para perder peso", manter: "para manter o peso", ganhar: "para ganhar massa" };
    document.getElementById("cal-classe").textContent = `estimativa diária ${objetivoTexto[r.objetivo] || ""}`;

    // Water glass
    const waterPercent = Math.min(r.aguaLitrosRecomendado / 4, 1);
    const glassTop = 12, glassBottom = 148;
    const fillHeight = (glassBottom - glassTop) * waterPercent;
    const fill = document.getElementById("water-fill");
    requestAnimationFrame(() => {
      fill.setAttribute("y", String(glassBottom - fillHeight));
      fill.setAttribute("height", String(fillHeight));
    });
    document.getElementById("water-value").textContent = r.aguaLitrosRecomendado.toFixed(1);

    // Macro donut
    const C = 2 * Math.PI * 50;
    const kcalProtein = r.macros.proteina * 4;
    const kcalCarbo = r.macros.carbo * 4;
    const kcalGordura = r.macros.gordura * 9;
    const totalKcal = kcalProtein + kcalCarbo + kcalGordura || 1;

    const proteinLen = C * (kcalProtein / totalKcal);
    const carbLen = C * (kcalCarbo / totalKcal);
    const fatLen = C * (kcalGordura / totalKcal);

    const proteinCircle = document.getElementById("macro-protein");
    const carbCircle = document.getElementById("macro-carbs");
    const fatCircle = document.getElementById("macro-fat");

    proteinCircle.setAttribute("stroke-dasharray", `${proteinLen} ${C - proteinLen}`);
    proteinCircle.setAttribute("stroke-dashoffset", "0");

    carbCircle.setAttribute("stroke-dasharray", `${carbLen} ${C - carbLen}`);
    carbCircle.setAttribute("stroke-dashoffset", String(-proteinLen));

    fatCircle.setAttribute("stroke-dasharray", `${fatLen} ${C - fatLen}`);
    fatCircle.setAttribute("stroke-dashoffset", String(-(proteinLen + carbLen)));

    document.getElementById("macro-protein-value").textContent = r.macros.proteina;
    document.getElementById("macro-carbs-value").textContent = r.macros.carbo;
    document.getElementById("macro-fat-value").textContent = r.macros.gordura;

    // Habit bars
    renderHabitBars(r.habitos);

    // Tips accordion
    renderAccordion(r.dicas);

    // QR Code com resultados + sugestões
    renderQR();

    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* =====================================================
     QR Code dos resultados (gerado automaticamente)
  ===================================================== */
  function renderQR() {
    const feedback = document.getElementById("copy-feedback");
    const box = document.getElementById("qr-code-box");
    const textoEl = document.getElementById("qr-panel-texto");
    const retryBtn = document.getElementById("qr-retry-btn");

    if (!resultadoAtual) return;
    feedback.textContent = "";
    retryBtn.hidden = true;

    if (typeof QRCode === "undefined") {
      box.innerHTML = "";
      feedback.textContent = "Não foi possível carregar o gerador de QR Code. Conecte-se à internet e tente de novo.";
      retryBtn.hidden = false;
      return;
    }

    let resumo = escolherResumoQR(resultadoAtual);

    function gerarQR(texto) {
      box.innerHTML = "";
      new QRCode(box, {
        text: texto,
        width: texto.length > 500 ? 300 : 240,
        height: texto.length > 500 ? 300 : 240,
        colorDark: "#1B4332",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.L,
      });
    }

    try {
      gerarQR(resumo);
    } catch (err) {
      // texto grande demais para o QR: cai para o resumo só com os números
      resumo = montarResumoTexto(resultadoAtual, 0);
      gerarQR(resumo);
    }

    textoEl.textContent = resumo;
  }

  document.getElementById("qr-retry-btn").addEventListener("click", renderQR);

  document.getElementById("restart-btn").addEventListener("click", () => {
    document.getElementById("resultados").hidden = true;
    goToStep(1);
    document.getElementById("avaliacao").scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();