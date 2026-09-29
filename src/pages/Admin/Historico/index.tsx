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
  // DATAS
  // =========================

  const hoje = new Date();

  const hojeString = `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1,
  ).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const inicioSemana = new Date(hoje);

  inicioSemana.setHours(0, 0, 0, 0);

  inicioSemana.setDate(hoje.getDate() - hoje.getDay());

  // =========================
  // FATURAMENTO DE HOJE
  // =========================

  const faturamentoHoje = historico
    .filter((item) => item.data === hojeString && item.status === "Concluído")
    .reduce((total, item) => total + Number(item.preco), 0);

  // =========================
  // FATURAMENTO DA SEMANA
  // =========================

  const faturamentoSemana = historico
    .filter((item) => {
      if (item.status !== "Concluído") {
        return false;
      }

      const [ano, mes, dia] = item.data.split("-").map(Number);

      const data = new Date(ano, mes - 1, dia);

      data.setHours(0, 0, 0, 0);

      return data >= inicioSemana;
    })
    .reduce((total, item) => total + Number(item.preco), 0);

  // =========================
  // FATURAMENTO DO MÊS
  // =========================

  const faturamentoMes = historico
    .filter((item) => {
      if (item.status !== "Concluído") {
        return false;
      }

      const [ano, mes, dia] = item.data.split("-").map(Number);

      const data = new Date(ano, mes - 1, dia);

      return (
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear()
      );
    })
    .reduce((total, item) => total + Number(item.preco), 0);

  // =========================
  // ESTATÍSTICAS GERAIS
  // =========================

  const totalConcluidos = historico.filter(
    (item) => item.status === "Concluído",
  ).length;

  const totalCancelados = historico.filter(
    (item) => item.status === "Cancelado",
  ).length;

  const rendimentoTotal = historico
    .filter((item) => item.status === "Concluído")
    .reduce((total, item) => total + Number(item.preco), 0);

  const ticketMedio =
    totalConcluidos > 0 ? rendimentoTotal / totalConcluidos : 0;

  // =========================
  // FILTROS
  // =========================

  const historicoFiltrado = historico.filter((item) => {
    const [ano, mes, dia] = item.data.split("-").map(Number);

    const data = new Date(ano, mes - 1, dia);

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

  // =========================
  // FORMATAR VALOR
  // =========================

  function formatarValor(valor: number) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // =========================
  // FORMATAR DATA
  // =========================

  function formatarData(dataString: string) {
    const [ano, mes, dia] = dataString.split("-").map(Number);

    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
  }

  return (
    <div className="historico-page">
      <h1>Histórico de Agendamentos</h1>

      {/* =========================
          FATURAMENTO
      ========================= */}

      <div className="faturamento-periodos">
        <div className="faturamento-periodo">
          <span>💰 Hoje</span>

          <strong>{formatarValor(faturamentoHoje)}</strong>
        </div>

        <div className="faturamento-periodo">
          <span>📅 Esta semana</span>

          <strong>{formatarValor(faturamentoSemana)}</strong>
        </div>

        <div className="faturamento-periodo">
          <span>🗓️ Este mês</span>

          <strong>{formatarValor(faturamentoMes)}</strong>
        </div>
      </div>

      {/* =========================
          FILTROS
      ========================= */}

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

      {/* =========================
          CARDS
      ========================= */}

      <div className="historico-cards">
        <div className="historico-card">
          <h3>💰 Receita Total</h3>

          <span>{formatarValor(rendimentoTotal)}</span>
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

          <span>{formatarValor(ticketMedio)}</span>
        </div>
      </div>

      {/* =========================
          TABELA
      ========================= */}

      {historicoFiltrado.length === 0 ? (
        <h2 className="sem-registros">Nenhum atendimento encontrado.</h2>
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

                  <td>{formatarData(item.data)}</td>

                  <td>{item.horario}</td>

                  <td>{formatarValor(item.preco)}</td>

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
