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

  // =========================
  // ESTATÍSTICAS
  // =========================

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

  // =========================
  // DATAS
  // =========================

  const hoje = new Date();

  const hojeString =
    `${hoje.getFullYear()}-${String(
      hoje.getMonth() + 1
    ).padStart(2, "0")}-${String(
      hoje.getDate()
    ).padStart(2, "0")}`;

  const inicioSemana = new Date(hoje);

  inicioSemana.setHours(0, 0, 0, 0);

  inicioSemana.setDate(
    hoje.getDate() - hoje.getDay()
  );

  // =========================
  // FILTROS
  // =========================

  const historicoFiltrado = historico.filter((item) => {
    // Converte YYYY-MM-DD para uma data LOCAL
    const [ano, mes, dia] = item.data
      .split("-")
      .map(Number);

    const data = new Date(
      ano,
      mes - 1,
      dia
    );

    data.setHours(0, 0, 0, 0);

    // HOJE
    if (filtro === "hoje") {
      return item.data === hojeString;
    }

    // SEMANA
    if (filtro === "semana") {
      return data >= inicioSemana;
    }

    // MÊS
    if (filtro === "mes") {
      return (
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear()
      );
    }

    // TODOS
    return true;
  });

  return (
    <div className="historico-page">

      <h1>Histórico de Agendamentos</h1>

      {/* =========================
          FILTROS
      ========================= */}

      <div className="filtros">

        <button
          className={
            filtro === "todos"
              ? "ativo"
              : ""
          }
          onClick={() =>
            setFiltro("todos")
          }
        >
          Todos
        </button>

        <button
          className={
            filtro === "hoje"
              ? "ativo"
              : ""
          }
          onClick={() =>
            setFiltro("hoje")
          }
        >
          Hoje
        </button>

        <button
          className={
            filtro === "semana"
              ? "ativo"
              : ""
          }
          onClick={() =>
            setFiltro("semana")
          }
        >
          Semana
        </button>

        <button
          className={
            filtro === "mes"
              ? "ativo"
              : ""
          }
          onClick={() =>
            setFiltro("mes")
          }
        >
          Mês
        </button>

      </div>

      {/* =========================
          CARDS
      ========================= */}

      <div className="historico-cards">

        <div className="historico-card">
          <h3>💰 Receita Total</h3>

          <span>
            {rendimentoTotal.toLocaleString(
              "pt-BR",
              {
                style: "currency",
                currency: "BRL",
              }
            )}
          </span>
        </div>

        <div className="historico-card">
          <h3>✂️ Cortes Realizados</h3>

          <span>
            {totalConcluidos}
          </span>
        </div>

        <div className="historico-card">
          <h3>❌ Cancelamentos</h3>

          <span>
            {totalCancelados}
          </span>
        </div>

        <div className="historico-card">
          <h3>📊 Ticket Médio</h3>

          <span>
            {ticketMedio.toLocaleString(
              "pt-BR",
              {
                style: "currency",
                currency: "BRL",
              }
            )}
          </span>
        </div>

      </div>

      {/* =========================
          TABELA
      ========================= */}

      {historicoFiltrado.length === 0 ? (

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

              {historicoFiltrado.map(
                (item) => (

                  <tr key={item.id}>

                    <td>
                      {item.nome}
                    </td>

                    <td>
                      {item.telefone}
                    </td>

                    <td>
                      {item.servico}
                    </td>

                    <td>
                      {(() => {
                        const [
                          ano,
                          mes,
                          dia,
                        ] = item.data
                          .split("-")
                          .map(Number);

                        return new Date(
                          ano,
                          mes - 1,
                          dia
                        ).toLocaleDateString(
                          "pt-BR"
                        );
                      })()}
                    </td>

                    <td>
                      {item.horario}
                    </td>

                    <td>
                      {item.preco.toLocaleString(
                        "pt-BR",
                        {
                          style:
                            "currency",
                          currency:
                            "BRL",
                        }
                      )}
                    </td>

                    <td>
                      {item.status ===
                      "Concluído"
                        ? "✅ Concluído"
                        : "❌ Cancelado"}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

export default Historico;