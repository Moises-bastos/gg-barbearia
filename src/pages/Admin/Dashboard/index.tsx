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
  const navigate = useNavigate();

  useEffect(() => {
    buscarAgendamentos();
  }, []);

  async function buscarAgendamentos() {
    const hoje = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("data", hoje)
      .order("horario");

    if (error) {
      console.log(error);
      return;
    }

    if (data) {
      setAgendamentos(data as Agendamento[]);
    }
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
    .reduce((total, a) => total + a.preco, 0);

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
    if (!window.confirm("Deseja cancelar este agendamento?")) return;

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

      <p className="data-hoje">
        Agendamentos de hoje -{" "}
        {new Date().toLocaleDateString("pt-BR")}
      </p>

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
            Nenhum agendamento para hoje.
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