
const SUPABASE_URL = "https://nyivyswdqpyonjqajtcp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PWV3rGoeT_qh6k9FwfLH-g__MvOlLE1";

const cliente = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const $ = (seletor) => document.querySelector(seletor);

let usuarioAtual = null;
let tarefas = [];
let dataSelecionada = chaveData(new Date());
let mesVisivel = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let modalTarefa = null;
let carregando = false;
let operacaoEmAndamento = false;
let versaoCarregamento = 0;
let sessaoInicializada = false;

const CORES = {
    padrao: "#3b82f6",
    chave: "studyplan_cor_v1"
};

function chaveData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function dataLocal(chave) {
    const [ano, mes, dia] = chave.split("-").map(Number);

    return new Date(ano, mes - 1, dia);
}

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function formatarData(chave, opcoes = {}) {
    return dataLocal(chave).toLocaleDateString("pt-BR", opcoes);
}

function mostrarMensagem(elemento, mensagem, tipo = "info") {
    elemento.textContent = mensagem;
    elemento.className = `alert alert-${tipo}`;
    elemento.classList.remove("d-none");
}

function ocultarMensagem(elemento) {
    elemento.textContent = "";
    elemento.classList.add("d-none");
}

function erroLegivel(erro) {
    const mensagem = erro?.message || "Ocorreu um erro inesperado.";

    if (/invalid login credentials/i.test(mensagem)) {
        return "E-mail ou senha incorretos.";
    }

    if (/email not confirmed/i.test(mensagem)) {
        return "Confirme seu e-mail antes de entrar.";
    }

    if (/user already registered/i.test(mensagem)) {
        return "Este e-mail já possui uma conta. Tente entrar.";
    }

    if (/password should be at least/i.test(mensagem)) {
        return "A senha não atende aos requisitos mínimos.";
    }

    if (/failed to fetch|networkerror/i.test(mensagem)) {
        return "Não foi possível conectar. Verifique a internet e a configuração do Supabase.";
    }

    if (/row-level security|violates row-level security/i.test(mensagem)) {
        return "O acesso foi bloqueado pelas políticas de segurança do banco. Confira as políticas RLS.";
    }

    return mensagem;
}

function definirCarregamento(botao, ativo, textoNormal) {
    botao.disabled = ativo;
    botao.textContent = ativo ? "Aguarde..." : textoNormal;
}

function mostrarTelaAcesso() {
    $("#tela-acesso").classList.remove("d-none");
    $("#aplicacao").classList.add("d-none");
}

function mostrarAplicacao(usuario) {
    usuarioAtual = usuario;

    $("#tela-acesso").classList.add("d-none");
    $("#aplicacao").classList.remove("d-none");

    const nome = usuario.user_metadata?.nome
        || usuario.user_metadata?.name
        || usuario.email?.split("@")[0]
        || "Estudante";

    $("#usuario-nome").textContent = nome;
    $("#usuario-email").textContent = usuario.email || "";

    $("#data-hoje").textContent = new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    aplicarCor(localStorage.getItem(CORES.chave) || CORES.padrao);
}

function alternarFormulario(tipo) {
    const login = tipo === "login";

    $("#form-login").classList.toggle("d-none", !login);
    $("#form-cadastro").classList.toggle("d-none", login);

    $("#mostrar-login").classList.toggle("ativo", login);
    $("#mostrar-cadastro").classList.toggle("ativo", !login);

    ocultarMensagem($("#mensagem-acesso"));
}

$("#mostrar-login").addEventListener("click", () => {
    alternarFormulario("login");
});

$("#mostrar-cadastro").addEventListener("click", () => {
    alternarFormulario("cadastro");
});

$("#form-login").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (operacaoEmAndamento) return;

    const botao = $("#botao-login");

    operacaoEmAndamento = true;
    definirCarregamento(botao, true, "Entrar");
    ocultarMensagem($("#mensagem-acesso"));

    try {
        const email = $("#login-email").value.trim();
        const senha = $("#login-senha").value;

        const { error } = await cliente.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) throw error;
    } catch (erro) {
        mostrarMensagem(
            $("#mensagem-acesso"),
            erroLegivel(erro),
            "danger"
        );
    } finally {
        operacaoEmAndamento = false;
        definirCarregamento(botao, false, "Entrar");
    }
});

$("#form-cadastro").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (operacaoEmAndamento) return;

    const nome = $("#cadastro-nome").value.trim();
    const email = $("#cadastro-email").value.trim();
    const senha = $("#cadastro-senha").value;
    const confirmacao = $("#cadastro-confirmacao").value;

    if (!nome) {
        mostrarMensagem(
            $("#mensagem-acesso"),
            "Informe seu nome.",
            "danger"
        );
        return;
    }

    if (senha !== confirmacao) {
        mostrarMensagem(
            $("#mensagem-acesso"),
            "As senhas não são iguais.",
            "danger"
        );
        return;
    }

    if (senha.length < 6) {
        mostrarMensagem(
            $("#mensagem-acesso"),
            "A senha deve ter pelo menos 6 caracteres.",
            "danger"
        );
        return;
    }

    const botao = $("#botao-cadastro");

    operacaoEmAndamento = true;
    definirCarregamento(botao, true, "Criar minha conta");
    ocultarMensagem($("#mensagem-acesso"));

    try {
        const { data, error } = await cliente.auth.signUp({
            email,
            password: senha,
            options: {
                data: {
                    nome
                }
            }
        });

        if (error) throw error;

        $("#form-cadastro").reset();

        if (data.session) {
            mostrarMensagem(
                $("#mensagem-acesso"),
                "Conta criada com sucesso! Você já pode usar o StudyPlan.",
                "success"
            );
        } else {
            mostrarMensagem(
                $("#mensagem-acesso"),
                "Cadastro realizado! Verifique seu e-mail para confirmar a conta. Depois, entre no StudyPlan.",
                "success"
            );
        }
    } catch (erro) {
        mostrarMensagem(
            $("#mensagem-acesso"),
            erroLegivel(erro),
            "danger"
        );
    } finally {
        operacaoEmAndamento = false;
        definirCarregamento(botao, false, "Criar minha conta");
    }
});

$("#botao-sair").addEventListener("click", async () => {
    const botao = $("#botao-sair");

    botao.disabled = true;

    try {
        const { error } = await cliente.auth.signOut();

        if (error) throw error;
    } catch (erro) {
        mostrarMensagem(
            $("#mensagem-app"),
            "Não foi possível sair da conta: " + erroLegivel(erro),
            "danger"
        );
    } finally {
        botao.disabled = false;
    }
});

function aplicarCor(cor) {
    if (!/^#[0-9a-f]{6}$/i.test(cor)) {
        cor = CORES.padrao;
    }

    document.documentElement.style.setProperty(
        "--cor-principal",
        cor
    );

    const r = parseInt(cor.slice(1, 3), 16);
    const g = parseInt(cor.slice(3, 5), 16);
    const b = parseInt(cor.slice(5, 7), 16);

    document.documentElement.style.setProperty(
        "--cor-clara",
        `rgba(${r}, ${g}, ${b}, 0.15)`
    );

    $("#cor-tema").value = cor;
    localStorage.setItem(CORES.chave, cor);
}

$("#cor-tema").addEventListener("input", (evento) => {
    aplicarCor(evento.target.value);
});

async function carregarTarefas() {
    if (!usuarioAtual) return;

    const usuarioId = usuarioAtual.id;
    const versao = ++versaoCarregamento;

    carregando = true;
    renderizarTarefas();

    try {
        const { data, error } = await cliente
            .from("tarefas")
            .select("*")
            .eq("user_id", usuarioId)
            .order("data_estudo", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (
            versao !== versaoCarregamento ||
            !usuarioAtual ||
            usuarioAtual.id !== usuarioId
        ) {
            return;
        }

        tarefas = data || [];

        desenharCalendario();
        renderizarTarefas();
        atualizarSequencia();

        ocultarMensagem($("#mensagem-app"));
    } catch (erro) {
        if (versao === versaoCarregamento) {
            mostrarMensagem(
                $("#mensagem-app"),
                "Erro ao carregar atividades: " + erroLegivel(erro),
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

    grade.replaceChildren();

    $("#mes-ano").textContent = mesVisivel.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    const primeiroDia = new Date(
        mesVisivel.getFullYear(),
        mesVisivel.getMonth(),
        1
    );

    const deslocamento = (primeiroDia.getDay() + 6) % 7;

    const inicio = new Date(
        primeiroDia.getFullYear(),
        primeiroDia.getMonth(),
        1 - deslocamento
    );

    const hoje = chaveData(new Date());

    for (let i = 0; i < 42; i++) {
        const data = new Date(inicio);
        data.setDate(inicio.getDate() + i);

        const chave = chaveData(data);
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "dia";
        botao.textContent = data.getDate();

        botao.setAttribute(
            "aria-label",
            formatarData(chave, {
                day: "numeric",
                month: "long",
                year: "numeric"
            })
        );

        if (data.getMonth() !== mesVisivel.getMonth()) {
            botao.classList.add("outro-mes");
        }

        if (chave === hoje) {
            botao.classList.add("hoje");
        }

        if (chave === dataSelecionada) {
            botao.classList.add("selecionado");
        }

        if (tarefas.some(tarefa => tarefa.data_estudo === chave)) {
            botao.classList.add("tem-tarefa");
        }

        botao.addEventListener("click", () => {
            dataSelecionada = chave;

            mesVisivel = new Date(
                data.getFullYear(),
                data.getMonth(),
                1
            );

            desenharCalendario();
            renderizarTarefas();
        });

        grade.appendChild(botao);
    }
}

$("#mes-anterior").addEventListener("click", () => {
    mesVisivel = new Date(
        mesVisivel.getFullYear(),
        mesVisivel.getMonth() - 1,
        1
    );

    desenharCalendario();
});

$("#mes-seguinte").addEventListener("click", () => {
    mesVisivel = new Date(
        mesVisivel.getFullYear(),
        mesVisivel.getMonth() + 1,
        1
    );

    desenharCalendario();
});

function tarefasDoDia() {
    return tarefas
        .filter(tarefa => tarefa.data_estudo === dataSelecionada)
        .sort((a, b) =>
            String(a.created_at || "").localeCompare(
                String(b.created_at || "")
            )
        );
}

function atualizarResumo() {
    const doDia = tarefasDoDia();

    const concluidas = doDia.filter(
        tarefa => tarefa.concluida
    ).length;

    const minutos = doDia.reduce(
        (soma, tarefa) => soma + Number(tarefa.minutos || 0),
        0
    );

    const progresso = doDia.length
        ? Math.round((concluidas / doDia.length) * 100)
        : 0;

    $("#total-tarefas").textContent = doDia.length;
    $("#tarefas-concluidas").textContent = concluidas;

    if (minutos >= 60) {
        const horas = Math.floor(minutos / 60);
        const resto = minutos % 60;

        $("#tempo-planejado").textContent = resto
            ? `${horas} h ${resto} min`
            : `${horas} h`;
    } else {
        $("#tempo-planejado").textContent = `${minutos} min`;
    }

    $("#texto-progresso").textContent = `${progresso}%`;
    $("#barra-progresso").style.width = `${progresso}%`;
    $("#barra-progresso").setAttribute("aria-valuenow", progresso);
    $("#barra-progresso").setAttribute("aria-valuemin", "0");
    $("#barra-progresso").setAttribute("aria-valuemax", "100");

    $("#data-selecionada-texto").textContent = formatarData(
        dataSelecionada,
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}

function renderizarTarefas() {
    const lista = $("#lista-tarefas");

    lista.replaceChildren();

    if (carregando) {
        const texto = document.createElement("p");

        texto.className = "texto-secundario small";
        texto.textContent = "Carregando atividades...";

        lista.appendChild(texto);
        atualizarResumo();
        desenharCalendario();

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
        descricao.className = "texto-secundario small mb-3";
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

        if (tarefa.concluida) {
            item.classList.add("concluida");
        }

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "tarefa-check";
        checkbox.checked = tarefa.concluida;
        checkbox.setAttribute(
            "aria-label",
            `Concluir ${tarefa.titulo}`
        );

        checkbox.addEventListener("change", () => {
            alterarConclusao(tarefa, checkbox.checked);
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
        editar.addEventListener("click", () => {
            abrirEdicaoTarefa(tarefa);
        });

        const excluir = document.createElement("button");

        excluir.type = "button";
        excluir.className = "btn btn-outline-danger";
        excluir.textContent = "Excluir";
        excluir.addEventListener("click", () => {
            excluirTarefa(tarefa);
        });

        acoes.append(editar, excluir);
        item.append(checkbox, conteudo, acoes);
        lista.appendChild(item);
    });

    atualizarResumo();
    desenharCalendario();
}

function atualizarSequencia() {
    const dias = new Map();

    tarefas.forEach(tarefa => {
        if (!dias.has(tarefa.data_estudo)) {
            dias.set(tarefa.data_estudo, []);
        }

        dias.get(tarefa.data_estudo).push(tarefa);
    });

    let sequencia = 0;
    const data = new Date();

    while (true) {
        const chave = chaveData(data);
        const doDia = dias.get(chave);

        if (
            !doDia ||
            doDia.length === 0 ||
            !doDia.every(tarefa => tarefa.concluida)
        ) {
            break;
        }

        sequencia++;
        data.setDate(data.getDate() - 1);
    }

    $("#numero-sequencia").textContent = sequencia;
}

function abrirNovaTarefa() {
    $("#form-tarefa").reset();

    $("#tarefa-id").value = "";
    $("#tarefa-titulo").value = "";
    $("#tarefa-descricao").value = "";
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

$("#botao-nova-tarefa").addEventListener("click", abrirNovaTarefa);

$("#form-tarefa").addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!usuarioAtual) return;

    const botao = $("#botao-salvar-tarefa");

    if (botao.disabled) return;

    const usuarioId = usuarioAtual.id;
    const id = $("#tarefa-id").value;
    const titulo = $("#tarefa-titulo").value.trim();
    const descricao = $("#tarefa-descricao").value.trim();
    const data = $("#tarefa-data").value;
    const minutos = Number($("#tarefa-minutos").value);

    if (!titulo || !data || !Number.isInteger(minutos) || minutos < 1 || minutos > 1440) {
        alert("Confira o título, a data e o tempo planejado.");
        return;
    }

    const textoNormal = id
        ? "Salvar alterações"
        : "Salvar atividade";

    definirCarregamento(botao, true, textoNormal);

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

        if (resultado.error) {
            throw resultado.error;
        }

        modalTarefa.hide();

        dataSelecionada = data;

        const dataEscolhida = dataLocal(data);

        mesVisivel = new Date(
            dataEscolhida.getFullYear(),
            dataEscolhida.getMonth(),
            1
        );

        ocultarMensagem($("#mensagem-app"));

        await carregarTarefas();
    } catch (erro) {
        mostrarMensagem(
            $("#mensagem-app"),
            "Não foi possível salvar a atividade: " + erroLegivel(erro),
            "danger"
        );
    } finally {
        definirCarregamento(
            botao,
            false,
            $("#tarefa-id").value ? "Salvar alterações" : "Salvar atividade"
        );
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

        if (error) {
            throw error;
        }

        if (!usuarioAtual || usuarioAtual.id !== usuarioId) {
            return;
        }

        tarefas = tarefas.map(item =>
            item.id === data.id ? data : item
        );

        renderizarTarefas();
        atualizarSequencia();
    } catch (erro) {
        mostrarMensagem(
            $("#mensagem-app"),
            "Não foi possível atualizar a atividade: " + erroLegivel(erro),
            "danger"
        );

        await carregarTarefas();
    }
}

async function excluirTarefa(tarefa) {
    if (!usuarioAtual) return;

    if (!confirm(`Deseja excluir a atividade "${tarefa.titulo}"?`)) {
        return;
    }

    const usuarioId = usuarioAtual.id;

    try {
        const { error } = await cliente
            .from("tarefas")
            .delete()
            .eq("id", tarefa.id)
            .eq("user_id", usuarioId);

        if (error) {
            throw error;
        }

        if (!usuarioAtual || usuarioAtual.id !== usuarioId) {
            return;
        }

        tarefas = tarefas.filter(item => item.id !== tarefa.id);

        renderizarTarefas();
        atualizarSequencia();

        ocultarMensagem($("#mensagem-app"));
    } catch (erro) {
        mostrarMensagem(
            $("#mensagem-app"),
            "Não foi possível excluir a atividade: " + erroLegivel(erro),
            "danger"
        );
    }
}

$("#botao-limpar-dia").addEventListener("click", async () => {
    if (!usuarioAtual) return;

    const doDia = tarefasDoDia();

    if (doDia.length === 0) {
        alert("Não há atividades para excluir neste dia.");
        return;
    }

    if (!confirm(
        `Deseja excluir todas as ${doDia.length} atividades de ${formatarData(dataSelecionada)}?`
    )) {
        return;
    }

    const usuarioId = usuarioAtual.id;
    const dataAlvo = dataSelecionada;

    try {
        const { error } = await cliente
            .from("tarefas")
            .delete()
            .eq("user_id", usuarioId)
            .eq("data_estudo", dataAlvo);

        if (error) {
            throw error;
        }

        if (!usuarioAtual || usuarioAtual.id !== usuarioId) {
            return;
        }

        tarefas = tarefas.filter(
            tarefa => tarefa.data_estudo !== dataAlvo
        );

        renderizarTarefas();
        atualizarSequencia();

        ocultarMensagem($("#mensagem-app"));
    } catch (erro) {
        mostrarMensagem(
            $("#mensagem-app"),
            "Não foi possível limpar o dia: " + erroLegivel(erro),
            "danger"
        );
    }
});

async function iniciarSessao(usuario) {
    const idAnterior = usuarioAtual?.id || null;
    const novoId = usuario?.id || null;

    sessaoInicializada = true;

    if (!usuario) {
        versaoCarregamento++;
        usuarioAtual = null;
        tarefas = [];
        carregando = false;

        mostrarTelaAcesso();

        $("#lista-tarefas").replaceChildren();
        $("#total-tarefas").textContent = "0";
        $("#tarefas-concluidas").textContent = "0";
        $("#tempo-planejado").textContent = "0 min";
        $("#texto-progresso").textContent = "0%";
        $("#barra-progresso").style.width = "0%";
        $("#numero-sequencia").textContent = "0";

        return;
    }

    if (idAnterior !== novoId) {
        tarefas = [];
        carregando = false;
        versaoCarregamento++;
    }

    mostrarAplicacao(usuario);

    await carregarTarefas();
}

document.addEventListener("DOMContentLoaded", async () => {
    modalTarefa = new bootstrap.Modal($("#modal-tarefa"));

    $("#data-hoje").textContent = new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    try {
        const { data, error } = await cliente.auth.getSession();

        if (error) {
            throw error;
        }

        await iniciarSessao(data.session?.user || null);
    } catch (erro) {
        mostrarTelaAcesso();

        mostrarMensagem(
            $("#mensagem-acesso"),
            "Não foi possível iniciar a conexão: " + erroLegivel(erro),
            "danger"
        );
    }

    cliente.auth.onAuthStateChange((evento, sessao) => {
        if (evento === "INITIAL_SESSION") return;
        if (evento === "TOKEN_REFRESHED") return;

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
