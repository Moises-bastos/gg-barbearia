import "./style.css";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  duracao: number | null;
};

function CancelarAgendamento() {
  const [searchParams] = useSearchParams();

  const [telefone, setTelefone] = useState("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [cancelando, setCancelando] = useState<number | null>(null);

  // ==========================================
  // FORMATAR TELEFONE
  // ==========================================

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
      7,
    )}-${numeros.slice(7, 11)}`;
  }

  // ==========================================
  // FORMATAR DATA
  // ==========================================

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  // ==========================================
  // VERIFICAR SE É FUTURO
  // ==========================================

  function agendamentoFuturo(agendamento: Agendamento) {
    const agora = new Date();

    const dataHora = new Date(`${agendamento.data}T${agendamento.horario}`);

    return dataHora > agora;
  }

  // ==========================================
  // BUSCAR AGENDAMENTOS
  // ==========================================

  async function buscarAgendamentos(telefoneBusca?: string) {
    const telefoneLimpo = (telefoneBusca ?? telefone).replace(/\D/g, "");

    if (telefoneLimpo.length !== 11) {
      aviso("Digite um telefone válido.");
      return;
    }

    setCarregando(true);
    setBuscou(true);

    const { data, error } = await supabase
      .from("agendamentos")
      .select(
        "id, nome, telefone, servico, preco, horario, data, status, duracao",
      )
      .eq("telefone", telefoneLimpo)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    setCarregando(false);

    if (error) {
      console.error("Erro ao buscar agendamentos:", error);

      erro("Não foi possível buscar seus agendamentos.");

      setAgendamentos([]);
      return;
    }

    setAgendamentos((data as Agendamento[]) || []);
  }

  // ==========================================
  // CARREGAR PELO LINK DO AGENDAMENTO
  // ==========================================

  useEffect(() => {
    const id = searchParams.get("id");

    if (!id) {
      return;
    }

    async function carregarAgendamentoDoLink() {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(
          "id, nome, telefone, servico, preco, horario, data, status, duracao",
        )
        .eq("id", Number(id))
        .single();

      if (error || !data) {
        console.error("Erro ao carregar agendamento:", error);

        return;
      }

      const agendamento = data as Agendamento;

      setTelefone(formatarTelefone(agendamento.telefone));

      await buscarAgendamentos(agendamento.telefone);
    }

    carregarAgendamentoDoLink();
  }, [searchParams]);

  // ==========================================
  // CANCELAR AGENDAMENTO
  // ==========================================

  async function cancelarAgendamento(id: number) {
    if (cancelando !== null) {
      return;
    }

    const confirmar = window.confirm(
      "Tem certeza que deseja cancelar este agendamento?",
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

    setCancelando(null);

    if (error) {
      console.error("Erro ao cancelar agendamento:", error);

      erro("Não foi possível cancelar o agendamento.");

      return;
    }

    sucesso("Agendamento cancelado com sucesso!");

    await buscarAgendamentos();
  }

  // ==========================================
  // SEPARAR PRÓXIMOS E HISTÓRICO
  // ==========================================

  const proximosAgendamentos = agendamentos.filter(
    (agendamento) =>
      agendamentoFuturo(agendamento) &&
      (agendamento.status === "Pendente" ||
        agendamento.status === "Confirmado"),
  );

  const historico = agendamentos.filter((agendamento) => {
    if (
      agendamento.status === "Concluído" ||
      agendamento.status === "Cancelado"
    ) {
      return true;
    }

    return !agendamentoFuturo(agendamento);
  });

  // ==========================================
  // TELA
  // ==========================================

  return (
    <div className="cancelar-agendamento">
      <div className="cancelar-card">
        <h1>Consultar agendamentos</h1>

        <p className="descricao">
          Digite o telefone usado no agendamento para consultar seus cortes.
        </p>

        {/* TELEFONE */}

        <div className="input-group">
          <label>Telefone</label>

          <input
            type="tel"
            placeholder="(99) 99999-9999"
            value={telefone}
            maxLength={15}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          />
        </div>

        {/* BOTÃO CONSULTAR */}

        <button
          type="button"
          className="botao-buscar"
          onClick={() => buscarAgendamentos()}
          disabled={carregando}
        >
          {carregando ? "Consultando..." : "Consultar agendamentos"}
        </button>

        {/* RESULTADOS */}

        {buscou && !carregando && (
          <>
            {agendamentos.length === 0 ? (
              <p className="sem-agendamentos">
                Nenhum agendamento encontrado para este telefone.
              </p>
            ) : (
              <>
                {/* =====================================
                    PRÓXIMOS AGENDAMENTOS
                ===================================== */}

                {proximosAgendamentos.length > 0 && (
                  <div className="proximos-cliente">
                    <h2>📅 Próximos agendamentos</h2>

                    {proximosAgendamentos.map((agendamento) => (
                      <div
                        className="agendamento-cliente-card"
                        key={agendamento.id}
                      >
                        <h3>{agendamento.servico}</h3>

                        <p>📅 {formatarData(agendamento.data)}</p>

                        <p>🕐 {agendamento.horario}</p>

                        <p>
                          💰 R${" "}
                          {Number(agendamento.preco)
                            .toFixed(2)
                            .replace(".", ",")}
                        </p>

                        <p
                          className={
                            agendamento.status === "Confirmado"
                              ? "status-cliente confirmado"
                              : "status-cliente pendente"
                          }
                        >
                          {agendamento.status}
                        </p>

                        <button
                          type="button"
                          className="botao-cancelar"
                          disabled={cancelando === agendamento.id}
                          onClick={() => cancelarAgendamento(agendamento.id)}
                        >
                          {cancelando === agendamento.id
                            ? "Cancelando..."
                            : "Cancelar"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* =====================================
                    HISTÓRICO
                ===================================== */}

                {historico.length > 0 && (
                  <div className="historico-cliente">
                    <h2>📋 Histórico</h2>

                    {historico.map((agendamento) => (
                      <div
                        className={`historico-card ${
                          agendamento.status === "Cancelado"
                            ? "historico-cancelado"
                            : ""
                        }`}
                        key={agendamento.id}
                      >
                        <h3>{agendamento.servico}</h3>

                        <p>📅 {formatarData(agendamento.data)}</p>

                        <p>🕐 {agendamento.horario}</p>

                        <p>
                          💰 R${" "}
                          {Number(agendamento.preco)
                            .toFixed(2)
                            .replace(".", ",")}
                        </p>

                        <p
                          className={
                            agendamento.status === "Cancelado"
                              ? "status-historico-cancelado"
                              : "status-historico-concluido"
                          }
                        >
                          {agendamento.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CancelarAgendamento;
