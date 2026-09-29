import "./style.css";

import { useEffect, useState } from "react";

import { supabase } from "../../../lib/supabase";

import { sucesso, erro, aviso } from "../../../utils/toast";

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

function CancelarAgendamento() {
  const [telefone, setTelefone] = useState("");

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [buscando, setBuscando] = useState(false);

  const [cancelando, setCancelando] = useState<number | null>(null);

  function formatarTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);

    if (numeros.length <= 2) {
      return numeros;
    }

    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(
      2,
      7,
    )}-${numeros.slice(7, 11)}`;
  }

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  function dataHoraAgendamento(agendamento: Agendamento) {
    return new Date(`${agendamento.data}T${agendamento.horario}:00`);
  }

  function agendamentoFuturo(agendamento: Agendamento) {
    return dataHoraAgendamento(agendamento) >= new Date();
  }

  function obterProximosAgendamentos() {
    return agendamentos
      .filter((agendamento) => {
        const futuro = agendamentoFuturo(agendamento);

        const statusValido =
          agendamento.status === "Pendente" ||
          agendamento.status === "Confirmado";

        return futuro && statusValido;
      })
      .sort(
        (a, b) =>
          dataHoraAgendamento(a).getTime() - dataHoraAgendamento(b).getTime(),
      );
  }

  function obterHistorico() {
    return agendamentos
      .filter((agendamento) => {
        const passado = !agendamentoFuturo(agendamento);

        const statusHistorico =
          agendamento.status === "Concluído" ||
          agendamento.status === "Cancelado";

        return passado || statusHistorico;
      })
      .sort(
        (a, b) =>
          dataHoraAgendamento(b).getTime() - dataHoraAgendamento(a).getTime(),
      );
  }

  async function buscarAgendamentoPorId(id: number) {
    setBuscando(true);

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    setBuscando(false);

    if (error) {
      console.error(error);
      erro("Erro ao buscar o agendamento.");
      return;
    }

    if (!data) {
      aviso("Agendamento não encontrado.");
      return;
    }

    if (data.status !== "Pendente" && data.status !== "Confirmado") {
      aviso("Este agendamento não está mais disponível para cancelamento.");
    }

    setAgendamentos([data as Agendamento]);
  }

  async function buscarAgendamentos() {
    const telefoneLimpo = telefone.replace(/\D/g, "");

    if (telefoneLimpo.length !== 11) {
      aviso("Digite um telefone válido.");
      return;
    }

    setBuscando(true);

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("telefone", telefoneLimpo)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    setBuscando(false);

    if (error) {
      console.error(error);

      erro("Erro ao buscar agendamentos.");

      return;
    }

    setAgendamentos((data as Agendamento[]) || []);

    if (!data || data.length === 0) {
      aviso("Nenhum agendamento encontrado para este telefone.");
    }
  }

  async function cancelarAgendamento(id: number) {
    const confirmar = window.confirm(
      "Deseja realmente cancelar este agendamento?",
    );

    if (!confirmar) {
      return;
    }

    setCancelando(id);

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: "Cancelado",
      })
      .eq("id", id);

    if (error) {
      console.error(error);

      erro("Erro ao cancelar agendamento.");

      setCancelando(null);

      return;
    }

    sucesso("Agendamento cancelado com sucesso!");

    setAgendamentos((atual) =>
      atual.map((agendamento) =>
        agendamento.id === id
          ? {
              ...agendamento,
              status: "Cancelado",
            }
          : agendamento,
      ),
    );

    setCancelando(null);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");

    if (!id) {
      return;
    }

    const idNumerico = Number(id);

    if (!Number.isInteger(idNumerico)) {
      aviso("Link de agendamento inválido.");
      return;
    }

    buscarAgendamentoPorId(idNumerico);
  }, []);

  const proximosAgendamentos = obterProximosAgendamentos();

  const historico = obterHistorico();

  return (
    <div className="cancelar-agendamento-page">
      <div className="cancelar-agendamento-container">
        <h1>Meus agendamentos</h1>

        <p className="cancelar-descricao">
          Digite o telefone usado no agendamento para consultar seus cortes.
        </p>

        <div className="buscar-cancelamento">
          <input
            type="tel"
            placeholder="(86) 99999-9999"
            value={telefone}
            maxLength={15}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                buscarAgendamentos();
              }
            }}
          />

          <button
            type="button"
            onClick={buscarAgendamentos}
            disabled={buscando}
          >
            {buscando ? "Buscando..." : "Buscar agendamentos"}
          </button>
        </div>

        {agendamentos.length > 0 && (
          <>
            {/* ========================= */}
            {/* PRÓXIMOS AGENDAMENTOS */}
            {/* ========================= */}

            {proximosAgendamentos.length > 0 && (
              <div className="resultado-cancelamento">
                <h2>📅 Próximos agendamentos</h2>

                <div className="lista-cancelamentos">
                  {proximosAgendamentos.map((agendamento) => (
                    <div className="cancelamento-card" key={agendamento.id}>
                      <h3>{agendamento.servico}</h3>

                      <div className="dados-cancelamento">
                        <p>
                          👤 <strong>Cliente:</strong> {agendamento.nome}
                        </p>

                        <p>
                          📅 <strong>Data:</strong>{" "}
                          {formatarData(agendamento.data)}
                        </p>

                        <p>
                          🕐 <strong>Horário:</strong> {agendamento.horario}
                        </p>

                        <p>
                          💰 <strong>Valor:</strong> R${" "}
                          {Number(agendamento.preco).toFixed(2)}
                        </p>

                        <p>
                          📌 <strong>Status:</strong> {agendamento.status}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="botao-cancelar"
                        onClick={() => cancelarAgendamento(agendamento.id)}
                        disabled={cancelando === agendamento.id}
                      >
                        {cancelando === agendamento.id
                          ? "Cancelando..."
                          : "❌ Cancelar agendamento"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================= */}
            {/* HISTÓRICO */}
            {/* ========================= */}

            {historico.length > 0 && (
              <div className="resultado-cancelamento historico-cliente">
                <h2>📋 Histórico</h2>

                <div className="lista-cancelamentos">
                  {historico.map((agendamento) => (
                    <div
                      className={`cancelamento-card historico-card ${
                        agendamento.status === "Cancelado"
                          ? "historico-cancelado"
                          : ""
                      }`}
                      key={agendamento.id}
                    >
                      <h3>{agendamento.servico}</h3>

                      <div className="dados-cancelamento">
                        <p>
                          📅 <strong>Data:</strong>{" "}
                          {formatarData(agendamento.data)}
                        </p>

                        <p>
                          🕐 <strong>Horário:</strong> {agendamento.horario}
                        </p>

                        <p>
                          💰 <strong>Valor:</strong> R${" "}
                          {Number(agendamento.preco).toFixed(2)}
                        </p>

                        <p>
                          📌 <strong>Status:</strong>{" "}
                          <span
                            className={
                              agendamento.status === "Cancelado"
                                ? "status-historico-cancelado"
                                : "status-historico-concluido"
                            }
                          >
                            {agendamento.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CancelarAgendamento;
