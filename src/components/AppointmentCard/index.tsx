import { useEffect, useRef, useState } from "react";
import "./style.css";

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

type Props = {
  agendamento: Agendamento;
  confirmarAgendamento: (id: number) => void;
  cancelarAgendamento: (id: number) => void;
  enviarMensagem: (agendamento: Agendamento) => void;
};

function AppointmentCard({
  agendamento,
  confirmarAgendamento,
  cancelarAgendamento,
  enviarMensagem,
}: Props) {
  const [mostrarAnimacao, setMostrarAnimacao] = useState(false);

  const statusAnterior = useRef(agendamento.status);

  useEffect(() => {
    if (
      statusAnterior.current === "Pendente" &&
      agendamento.status === "Confirmado"
    ) {
      setMostrarAnimacao(true);
    }

    statusAnterior.current = agendamento.status;
  }, [agendamento.status]);

  const classeStatus =
    agendamento.status === "Concluído"
      ? "concluido"
      : agendamento.status === "Cancelado"
        ? "cancelado"
        : agendamento.status === "Confirmado"
          ? "confirmado"
          : "pendente";

  return (
    <div
      className={`appointment-card ${
        mostrarAnimacao ? "confirmacao-animada" : ""
      }`}
    >
      {mostrarAnimacao && (
        <div
          className="confirmacao-efeito"
          aria-hidden="true"
          onAnimationEnd={() => setMostrarAnimacao(false)}
        >
          $
        </div>
      )}

      <div className="appointment-header">
        <h3>{agendamento.nome}</h3>

        <span>{agendamento.horario}</span>
      </div>

      <p>📞 {agendamento.telefone}</p>

      <p>✂ {agendamento.servico}</p>

      <p>💰 R$ {agendamento.preco}</p>

      <p className={`status ${classeStatus}`}>{agendamento.status}</p>

      {agendamento.status === "Pendente" && (
        <div className="buttons">
          <button
            className="confirmar"
            onClick={() => confirmarAgendamento(agendamento.id)}
          >
            Confirmar
          </button>

          <button
            className="cancelar"
            onClick={() => cancelarAgendamento(agendamento.id)}
          >
            Cancelar
          </button>

          <button
            className="whatsapp"
            onClick={() => enviarMensagem(agendamento)}
          >
            📲 WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}

export default AppointmentCard;
