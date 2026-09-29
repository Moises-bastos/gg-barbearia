import "./style.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../../lib/supabase";
import AppointmentCard from "../../../components/AppointmentCard";
import { sucesso, erro } from "../../../utils/toast";
import { enviarWhatsApp } from "../../../utils/whatsapp";
import NotificacaoAgendamento from "../../../components/notificação/NotificacaoAgendamento";

import { servicos } from "../../../data/servicos";
import { horarios } from "../../../data/horarios";

type Agendamento = {
  id: number;
  nome: string;
  telefone: string;
  servico: string;
  preco: number;
  horario: string;
  data: string;
  status: string;
  duracao: number | null;
};

type AgendamentoExistente = {
  horario: string;
  servico: string;
  duracao: number | null;
};

type DiaBloqueado = {
  hora_inicio: string | null;
  hora_fim: string | null;
};

function Dashboard() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split("T")[0],
  );

  // ============================================
  // ENCAIXE
  // ============================================

  const [mostrarEncaixe, setMostrarEncaixe] = useState(false);

  const [nomeEncaixe, setNomeEncaixe] = useState("");
  const [telefoneEncaixe, setTelefoneEncaixe] = useState("");
  const [servicoEncaixe, setServicoEncaixe] = useState("");
  const [horarioEncaixe, setHorarioEncaixe] = useState("");

  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);

  const [salvandoEncaixe, setSalvandoEncaixe] = useState(false);

  // ============================================
  // FATURAMENTO
  // ============================================

  const [agendamentosConcluidos, setAgendamentosConcluidos] = useState<
    Agendamento[]
  >([]);

  const navigate = useNavigate();

  // ============================================
  // BUSCA DOS AGENDAMENTOS
  // ============================================

  useEffect(() => {
    buscarAgendamentos();
    buscarFaturamento();
  }, [dataSelecionada]);

  // ============================================
  // ATUALIZA HORÁRIOS DO ENCAIXE
  // ============================================

  useEffect(() => {
    if (mostrarEncaixe && servicoEncaixe) {
      buscarHorariosDisponiveis();
    }
  }, [mostrarEncaixe, servicoEncaixe, dataSelecionada, agendamentos]);

  async function buscarAgendamentos() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("data", dataSelecionada)
      .order("horario");

    if (error) {
      console.log(error);

      erro("Erro ao buscar agendamentos.");

      return;
    }

    if (data) {
      setAgendamentos(data as Agendamento[]);
    }
  }

  // ============================================
  // BUSCAR FATURAMENTO
  // ============================================

  async function buscarFaturamento() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("status", "Concluído");

    if (error) {
      console.log(error);

      erro("Erro ao buscar faturamento.");

      return;
    }

    if (data) {
      setAgendamentosConcluidos(data as Agendamento[]);
    }
  }

  // ============================================
  // DATA
  // ============================================

  function mudarData(dias: number) {
    const data = new Date(`${dataSelecionada}T12:00:00`);

    data.setDate(data.getDate() + dias);

    const novaData = data.toISOString().split("T")[0];

    setDataSelecionada(novaData);
  }

  function voltarParaHoje() {
    setDataSelecionada(new Date().toISOString().split("T")[0]);
  }

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  // ============================================
  // HORÁRIOS
  // ============================================

  function horarioParaMinutos(horario: string) {
    const [hora, minuto] = horario.split(":").map(Number);

    return hora * 60 + minuto;
  }

  function obterDuracaoServico(nomeServico: string) {
    const servico = servicos.find((s) => s.nome === nomeServico);

    if (!servico) {
      return 30;
    }

    return Number(servico.duracao.replace("min", "").trim());
  }

  function intervaloConflita(
    inicio1: number,
    fim1: number,
    inicio2: number,
    fim2: number,
  ) {
    return inicio1 < fim2 && fim1 > inicio2;
  }

  // ============================================
  // HORÁRIOS DISPONÍVEIS PARA ENCAIXE
  // ============================================

  async function buscarHorariosDisponiveis() {
    const servico = servicos.find((s) => s.nome === servicoEncaixe);

    if (!servico) {
      setHorariosDisponiveis([]);

      return;
    }

    const duracao = Number(servico.duracao.replace("min", "").trim());

    // --------------------------------------------
    // AGENDAMENTOS
    // --------------------------------------------

    const { data: agendamentosDoDia, error } = await supabase
      .from("agendamentos")
      .select("horario, servico, duracao")
      .eq("data", dataSelecionada)
      .neq("status", "Cancelado");

    if (error) {
      console.log(error);

      erro("Erro ao verificar horários.");

      return;
    }

    // --------------------------------------------
    // BLOQUEIOS
    // --------------------------------------------

    const { data: bloqueios, error: erroBloqueios } = await supabase
      .from("dias_bloqueados")
      .select("hora_inicio, hora_fim")
      .eq("data", dataSelecionada);

    if (erroBloqueios) {
      console.log(erroBloqueios);

      erro("Erro ao verificar bloqueios.");

      return;
    }

    const agendamentosExistentes = (agendamentosDoDia ||
      []) as AgendamentoExistente[];

    const bloqueiosDoDia = (bloqueios || []) as DiaBloqueado[];

    // --------------------------------------------
    // DIA DA SEMANA
    // --------------------------------------------

    const dia = new Date(`${dataSelecionada}T12:00:00`);

    const diaDaSemana = dia.getDay();

    // Domingo fechado
    if (diaDaSemana === 0) {
      setHorariosDisponiveis([]);

      return;
    }

    // --------------------------------------------
    // DIA INTEIRO BLOQUEADO
    // --------------------------------------------

    const diaInteiroBloqueado = bloqueiosDoDia.some(
      (bloqueio) => !bloqueio.hora_inicio && !bloqueio.hora_fim,
    );

    if (diaInteiroBloqueado) {
      setHorariosDisponiveis([]);

      return;
    }

    // --------------------------------------------
    // HORÁRIO ATUAL
    // --------------------------------------------

    const agora = new Date();

    const hoje = dataSelecionada === agora.toISOString().split("T")[0];

    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

    // --------------------------------------------
    // FILTRO DOS HORÁRIOS
    // --------------------------------------------

    const disponiveis = horarios.filter((horario) => {
      const inicio = horarioParaMinutos(horario);

      const fim = inicio + duracao;

      // Não permite horários passados
      // quando for hoje
      if (hoje && inicio <= minutosAgora) {
        return false;
      }

      // Limite de funcionamento
      // 18:30
      if (fim > 18 * 60 + 30) {
        return false;
      }

      // ----------------------------------------
      // ALMOÇO
      // ----------------------------------------

      const inicioAlmoco = 12 * 60;

      const fimAlmoco = diaDaSemana === 6 ? 13 * 60 + 30 : 14 * 60;

      if (intervaloConflita(inicio, fim, inicioAlmoco, fimAlmoco)) {
        return false;
      }

      // ----------------------------------------
      // AGENDAMENTOS EXISTENTES
      // ----------------------------------------

      const conflitoAgendamento = agendamentosExistentes.some((agendamento) => {
        const inicioExistente = horarioParaMinutos(agendamento.horario);

        const duracaoExistente =
          agendamento.duracao ?? obterDuracaoServico(agendamento.servico);

        const fimExistente = inicioExistente + duracaoExistente;

        return intervaloConflita(inicio, fim, inicioExistente, fimExistente);
      });

      if (conflitoAgendamento) {
        return false;
      }

      // ----------------------------------------
      // BLOQUEIOS
      // ----------------------------------------

      const conflitoBloqueio = bloqueiosDoDia.some((bloqueio) => {
        if (!bloqueio.hora_inicio || !bloqueio.hora_fim) {
          return false;
        }

        const inicioBloqueio = horarioParaMinutos(bloqueio.hora_inicio);

        const fimBloqueio = horarioParaMinutos(bloqueio.hora_fim);

        return intervaloConflita(inicio, fim, inicioBloqueio, fimBloqueio);
      });

      if (conflitoBloqueio) {
        return false;
      }

      return true;
    });

    setHorariosDisponiveis(disponiveis);

    if (horarioEncaixe && !disponiveis.includes(horarioEncaixe)) {
      setHorarioEncaixe("");
    }
  }

  // ============================================
  // ABRIR ENCAIXE
  // ============================================

  function abrirEncaixe() {
    setNomeEncaixe("");
    setTelefoneEncaixe("");
    setServicoEncaixe("");
    setHorarioEncaixe("");
    setHorariosDisponiveis([]);

    setMostrarEncaixe(true);
  }

  // ============================================
  // FECHAR ENCAIXE
  // ============================================

  function fecharEncaixe() {
    setMostrarEncaixe(false);

    setNomeEncaixe("");
    setTelefoneEncaixe("");
    setServicoEncaixe("");
    setHorarioEncaixe("");
    setHorariosDisponiveis([]);
  }

  // ============================================
  // CRIAR ENCAIXE
  // ============================================

  async function criarEncaixe() {
    if (!nomeEncaixe.trim()) {
      erro("Digite o nome do cliente.");

      return;
    }

    if (!servicoEncaixe) {
      erro("Selecione um serviço.");

      return;
    }

    if (!horarioEncaixe) {
      erro("Selecione um horário.");

      return;
    }

    const servico = servicos.find((s) => s.nome === servicoEncaixe);

    if (!servico) {
      erro("Serviço inválido.");

      return;
    }

    setSalvandoEncaixe(true);

    try {
      const duracao = Number(servico.duracao.replace("min", "").trim());

      const preco = Number(
        servico.preco
          .replace("R$", "")
          .replace(".", "")
          .replace(",", ".")
          .trim(),
      );

      const telefoneLimpo = telefoneEncaixe.replace(/\D/g, "");

      // ----------------------------------------
      // VERIFICA AGENDAMENTOS NOVAMENTE
      // ----------------------------------------

      const { data: agendamentosDoDia, error } = await supabase
        .from("agendamentos")
        .select("horario, servico, duracao")
        .eq("data", dataSelecionada)
        .neq("status", "Cancelado");

      if (error) {
        erro("Erro ao verificar disponibilidade.");

        return;
      }

      const inicioNovo = horarioParaMinutos(horarioEncaixe);

      const fimNovo = inicioNovo + duracao;

      const conflito = (agendamentosDoDia || []).some(
        (agendamento: AgendamentoExistente) => {
          const inicioExistente = horarioParaMinutos(agendamento.horario);

          const duracaoExistente =
            agendamento.duracao ?? obterDuracaoServico(agendamento.servico);

          const fimExistente = inicioExistente + duracaoExistente;

          return intervaloConflita(
            inicioNovo,
            fimNovo,
            inicioExistente,
            fimExistente,
          );
        },
      );

      if (conflito) {
        erro("Esse horário acabou de ser ocupado.");

        await buscarHorariosDisponiveis();

        return;
      }

      // ----------------------------------------
      // VERIFICA BLOQUEIOS NOVAMENTE
      // ----------------------------------------

      const { data: bloqueios, error: erroBloqueios } = await supabase
        .from("dias_bloqueados")
        .select("hora_inicio, hora_fim")
        .eq("data", dataSelecionada);

      if (erroBloqueios) {
        erro("Erro ao verificar bloqueios.");

        return;
      }

      const bloqueioConflita = (bloqueios || []).some(
        (bloqueio: DiaBloqueado) => {
          if (!bloqueio.hora_inicio && !bloqueio.hora_fim) {
            return true;
          }

          if (!bloqueio.hora_inicio || !bloqueio.hora_fim) {
            return false;
          }

          const inicioBloqueio = horarioParaMinutos(bloqueio.hora_inicio);

          const fimBloqueio = horarioParaMinutos(bloqueio.hora_fim);

          return intervaloConflita(
            inicioNovo,
            fimNovo,
            inicioBloqueio,
            fimBloqueio,
          );
        },
      );

      if (bloqueioConflita) {
        erro("Esse horário está bloqueado.");

        await buscarHorariosDisponiveis();

        return;
      }

      // ----------------------------------------
      // INSERE ENCAIXE
      // ----------------------------------------

      const { error: erroInsercao } = await supabase
        .from("agendamentos")
        .insert({
          nome: nomeEncaixe.trim(),

          telefone: telefoneLimpo,

          servico: servico.nome,

          preco,

          horario: horarioEncaixe,

          data: dataSelecionada,

          duracao,

          status: "Pendente",
        });

      if (erroInsercao) {
        console.log(erroInsercao);

        erro("Erro ao criar encaixe.");

        return;
      }

      sucesso("Encaixe criado com sucesso!");

      fecharEncaixe();

      await buscarAgendamentos();
    } finally {
      setSalvandoEncaixe(false);
    }
  }

  // ============================================
  // CARDS DO DIA
  // ============================================

  const totalClientes = agendamentos.length;

  const pendentes = agendamentos.filter((a) => a.status === "Pendente").length;

  const concluidos = agendamentos.filter(
    (a) => a.status === "Concluído",
  ).length;

  // Receita do dia selecionado
  const receita = agendamentos
    .filter((a) => a.status === "Concluído")
    .reduce((total, a) => total + Number(a.preco), 0);

  // ============================================
  // FATURAMENTO POR PERÍODO
  // ============================================

  function criarDataLocal(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Date(ano, mes - 1, dia);
  }

  function inicioDaSemana(data: Date) {
    const resultado = new Date(data);

    const diaSemana = resultado.getDay();

    const diferenca = diaSemana === 0 ? -6 : 1 - diaSemana;

    resultado.setDate(resultado.getDate() + diferenca);

    resultado.setHours(0, 0, 0, 0);

    return resultado;
  }

  function fimDaSemana(data: Date) {
    const resultado = inicioDaSemana(data);

    resultado.setDate(resultado.getDate() + 6);

    resultado.setHours(23, 59, 59, 999);

    return resultado;
  }

  function inicioDoMes(data: Date) {
    return new Date(data.getFullYear(), data.getMonth(), 1);
  }

  function fimDoMes(data: Date) {
    return new Date(
      data.getFullYear(),
      data.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  function calcularFaturamento(inicio: Date, fim: Date) {
    return agendamentosConcluidos
      .filter((agendamento) => {
        const data = criarDataLocal(agendamento.data);

        return data >= inicio && data <= fim;
      })
      .reduce((total, agendamento) => total + Number(agendamento.preco), 0);
  }

  const hoje = new Date();

  const faturamentoHoje = calcularFaturamento(
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
    new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      23,
      59,
      59,
      999,
    ),
  );

  const faturamentoSemana = calcularFaturamento(
    inicioDaSemana(hoje),
    fimDaSemana(hoje),
  );

  const faturamentoMes = calcularFaturamento(inicioDoMes(hoje), fimDoMes(hoje));

  const faturamentoTotal = agendamentosConcluidos.reduce(
    (total, agendamento) => total + Number(agendamento.preco),
    0,
  );

  // ============================================
  // CONFIRMAR AGENDAMENTO
  // ============================================

  async function confirmarAgendamento(id: number) {
    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: "Concluído",
      })
      .eq("id", id);

    if (error) {
      erro("Erro ao confirmar agendamento.");

      return;
    }

    sucesso("Agendamento confirmado!");

    await buscarAgendamentos();
    await buscarFaturamento();
  }

  // ============================================
  // CANCELAR AGENDAMENTO
  // ============================================

  async function cancelarAgendamento(id: number) {
    if (!window.confirm("Deseja cancelar este agendamento?")) {
      return;
    }

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: "Cancelado",
      })
      .eq("id", id);

    if (error) {
      erro("Erro ao cancelar.");

      return;
    }

    sucesso("Agendamento cancelado!");

    await buscarAgendamentos();
    await buscarFaturamento();
  }

  // ============================================
  // LOGOUT
  // ============================================

  async function logout() {
    await supabase.auth.signOut();

    navigate("/login");
  }

  // ============================================
  // WHATSAPP
  // ============================================

  function enviarMensagem(agendamento: Agendamento) {
    enviarWhatsApp({
      nome: agendamento.nome,

      telefone: agendamento.telefone,

      servico: agendamento.servico,

      data: agendamento.data,

      horario: agendamento.horario,
    });
  }

  // ============================================
  // TELA
  // ============================================

  return (
    <div className="dashboard">
      <NotificacaoAgendamento />

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="dashboard-header">
        <div className="top-buttons">
          <button
            className="historico-btn"
            onClick={() => navigate("/dias-bloqueados")}
          >
            📅 Dias Bloqueados
          </button>

          <button
            className="historico-btn"
            onClick={() => navigate("/historico")}
          >
            Histórico
          </button>

          <button className="encaixe-btn" onClick={abrirEncaixe}>
            ➕ Novo encaixe
          </button>

          <button className="logout" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      {/* ======================================
          TÍTULO
      ====================================== */}

      <h1 className="dashboard-title">Painel do Barbeiro</h1>

      {/* ======================================
          SELETOR DE DATA
      ====================================== */}

      <div className="seletor-data">
        <button type="button" onClick={() => mudarData(-1)}>
          ◀
        </button>

        <div className="data-atual">
          <span>📅 Data selecionada</span>

          <strong>{formatarData(dataSelecionada)}</strong>
        </div>

        <button type="button" onClick={() => mudarData(1)}>
          ▶
        </button>
      </div>

      {/* ======================================
          ESCOLHER DATA
      ====================================== */}

      <div className="escolher-data">
        <label htmlFor="data">Escolher outra data:</label>

        <input
          id="data"
          type="date"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
        />

        <button type="button" onClick={voltarParaHoje}>
          Hoje
        </button>
      </div>

      <p className="data-hoje">
        Agendamentos de {formatarData(dataSelecionada)}
      </p>

      {/* ======================================
          FORMULÁRIO DE ENCAIXE
      ====================================== */}

      {mostrarEncaixe && (
        <div className="encaixe-container">
          <div className="encaixe-form">
            <div className="encaixe-header">
              <h2>Novo encaixe</h2>

              <button
                type="button"
                className="fechar-encaixe"
                onClick={fecharEncaixe}
              >
                ✕
              </button>
            </div>

            <p className="encaixe-data">📅 {formatarData(dataSelecionada)}</p>

            <div className="encaixe-grid">
              {/* NOME */}

              <div className="campo-encaixe">
                <label htmlFor="nomeEncaixe">Nome do cliente *</label>

                <input
                  id="nomeEncaixe"
                  type="text"
                  value={nomeEncaixe}
                  onChange={(e) => setNomeEncaixe(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>

              {/* TELEFONE */}

              <div className="campo-encaixe">
                <label htmlFor="telefoneEncaixe">Telefone</label>

                <input
                  id="telefoneEncaixe"
                  type="text"
                  value={telefoneEncaixe}
                  onChange={(e) => setTelefoneEncaixe(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              {/* SERVIÇO */}

              <div className="campo-encaixe">
                <label htmlFor="servicoEncaixe">Serviço *</label>

                <select
                  id="servicoEncaixe"
                  value={servicoEncaixe}
                  onChange={(e) => {
                    setServicoEncaixe(e.target.value);

                    setHorarioEncaixe("");
                  }}
                >
                  <option value="">Selecione o serviço</option>

                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.nome}>
                      {servico.nome} — {servico.preco} — {servico.duracao}
                    </option>
                  ))}
                </select>
              </div>

              {/* HORÁRIO */}

              <div className="campo-encaixe">
                <label htmlFor="horarioEncaixe">Horário *</label>

                <select
                  id="horarioEncaixe"
                  value={horarioEncaixe}
                  onChange={(e) => setHorarioEncaixe(e.target.value)}
                  disabled={!servicoEncaixe || horariosDisponiveis.length === 0}
                >
                  <option value="">
                    {!servicoEncaixe
                      ? "Selecione o serviço primeiro"
                      : horariosDisponiveis.length === 0
                        ? "Nenhum horário disponível"
                        : "Selecione o horário"}
                  </option>

                  {horariosDisponiveis.map((horario) => (
                    <option key={horario} value={horario}>
                      {horario}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AÇÕES */}

            <div className="encaixe-actions">
              <button
                type="button"
                className="encaixe-cancelar"
                onClick={fecharEncaixe}
                disabled={salvandoEncaixe}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="encaixe-salvar"
                onClick={criarEncaixe}
                disabled={salvandoEncaixe}
              >
                {salvandoEncaixe ? "Salvando..." : "Agendar encaixe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          CARDS DO DIA
      ====================================== */}

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>👥 Clientes</h3>

          <span>{totalClientes}</span>
        </div>

        <div className="dashboard-card">
          <h3>💰 Receita</h3>

          <span>
            {receita.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="dashboard-card">
          <h3>🟡 Pendentes</h3>

          <span>{pendentes}</span>
        </div>

        <div className="dashboard-card">
          <h3>🟢 Concluídos</h3>

          <span>{concluidos}</span>
        </div>
      </div>

      {/* ======================================
          FATURAMENTO
      ====================================== */}

      <div className="financeiro-dashboard">
        <h2 className="financeiro-titulo">💰 Faturamento</h2>

        <div className="financeiro-cards">
          <div className="financeiro-card">
            <span>Hoje</span>

            <strong>
              {faturamentoHoje.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>

          <div className="financeiro-card">
            <span>Esta semana</span>

            <strong>
              {faturamentoSemana.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>

          <div className="financeiro-card">
            <span>Este mês</span>

            <strong>
              {faturamentoMes.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>

          <div className="financeiro-card destaque">
            <span>Faturamento total</span>

            <strong>
              {faturamentoTotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
        </div>
      </div>

      {/* ======================================
          AGENDAMENTOS
      ====================================== */}

      <div className="appointments">
        {agendamentos.length === 0 ? (
          <h2 className="sem-agendamentos">
            Nenhum agendamento para {formatarData(dataSelecionada)}.
          </h2>
        ) : (
          agendamentos.map((agendamento) => (
            <AppointmentCard
              key={agendamento.id}
              agendamento={agendamento}
              confirmarAgendamento={confirmarAgendamento}
              cancelarAgendamento={cancelarAgendamento}
              enviarMensagem={enviarMensagem}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Dashboard;
