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
  return (
    <div className="appointment-card">

      <div className="appointment-header">
        <h3>{agendamento.nome}</h3>

        <span>{agendamento.horario}</span>
      </div>

      <p>📞 {agendamento.telefone}</p>

      <p>✂ {agendamento.servico}</p>

      <p>💰 R$ {agendamento.preco}</p>

      <p
        className={
          agendamento.status === "Concluído"
            ? "status concluido"
            : agendamento.status === "Cancelado"
              ? "status cancelado"
              : "status pendente"
        }
      >
        {agendamento.status}
      </p>

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