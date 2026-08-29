import "./style.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AppointmentCard from "../../../components/AppointmentCard";
import { useNavigate } from "react-router-dom";
import { sucesso, erro } from "../../../utils/toast";
import { enviarWhatsApp } from "../../../utils/whatsapp";
import NotificacaoAgendamento from "../../../components/notificação/NotificacaoAgendamento";

type Agendamento = {
  id: number;
  nome: string;
  telefone: string;
  servico: string;
  preco: number;
  horario: string;
  data: string;
  status: string;
};

function Dashboard() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split("T")[0]
  );

  const navigate = useNavigate();

  useEffect(() => {
    buscarAgendamentos();
  }, [dataSelecionada]);

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

    const novaData =
      data.toISOString().split("T")[0];

    setDataSelecionada(novaData);
  }

  function voltarParaHoje() {
    setDataSelecionada(
      new Date().toISOString().split("T")[0]
    );
  }

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  const totalClientes = agendamentos.length;

  const pendentes = agendamentos.filter(
    (a) => a.status === "Pendente"
  ).length;

  const concluidos = agendamentos.filter(
    (a) => a.status === "Concluído"
  ).length;

  const receita = agendamentos
    .filter((a) => a.status === "Concluído")
    .reduce(
      (total, a) => total + Number(a.preco),
      0
    );

  async function confirmarAgendamento(id: number) {
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "Concluído" })
      .eq("id", id);

    if (error) {
      erro("Erro ao confirmar agendamento.");
      return;
    }

    sucesso("Agendamento confirmado!");

    buscarAgendamentos();
  }

  async function cancelarAgendamento(id: number) {
    if (
      !window.confirm(
        "Deseja cancelar este agendamento?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "Cancelado" })
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

  function enviarMensagem(
    agendamento: Agendamento
  ) {
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
            onClick={() =>
              navigate("/dias-bloqueados")
            }
          >
            📅 Dias Bloqueados
          </button>

          <button
            className="historico-btn"
            onClick={() =>
              navigate("/historico")
            }
          >
            Histórico
          </button>

          <button
            className="logout"
            onClick={logout}
          >
            Sair
          </button>

        </div>

      </div>

      <h1 className="dashboard-title">
        Painel do Barbeiro
      </h1>

      {/* =============================== */}
      {/* SELETOR DE DATA */}
      {/* =============================== */}

      <div className="seletor-data">

        <button
          type="button"
          onClick={() => mudarData(-1)}
        >
          ◀
        </button>

        <div className="data-atual">

          <span>
            📅 Data selecionada
          </span>

          <strong>
            {formatarData(dataSelecionada)}
          </strong>

        </div>

        <button
          type="button"
          onClick={() => mudarData(1)}
        >
          ▶
        </button>

      </div>

      <div className="escolher-data">

        <label htmlFor="data">
          Escolher outra data:
        </label>

        <input
          id="data"
          type="date"
          value={dataSelecionada}
          onChange={(e) =>
            setDataSelecionada(e.target.value)
          }
        />

        <button
          type="button"
          onClick={voltarParaHoje}
        >
          Hoje
        </button>

      </div>

      <p className="data-hoje">
        Agendamentos de{" "}
        {formatarData(dataSelecionada)}
      </p>

      {/* =============================== */}
      {/* CARDS */}
      {/* =============================== */}

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

          <span>
            {pendentes}
          </span>
        </div>

        <div className="dashboard-card">
          <h3>🟢 Concluídos</h3>

          <span>
            {concluidos}
          </span>
        </div>

      </div>

      {/* =============================== */}
      {/* AGENDAMENTOS */}
      {/* =============================== */}

      <div className="appointments">

        {agendamentos.length === 0 ? (

          <h2 className="sem-agendamentos">
            Nenhum agendamento para{" "}
            {formatarData(dataSelecionada)}.
          </h2>

        ) : (

          agendamentos.map(
            (agendamento) => (

              <AppointmentCard
                key={agendamento.id}
                agendamento={agendamento}
                confirmarAgendamento={
                  confirmarAgendamento
                }
                cancelarAgendamento={
                  cancelarAgendamento
                }
                enviarMensagem={
                  enviarMensagem
                }
              />

            )
          )

        )}

      </div>

    </div>
  );
}

export default Dashboard;