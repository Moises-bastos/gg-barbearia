import "./style.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

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

function Historico() {
  const [historico, setHistorico] = useState<Agendamento[]>([]);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    buscarHistorico();
  }, []);

  async function buscarHistorico() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .in("status", ["Concluído", "Cancelado"])
      .order("data", { ascending: false })
      .order("horario", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    if (data) {
      setHistorico(data as Agendamento[]);
    }
  }

  // Estatísticas

const totalConcluidos = historico.filter(
  (item) => item.status === "Concluído"
).length;

const totalCancelados = historico.filter(
  (item) => item.status === "Cancelado"
).length;

const rendimentoTotal = historico
  .filter((item) => item.status === "Concluído")
  .reduce((total, item) => total + item.preco, 0);

const ticketMedio =
  totalConcluidos > 0
    ? rendimentoTotal / totalConcluidos
    : 0;

    const hoje = new Date();
const inicioSemana = new Date();
inicioSemana.setDate(hoje.getDate() - hoje.getDay());

const historicoFiltrado = historico.filter((item) => {
  const data = new Date(item.data);

  if (filtro === "hoje") {
    return data.toDateString() === hoje.toDateString();
  }

  if (filtro === "semana") {
    return data >= inicioSemana;
  }

  if (filtro === "mes") {
    return (
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear()
    );
  }

  return true;
});

return (
  <div className="historico-page">

    <h1>Histórico de Agendamentos</h1>

    <div className="filtros">

  <button
    className={filtro === "todos" ? "ativo" : ""}
    onClick={() => setFiltro("todos")}
  >
    Todos
  </button>

  <button
    className={filtro === "hoje" ? "ativo" : ""}
    onClick={() => setFiltro("hoje")}
  >
    Hoje
  </button>

  <button
    className={filtro === "semana" ? "ativo" : ""}
    onClick={() => setFiltro("semana")}
  >
    Semana
  </button>

  <button
    className={filtro === "mes" ? "ativo" : ""}
    onClick={() => setFiltro("mes")}
  >
    Mês
  </button>

</div>


    <div className="historico-cards">

  <div className="historico-card">
    <h3>💰 Receita Total</h3>

    <span>
      {rendimentoTotal.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}
    </span>
  </div>

  <div className="historico-card">
    <h3>✂️ Cortes Realizados</h3>

    <span>{totalConcluidos}</span>
  </div>

  <div className="historico-card">
    <h3>❌ Cancelamentos</h3>

    <span>{totalCancelados}</span>
  </div>

  <div className="historico-card">
    <h3>📊 Ticket Médio</h3>

    <span>
      {ticketMedio.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}
    </span>
  </div>

</div>

    {historico.length === 0 ? (

      <h2 className="sem-registros">
        Nenhum atendimento encontrado.
      </h2>

    ) : (
       
        

      <div className="table-container">

        <table className="historico-table">

          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Serviço</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {historicoFiltrado.map((item) => (

              <tr key={item.id}>

                <td>{item.nome}</td>

                <td>{item.telefone}</td>

                <td>{item.servico}</td>

                <td>
                  {new Date(item.data).toLocaleDateString("pt-BR")}
                </td>

                <td>{item.horario}</td>

                <td>
                  {item.preco.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>

                <td>
                  {item.status === "Concluído"
                    ? "✅ Concluído"
                    : "❌ Cancelado"}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    )}

  </div>
);
}

export default Historico;