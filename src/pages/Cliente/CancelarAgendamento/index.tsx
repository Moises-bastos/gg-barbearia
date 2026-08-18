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
    horario: string;
    data: string;
    status: string;
};

function CancelarAgendamento() {
    const [searchParams] = useSearchParams();

    const id = searchParams.get("id");

    const [agendamento, setAgendamento] =
        useState<Agendamento | null>(null);

    const [carregando, setCarregando] = useState(true);
    const [cancelando, setCancelando] = useState(false);
    const [telefone, setTelefone] = useState("");

    useEffect(() => {
        buscarAgendamento();
    }, []);

    async function buscarAgendamento() {
        if (!id) {
            setCarregando(false);
            return;
        }

        const { data, error } = await supabase
            .from("agendamentos")
            .select(
                "id, nome, telefone, servico, horario, data, status"
            )
            .eq("id", id)
            .single();

        if (error) {
            console.log(error);
            setCarregando(false);
            return;
        }

        setAgendamento(data);
        setCarregando(false);
    }

    async function cancelarAgendamento() {
        if (!agendamento) return;

        if (agendamento.status === "Cancelado") {
            aviso("Este agendamento já foi cancelado.");
            return;
        }

        const telefoneDigitado = telefone.replace(/\D/g, "");
        const telefoneAgendamento =
            agendamento.telefone.replace(/\D/g, "");

        if (telefoneDigitado.length !== 11) {
            aviso("Digite um telefone válido.");
            return;
        }

        if (telefoneDigitado !== telefoneAgendamento) {
            erro("O telefone não corresponde ao agendamento.");
            return;
        }

        setCancelando(true);

        const { error } = await supabase
            .from("agendamentos")
            .update({
                status: "Cancelado",
            })
            .eq("id", agendamento.id);

        if (error) {
            console.log(error);
            erro("Não foi possível cancelar o agendamento.");
            setCancelando(false);
            return;
        }

        sucesso("Agendamento cancelado com sucesso!");

        setAgendamento({
            ...agendamento,
            status: "Cancelado",
        });

        setCancelando(false);
    }

    if (carregando) {
        return <p>Carregando agendamento...</p>;
    }

    if (!agendamento) {
        return (
            <div>
                <h1>Agendamento não encontrado</h1>
                <p>
                    Não encontramos um agendamento com este código.
                </p>
            </div>
        );
    }

return (
  <div className="cancelamento-page">
    <div className="cancelamento-card">

      <h1>Cancelar agendamento</h1>

      <p className="cancelamento-subtitulo">
        Confira os dados do seu agendamento antes de cancelar.
      </p>

      <div className="dados-agendamento">

        <div className="dado">
          <span>👤 Cliente</span>
          <strong>{agendamento.nome}</strong>
        </div>

        <div className="dado">
          <span>💈 Serviço</span>
          <strong>{agendamento.servico}</strong>
        </div>

        <div className="dado">
          <span>📅 Data</span>
          <strong>{agendamento.data}</strong>
        </div>

        <div className="dado">
          <span>🕒 Horário</span>
          <strong>{agendamento.horario}</strong>
        </div>

      </div>

      {agendamento.status === "Cancelado" ? (

        <div className="cancelamento-finalizado">
          <span>✓</span>

          <h2>Agendamento já cancelado</h2>

          <p>
            Este agendamento não está mais ativo.
          </p>
        </div>

      ) : (

        <div className="area-cancelamento">

          <label>
            Telefone usado no agendamento
          </label>

          <input
            type="tel"
            placeholder="(99) 99999-9999"
            value={telefone}
            onChange={(e) =>
              setTelefone(e.target.value)
            }
          />

          <p className="aviso-cancelamento">
            O telefone será usado para confirmar que
            este agendamento pertence a você.
          </p>

          <button
            className="botao-cancelar"
            onClick={cancelarAgendamento}
            disabled={cancelando}
          >
            {cancelando
              ? "Cancelando..."
              : "Cancelar agendamento"}
          </button>

          <p className="cancelamento-info">
            Essa ação não poderá ser desfeita.
          </p>

        </div>

      )}

    </div>
  </div>
);
}

export default CancelarAgendamento;