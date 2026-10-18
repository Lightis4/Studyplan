
const SUPABASE_URL = "https://nyivyswdqpyonjqajtcp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PWV3rGoeT_qh6k9FwfLH-g__MvOlLE1";
const URL_PUBLICA = "https://lightis4.github.io/Studyplan/";

const cliente = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const $ = (seletor) => document.querySelector(seletor);

let usuarioAtual = null;
let tarefas = [];
let dataSelecionada = dataChave(new Date());
let mesVisivel = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let modalTarefa;
let carregando = false;
let operacaoEmAndamento = false;
let versaoCarregamento = 0;

function dataChave(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function dataLocal(chave) {
    const [ano, mes, dia] = chave.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}

function formatarData(chave, opcoes = {}) {
    return dataLocal(chave).toLocaleDateString("pt-BR", opcoes);
}

function mensagem(elemento, texto, tipo = "info") {
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.className = `alert alert-${tipo}`;
    elemento.classList.remove("d-none");
}

function limparMensagem(elemento) {
    if (!elemento) return;
    elemento.textContent = "";
    elemento.classList.add("d-none");
}

function erroLegivel(erro) {
    const texto = erro?.message || "Ocorreu um erro inesperado.";

    if (/invalid login credentials/i.test(texto)) {
        return "E-mail ou senha incorretos.";
    }
    if (/email not confirmed/i.test(texto)) {
        return "Confirme seu e-mail antes de entrar.";
    }
    if (/user already registered/i.test(texto)) {
        return "Este e-mail já está cadastrado. Tente entrar.";
    }
    if (/password should be at least/i.test(texto)) {
        return "A senha não atende ao tamanho mínimo exigido.";
    }
    if (/failed to fetch|networkerror/i.test(texto)) {
        return "Não foi possível conectar. Verifique sua internet.";
    }
    if (/row-level security|violates row-level security/i.test(texto)) {
        return "A operação foi bloqueada pelas políticas de segurança do banco.";
    }

    return texto;
}

function mostrarAcesso() {
    $("#tela-acesso")?.classList.remove("d-none");
    $("#aplicacao")?.classList.add("d-none");
}

function mostrarAplicacao(usuario) {
    usuarioAtual = usuario;

    $("#tela-acesso")?.classList.add("d-none");
    $("#aplicacao")?.classList.remove("d-none");

    const nome =
        usuario.user_metadata?.nome ||
        usuario.user_metadata?.name ||
        usuario.email?.split("@")[0] ||
        "Estudante";

    if ($("#usuario-nome")) $("#usuario-nome").textContent = nome;
    if ($("#usuario-email")) $("#usuario-email").textContent = usuario.email || "";

    if ($("#data-hoje")) {
        $("#data-hoje").textContent = new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    aplicarCor(localStorage.getItem("studyplan_cor") || "#3b82f6");
}

function alternarFormulario(tipo) {
    const login = tipo === "login";

    $("#form-login")?.classList.toggle("d-none", !login);
    $("#form-cadastro")?.classList.toggle("d-none", login);
    $("#mostrar-login")?.classList.toggle("ativo", login);
    $("#mostrar-cadastro")?.classList.toggle("ativo", !login);

    limparMensagem($("#mensagem-acesso"));
}

$("#mostrar-login")?.addEventListener("click", () => alternarFormulario("login"));
$("#mostrar-cadastro")?.addEventListener("click", () => alternarFormulario("cadastro"));

$("#form-login")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (operacaoEmAndamento) return;

    const botao = $("#botao-login");
    const textoOriginal = botao.textContent;

    operacaoEmAndamento = true;
    botao.disabled = true;
    botao.textContent = "Entrando...";
    limparMensagem($("#mensagem-acesso"));

    try {
        const { error } = await cliente.auth.signInWithPassword({
            email: $("#login-email").value.trim(),
            password: $("#login-senha").value
        });

        if (error) throw error;
    } catch (erro) {
        mensagem($("#mensagem-acesso"), erroLegivel(erro), "danger");
    } finally {
        operacaoEmAndamento = false;
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
});

$("#form-cadastro")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (operacaoEmAndamento) return;

    const nome = $("#cadastro-nome").value.trim();
    const email = $("#cadastro-email").value.trim();
    const senha = $("#cadastro-senha").value;
    const confirmacao = $("#cadastro-confirmacao").value;

    if (!nome || !email) {
        mensagem($("#mensagem-acesso"), "Preencha seu nome e e-mail.", "danger");
        return;
    }

    if (senha.length < 6) {
        mensagem($("#mensagem-acesso"), "A senha deve ter pelo menos 6 caracteres.", "danger");
        return;
    }

    if (senha !== confirmacao) {
        mensagem($("#mensagem-acesso"), "As senhas não coincidem.", "danger");
        return;
    }

    const botao = $("#botao-cadastro");
    const textoOriginal = botao.textContent;

    operacaoEmAndamento = true;
    botao.disabled = true;
    botao.textContent = "Criando conta...";
    limparMensagem($("#mensagem-acesso"));

    try {
        const { data, error } = await cliente.auth.signUp({
            email,
            password: senha,
            options: {
                data: { nome },
                emailRedirectTo: URL_PUBLICA
            }
        });

        if (error) throw error;

        $("#form-cadastro").reset();

        if (data.session) {
            mensagem(
                $("#mensagem-acesso"),
                "Conta criada! Você já pode entrar no StudyPlan.",
                "success"
            );
        } else {
            mensagem(
                $("#mensagem-acesso"),
                "Cadastro realizado! Abra o e-mail no celular ou computador e toque no link de confirmação. Você será direcionado ao StudyPlan publicado.",
                "success"
            );
        }
    } catch (erro) {
        mensagem($("#mensagem-acesso"), erroLegivel(erro), "danger");
    } finally {
        operacaoEmAndamento = false;
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
});

$("#botao-sair")?.addEventListener("click", async () => {
    const botao = $("#botao-sair");
    botao.disabled = true;

    try {
        const { error } = await cliente.auth.signOut();
        if (error) throw error;
    } catch (erro) {
        mensagem($("#mensagem-app"), erroLegivel(erro), "danger");
    } finally {
        botao.disabled = false;
    }
});

function aplicarCor(cor) {
    if (!/^#[0-9a-f]{6}$/i.test(cor)) cor = "#3b82f6";

    document.documentElement.style.setProperty("--cor-principal", cor);

    const r = parseInt(cor.slice(1, 3), 16);
    const g = parseInt(cor.slice(3, 5), 16);
    const b = parseInt(cor.slice(5, 7), 16);

    document.documentElement.style.setProperty(
        "--cor-clara",
        `rgba(${r}, ${g}, ${b}, 0.15)`
    );

    if ($("#cor-tema")) $("#cor-tema").value = cor;
    localStorage.setItem("studyplan_cor", cor);
}

$("#cor-tema")?.addEventListener("input", (evento) => {
    aplicarCor(evento.target.value);
});

async function carregarTarefas() {
    if (!usuarioAtual) return;

    const idUsuario = usuarioAtual.id;
    const versao = ++versaoCarregamento;

    carregando = true;
    renderizarTarefas();

    try {
        const { data, error } = await cliente
            .from("tarefas")
            .select("*")
            .eq("user_id", idUsuario)
            .order("data_estudo", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (!usuarioAtual || usuarioAtual.id !== idUsuario ||
            versao !== versaoCarregamento) return;

        tarefas = data || [];
        desenharCalendario();
        renderizarTarefas();
        atualizarSequencia();
        limparMensagem($("#mensagem-app"));
    } catch (erro) {
        if (versao === versaoCarregamento) {
            mensagem(
                $("#mensagem-app"),
                "Erro ao carregar tarefas: " + erroLegivel(erro),
                "danger"
            );
        }
    } finally {
        if (versao === versaoCarregamento) {
            carregando = false;
            renderizarTarefas();
        }
    }
}

function desenharCalendario() {
    const grade = $("#grade-calendario");
    if (!grade) return;

    grade.replaceChildren();

    if ($("#mes-ano")) {
        $("#mes-ano").textContent = mesVisivel.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
        });
    }

    const primeiro = new Date(
        mesVisivel.getFullYear(),
        mesVisivel.getMonth(),
        1
    );

    const deslocamento = (primeiro.getDay() + 6) % 7;

    const inicio = new Date(
        primeiro.getFullYear(),
        primeiro.getMonth(),
        1 - deslocamento
    );

    const hoje = dataChave(new Date());

    for (let i = 0; i < 42; i++) {
        const data = new Date(inicio);
        data.setDate(inicio.getDate() + i);

        const chave = dataChave(data);
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "dia";
        botao.textContent = data.getDate();

        if (data.getMonth() !== mesVisivel.getMonth()) {
            botao.classList.add("outro-mes");
        }
        if (chave === hoje) botao.classList.add("hoje");
        if (chave === dataSelecionada) botao.classList.add("selecionado");

        if (tarefas.some(t => t.data_estudo === chave)) {
            botao.classList.add("tem-tarefa");
        }

        botao.addEventListener("click", () => {
            dataSelecionada = chave;
            mesVisivel = new Date(data.getFullYear(), data.getMonth(), 1);
            desenharCalendario();
            renderizarTarefas();
        });

        grade.appendChild(botao);
    }
}

$("#mes-anterior")?.addEventListener("click", () => {
    mesVisivel = new Date(
        mesVisivel.getFullYear(),
        mesVisivel.getMonth() - 1,
        1
    );
    desenharCalendario();
});

$("#mes-seguinte")?.addEventListener("click", () => {
    mesVisivel = new Date(
        mesVisivel.getFullYear(),
        mesVisivel.getMonth() + 1,
        1
    );
    desenharCalendario();
});

function tarefasDoDia() {
    return tarefas
        .filter(t => t.data_estudo === dataSelecionada)
        .sort((a, b) =>
            String(a.created_at || "").localeCompare(String(b.created_at || ""))
        );
}

function atualizarResumo() {
    const lista = tarefasDoDia();
    const concluidas = lista.filter(t => t.concluida).length;
    const minutos = lista.reduce((soma, t) => soma + Number(t.minutos || 0), 0);
    const progresso = lista.length
        ? Math.round(concluidas / lista.length * 100)
        : 0;

    if ($("#total-tarefas")) $("#total-tarefas").textContent = lista.length;
    if ($("#tarefas-concluidas")) $("#tarefas-concluidas").textContent = concluidas;

    if ($("#tempo-planejado")) {
        $("#tempo-planejado").textContent =
            minutos >= 60
                ? `${Math.floor(minutos / 60)} h ${minutos % 60 ? (minutos % 60) + " min" : ""}`.trim()
                : `${minutos} min`;
    }

    if ($("#texto-progresso")) $("#texto-progresso").textContent = `${progresso}%`;

    if ($("#barra-progresso")) {
        $("#barra-progresso").style.width = `${progresso}%`;
        $("#barra-progresso").setAttribute("aria-valuenow", progresso);
        $("#barra-progresso").setAttribute("aria-valuemin", "0");
        $("#barra-progresso").setAttribute("aria-valuemax", "100");
    }

    if ($("#data-selecionada-texto")) {
        $("#data-selecionada-texto").textContent = formatarData(dataSelecionada, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
}

function renderizarTarefas() {
    const lista = $("#lista-tarefas");
    if (!lista) return;

    lista.replaceChildren();

    if (carregando) {
        const texto = document.createElement("p");
        texto.className = "texto-secundario small";
        texto.textContent = "Carregando atividades...";
        lista.appendChild(texto);
        atualizarResumo();
        return;
    }

    const doDia = tarefasDoDia();

    if (doDia.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "estado-vazio text-center py-4";

        const titulo = document.createElement("h3");
        titulo.className = "h6 fw-bold";
        titulo.textContent = "Nenhuma atividade neste dia";

        const descricao = document.createElement("p");
        descricao.className = "texto-secundario small";
        descricao.textContent = "Adicione uma atividade para organizar seus estudos.";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn btn-primary btn-sm";
        botao.textContent = "Adicionar atividade";
        botao.addEventListener("click", abrirNovaTarefa);

        vazio.append(titulo, descricao, botao);
        lista.appendChild(vazio);
        atualizarResumo();
        desenharCalendario();
        return;
    }

    doDia.forEach(tarefa => {
        const item = document.createElement("article");
        item.className = "tarefa-item";
        if (tarefa.concluida) item.classList.add("concluida");

        const check = document.createElement("input");
        check.type = "checkbox";
        check.className = "tarefa-check";
        check.checked = tarefa.concluida;
        check.setAttribute("aria-label", `Concluir ${tarefa.titulo}`);
        check.addEventListener("change", () => {
            alterarConclusao(tarefa, check.checked);
        });

        const conteudo = document.createElement("div");
        conteudo.className = "tarefa-conteudo";

        const titulo = document.createElement("div");
        titulo.className = "tarefa-titulo";
        titulo.textContent = tarefa.titulo;
        conteudo.appendChild(titulo);

        if (tarefa.descricao) {
            const descricao = document.createElement("div");
            descricao.className = "tarefa-descricao";
            descricao.textContent = tarefa.descricao;
            conteudo.appendChild(descricao);
        }

        const meta = document.createElement("div");
        meta.className = "tarefa-meta";
        meta.textContent = `${tarefa.minutos} minutos`;
        conteudo.appendChild(meta);

        const acoes = document.createElement("div");
        acoes.className = "tarefa-acoes";

        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "btn btn-outline-secondary";
        editar.textContent = "Editar";
        editar.addEventListener("click", () => abrirEdicaoTarefa(tarefa));

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "btn btn-outline-danger";
        excluir.textContent = "Excluir";
        excluir.addEventListener("click", () => excluirTarefa(tarefa));

        acoes.append(editar, excluir);
        item.append(check, conteudo, acoes);
        lista.appendChild(item);
    });

    atualizarResumo();
    desenharCalendario();
}

function atualizarSequencia() {
    let sequencia = 0;
    const data = new Date();

    while (true) {
        const chave = dataChave(data);
        const doDia = tarefas.filter(t => t.data_estudo === chave);

        if (!doDia.length || !doDia.every(t => t.concluida)) break;

        sequencia++;
        data.setDate(data.getDate() - 1);
    }

    if ($("#numero-sequencia")) {
        $("#numero-sequencia").textContent = sequencia;
    }
}

function abrirNovaTarefa() {
    $("#form-tarefa").reset();
    $("#tarefa-id").value = "";
    $("#tarefa-data").value = dataSelecionada;
    $("#tarefa-minutos").value = 30;
    $("#modal-tarefa-titulo").textContent = "Nova atividade";
    $("#botao-salvar-tarefa").textContent = "Salvar atividade";
    modalTarefa.show();
}

function abrirEdicaoTarefa(tarefa) {
    $("#tarefa-id").value = tarefa.id;
    $("#tarefa-titulo").value = tarefa.titulo;
    $("#tarefa-descricao").value = tarefa.descricao || "";
    $("#tarefa-data").value = tarefa.data_estudo;
    $("#tarefa-minutos").value = tarefa.minutos;
    $("#modal-tarefa-titulo").textContent = "Editar atividade";
    $("#botao-salvar-tarefa").textContent = "Salvar alterações";
    modalTarefa.show();
}

$("#botao-nova-tarefa")?.addEventListener("click", abrirNovaTarefa);

$("#form-tarefa")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!usuarioAtual) return;

    const botao = $("#botao-salvar-tarefa");
    if (botao.disabled) return;

    const id = $("#tarefa-id").value;
    const usuarioId = usuarioAtual.id;
    const titulo = $("#tarefa-titulo").value.trim();
    const descricao = $("#tarefa-descricao").value.trim();
    const data = $("#tarefa-data").value;
    const minutos = Number($("#tarefa-minutos").value);

    if (!titulo || !data || !Number.isInteger(minutos) || minutos < 1 || minutos > 1440) {
        alert("Confira o título, a data e o tempo planejado.");
        return;
    }

    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        const registro = {
            titulo,
            descricao: descricao || null,
            data_estudo: data,
            minutos
        };

        let resultado;

        if (id) {
            resultado = await cliente
                .from("tarefas")
                .update(registro)
                .eq("id", Number(id))
                .eq("user_id", usuarioId)
                .select()
                .single();
        } else {
            resultado = await cliente
                .from("tarefas")
                .insert({
                    ...registro,
                    user_id: usuarioId,
                    concluida: false
                })
                .select()
                .single();
        }

        if (resultado.error) throw resultado.error;

        modalTarefa.hide();
        dataSelecionada = data;
        const escolhida = dataLocal(data);
        mesVisivel = new Date(escolhida.getFullYear(), escolhida.getMonth(), 1);

        await carregarTarefas();
        limparMensagem($("#mensagem-app"));
    } catch (erro) {
        mensagem($("#mensagem-app"), "Erro ao salvar: " + erroLegivel(erro), "danger");
    } finally {
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
});

async function alterarConclusao(tarefa, concluida) {
    if (!usuarioAtual) return;

    const usuarioId = usuarioAtual.id;

    try {
        const { data, error } = await cliente
            .from("tarefas")
            .update({ concluida })
            .eq("id", tarefa.id)
            .eq("user_id", usuarioId)
            .select()
            .single();

        if (error) throw error;
        if (!usuarioAtual || usuarioAtual.id !== usuarioId) return;

        tarefas = tarefas.map(t => t.id === data.id ? data : t);
        renderizarTarefas();
        atualizarSequencia();
    } catch (erro) {
        mensagem($("#mensagem-app"), erroLegivel(erro), "danger");
        await carregarTarefas();
    }
}

async function excluirTarefa(tarefa) {
    if (!usuarioAtual) return;
    if (!confirm(`Deseja excluir "${tarefa.titulo}"?`)) return;

    const usuarioId = usuarioAtual.id;

    try {
        const { error } = await cliente
            .from("tarefas")
            .delete()
            .eq("id", tarefa.id)
            .eq("user_id", usuarioId);

        if (error) throw error;
        if (!usuarioAtual || usuarioAtual.id !== usuarioId) return;

        tarefas = tarefas.filter(t => t.id !== tarefa.id);
        renderizarTarefas();
        atualizarSequencia();
        limparMensagem($("#mensagem-app"));
    } catch (erro) {
        mensagem($("#mensagem-app"), erroLegivel(erro), "danger");
    }
}

$("#botao-limpar-dia")?.addEventListener("click", async () => {
    if (!usuarioAtual) return;

    const doDia = tarefasDoDia();
    if (!doDia.length) {
        alert("Não há atividades para excluir neste dia.");
        return;
    }

    if (!confirm(`Excluir todas as ${doDia.length} atividades deste dia?`)) return;

    const usuarioId = usuarioAtual.id;
    const dataAlvo = dataSelecionada;

    try {
        const { error } = await cliente
            .from("tarefas")
            .delete()
            .eq("user_id", usuarioId)
            .eq("data_estudo", dataAlvo);

        if (error) throw error;
        if (!usuarioAtual || usuarioAtual.id !== usuarioId) return;

        tarefas = tarefas.filter(t => t.data_estudo !== dataAlvo);
        renderizarTarefas();
        atualizarSequencia();
    } catch (erro) {
        mensagem($("#mensagem-app"), erroLegivel(erro), "danger");
    }
});

async function iniciarSessao(usuario) {
    versaoCarregamento++;
    usuarioAtual = usuario;

    if (!usuario) {
        tarefas = [];
        carregando = false;
        mostrarAcesso();
        if ($("#lista-tarefas")) $("#lista-tarefas").replaceChildren();
        if ($("#total-tarefas")) $("#total-tarefas").textContent = "0";
        if ($("#tarefas-concluidas")) $("#tarefas-concluidas").textContent = "0";
        if ($("#tempo-planejado")) $("#tempo-planejado").textContent = "0 min";
        if ($("#texto-progresso")) $("#texto-progresso").textContent = "0%";
        if ($("#barra-progresso")) $("#barra-progresso").style.width = "0%";
        if ($("#numero-sequencia")) $("#numero-sequencia").textContent = "0";
        return;
    }

    mostrarAplicacao(usuario);
    await carregarTarefas();
}

document.addEventListener("DOMContentLoaded", async () => {
    if ($("#modal-tarefa") && window.bootstrap) {
        modalTarefa = new bootstrap.Modal($("#modal-tarefa"));
    }

    // Mostra erros que venham na URL após a confirmação.
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const erroAuth = fragmento.get("error_description") || fragmento.get("error");

    if (erroAuth) {
        mensagem(
            $("#mensagem-acesso"),
            "O link de autenticação retornou um erro: " +
                decodeURIComponent(erroAuth.replace(/\+/g, " ")),
            "danger"
        );
    } else if (
        window.location.hash.includes("access_token") ||
        window.location.search.includes("code=")
    ) {
        mensagem(
            $("#mensagem-acesso"),
            "Link processado. Se necessário, entre com seu e-mail e senha.",
            "success"
        );
    }

    try {
        const { data, error } = await cliente.auth.getSession();
        if (error) throw error;
        await iniciarSessao(data.session?.user || null);
    } catch (erro) {
        mostrarAcesso();
        mensagem(
            $("#mensagem-acesso"),
            "Não foi possível iniciar a sessão: " + erroLegivel(erro),
            "danger"
        );
    }

    // Evita chamar operações do Supabase diretamente dentro do callback.
    cliente.auth.onAuthStateChange((evento, sessao) => {
        if (evento === "INITIAL_SESSION" || evento === "TOKEN_REFRESHED") return;

        setTimeout(() => {
            if (evento === "SIGNED_OUT" || !sessao?.user) {
                iniciarSessao(null);
                return;
            }

            if (evento === "SIGNED_IN" || evento === "USER_UPDATED") {
                iniciarSessao(sessao.user);
            }
        }, 0);
    });
});
