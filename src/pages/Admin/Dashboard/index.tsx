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

  const [mostrarEncaixe, setMostrarEncaixe] = useState(false);

  const [nomeEncaixe, setNomeEncaixe] = useState("");
  const [telefoneEncaixe, setTelefoneEncaixe] = useState("");
  const [servicoEncaixe, setServicoEncaixe] = useState("");
  const [horarioEncaixe, setHorarioEncaixe] = useState("");

  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);

  const [salvandoEncaixe, setSalvandoEncaixe] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    buscarAgendamentos();
  }, [dataSelecionada]);

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

  async function buscarHorariosDisponiveis() {
    const servico = servicos.find((s) => s.nome === servicoEncaixe);

    if (!servico) {
      setHorariosDisponiveis([]);
      return;
    }

    const duracao = Number(servico.duracao.replace("min", "").trim());

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

    const dia = new Date(`${dataSelecionada}T12:00:00`);
    const diaDaSemana = dia.getDay();

    // Domingo fechado
    if (diaDaSemana === 0) {
      setHorariosDisponiveis([]);
      return;
    }

    // Verifica se o dia inteiro está bloqueado
    const diaInteiroBloqueado = bloqueiosDoDia.some(
      (bloqueio) => !bloqueio.hora_inicio && !bloqueio.hora_fim,
    );

    if (diaInteiroBloqueado) {
      setHorariosDisponiveis([]);
      return;
    }

    const agora = new Date();

    const hoje = dataSelecionada === agora.toISOString().split("T")[0];

    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

    const disponiveis = horarios.filter((horario) => {
      const inicio = horarioParaMinutos(horario);
      const fim = inicio + duracao;

      // Não permite encaixe no passado quando for hoje
      if (hoje && inicio <= minutosAgora) {
        return false;
      }

      // Limite de funcionamento: 18:30
      if (fim > 18 * 60 + 30) {
        return false;
      }

      // Almoço
      const inicioAlmoco = 12 * 60;

      const fimAlmoco = diaDaSemana === 6 ? 13 * 60 + 30 : 14 * 60;

      if (intervaloConflita(inicio, fim, inicioAlmoco, fimAlmoco)) {
        return false;
      }

      // Verifica agendamentos existentes
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

      // Verifica bloqueios
      const conflitoBloqueio = bloqueiosDoDia.some((bloqueio) => {
        // Se for bloqueio de dia inteiro,
        // já foi tratado acima.
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

  function abrirEncaixe() {
    setNomeEncaixe("");
    setTelefoneEncaixe("");
    setServicoEncaixe("");
    setHorarioEncaixe("");
    setHorariosDisponiveis([]);

    setMostrarEncaixe(true);
  }

  function fecharEncaixe() {
    setMostrarEncaixe(false);

    setNomeEncaixe("");
    setTelefoneEncaixe("");
    setServicoEncaixe("");
    setHorarioEncaixe("");
    setHorariosDisponiveis([]);
  }

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

      // Verifica novamente os agendamentos
      // antes de inserir.
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

  const totalClientes = agendamentos.length;

  const pendentes = agendamentos.filter((a) => a.status === "Pendente").length;

  const concluidos = agendamentos.filter(
    (a) => a.status === "Concluído",
  ).length;

  const receita = agendamentos
    .filter((a) => a.status === "Concluído")
    .reduce((total, a) => total + Number(a.preco), 0);

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

    buscarAgendamentos();
  }

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

    buscarAgendamentos();
  }

  async function logout() {
    await supabase.auth.signOut();

    navigate("/login");
  }

  function enviarMensagem(agendamento: Agendamento) {
    enviarWhatsApp({
      nome: agendamento.nome,
      telefone: agendamento.telefone,
      servico: agendamento.servico,
      data: agendamento.data,
      horario: agendamento.horario,
    });
  }

  return (
    <div className="dashboard">
      <NotificacaoAgendamento />

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

      <h1 className="dashboard-title">Painel do Barbeiro</h1>

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
