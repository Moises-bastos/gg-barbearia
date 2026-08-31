import "./style.css";

import { useState } from "react";
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
    const numeros = valor.replace(/\D/g, "");

    if (numeros.length <= 2) {
      return numeros;
    }

    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(
      2,
      7
    )}-${numeros.slice(7, 11)}`;
  }

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

async function buscarAgendamentos() {
  const telefoneFormatado = formatarTelefone(telefone);

  if (telefoneFormatado.replace(/\D/g, "").length !== 11) {
    aviso("Digite um telefone válido.");
    return;
  }

  setBuscando(true);

  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("telefone", telefoneFormatado)
    .neq("status", "Cancelado")
    .order("data", { ascending: true })
    .order("horario", { ascending: true });

  setBuscando(false);

  console.log("📞 Telefone pesquisado:", telefoneFormatado);
  console.log("🔎 Agendamentos encontrados:", data);
  console.log("❌ Erro:", error);

  if (error) {
    console.error(error);
    erro("Erro ao buscar agendamentos.");
    return;
  }

  setAgendamentos(
    (data as Agendamento[]) || []
  );

  if (!data || data.length === 0) {
    aviso(
      "Nenhum agendamento encontrado para este telefone."
    );
  }
}

  async function cancelarAgendamento(id: number) {
    const confirmar = window.confirm(
      "Deseja realmente cancelar este agendamento?"
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
      atual.filter(
        (agendamento) => agendamento.id !== id
      )
    );

    setCancelando(null);
  }

  return (
    <div className="cancelar-agendamento-page">

      <div className="cancelar-agendamento-container">

        <h1>Cancelar agendamento</h1>

        <p className="cancelar-descricao">
          Digite o telefone usado no agendamento
          para consultar seus cortes.
        </p>

        <div className="buscar-cancelamento">

          <input
            type="tel"
            placeholder="(86) 99999-9999"
            value={telefone}
            maxLength={15}
            onChange={(e) =>
              setTelefone(
                formatarTelefone(e.target.value)
              )
            }
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
            {buscando
              ? "Buscando..."
              : "Buscar agendamentos"}
          </button>

        </div>

        {agendamentos.length > 0 && (

          <div className="resultado-cancelamento">

            <h2>Seus agendamentos</h2>

            <div className="lista-cancelamentos">

              {agendamentos.map(
                (agendamento) => (

                  <div
                    className="cancelamento-card"
                    key={agendamento.id}
                  >

                    <h3>
                      {agendamento.servico}
                    </h3>

                    <div className="dados-cancelamento">

                      <p>
                        👤 <strong>Cliente:</strong>{" "}
                        {agendamento.nome}
                      </p>

                      <p>
                        📅 <strong>Data:</strong>{" "}
                        {formatarData(
                          agendamento.data
                        )}
                      </p>

                      <p>
                        🕐 <strong>Horário:</strong>{" "}
                        {agendamento.horario}
                      </p>

                      <p>
                        💰 <strong>Valor:</strong>{" "}
                        R${" "}
                        {Number(
                          agendamento.preco
                        ).toFixed(2)}
                      </p>

                    </div>

                    <button
                      type="button"
                      className="botao-cancelar"
                      onClick={() =>
                        cancelarAgendamento(
                          agendamento.id
                        )
                      }
                      disabled={
                        cancelando ===
                        agendamento.id
                      }
                    >
                      {cancelando ===
                      agendamento.id
                        ? "Cancelando..."
                        : "❌ Cancelar agendamento"}
                    </button>

                  </div>

                )
              )}

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default CancelarAgendamento;