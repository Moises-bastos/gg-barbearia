import "./style.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { sucesso, erro } from "../../../utils/toast";

type DiaBloqueado = {
  id: number;
  data: string;
  motivo: string;
  hora_inicio: string | null;
  hora_fim: string | null;
};

function DiasBloqueados() {
  const [dias, setDias] = useState<DiaBloqueado[]>([]);

  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");

  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");

  const [diaInteiro, setDiaInteiro] = useState(false);

  useEffect(() => {
    buscarDias();
  }, []);

  async function buscarDias() {
    const { data, error } = await supabase
      .from("dias_bloqueados")
      .select("*")
      .order("data")
      .order("hora_inicio");

    if (error) {
      console.log(error);
      erro("Erro ao buscar dias bloqueados.");
      return;
    }

    setDias((data as DiaBloqueado[]) || []);
  }

  async function bloquearData() {
    if (!data) {
      erro("Escolha uma data.");
      return;
    }

    // Se não for dia inteiro, os dois horários são obrigatórios
    if (!diaInteiro && (!horaInicio || !horaFim)) {
      erro("Informe o horário inicial e final.");
      return;
    }

    // Verifica se o horário final é maior que o inicial
    if (!diaInteiro && horaInicio >= horaFim) {
      erro("O horário final deve ser maior que o inicial.");
      return;
    }

    // Busca todos os bloqueios existentes nessa data
    const { data: existentes, error: erroBusca } = await supabase
      .from("dias_bloqueados")
      .select("id, hora_inicio, hora_fim")
      .eq("data", data);

    if (erroBusca) {
      console.log("Erro ao verificar data:", erroBusca);
      erro("Não foi possível verificar a data.");
      return;
    }

    /*
      ==========================================
      BLOQUEIO DO DIA INTEIRO
      ==========================================
    */

    if (diaInteiro) {
      // Se já existe qualquer bloqueio nessa data,
      // não permite bloquear o dia inteiro.
      if (existentes && existentes.length > 0) {
        erro("Já existem bloqueios cadastrados nessa data.");
        return;
      }
    }

    /*
      ==========================================
      BLOQUEIO DE HORÁRIO
      ==========================================
    */

    else {
      const conflito = existentes?.some((item) => {
        // Se o dia inteiro já estiver bloqueado,
        // nenhum horário pode ser adicionado.
        if (
          item.hora_inicio === null &&
          item.hora_fim === null
        ) {
          return true;
        }

        // Segurança caso apenas um dos horários esteja vazio
        if (!item.hora_inicio || !item.hora_fim) {
          return false;
        }

        /*
          Verifica sobreposição.

          Exemplo já cadastrado:
          12:00 - 14:00

          Novo:
          13:00 - 15:00

          Existe conflito.
        */

        return (
          horaInicio < item.hora_fim &&
          horaFim > item.hora_inicio
        );
      });

      if (conflito) {
        erro("Esse período já está bloqueado ou entra em conflito.");
        return;
      }
    }

    /*
      ==========================================
      SALVAR BLOQUEIO
      ==========================================
    */

    const { error } = await supabase
      .from("dias_bloqueados")
      .insert([
        {
          data,
          motivo,
          hora_inicio: diaInteiro ? null : horaInicio,
          hora_fim: diaInteiro ? null : horaFim,
        },
      ]);

    if (error) {
      console.log("Erro ao bloquear:", error);

      erro("Não foi possível bloquear o período.");
      return;
    }

    sucesso(
      diaInteiro
        ? "Dia inteiro bloqueado!"
        : "Horário bloqueado!"
    );

    // Limpa o formulário
    setData("");
    setMotivo("");
    setHoraInicio("");
    setHoraFim("");
    setDiaInteiro(false);

    // Atualiza a lista
    buscarDias();
  }

  async function remover(id: number) {
    const { error } = await supabase
      .from("dias_bloqueados")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      erro("Não foi possível liberar.");
      return;
    }

    sucesso("Bloqueio liberado!");

    buscarDias();
  }

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  return (
    <div className="dias-page">

      <h1>Dias Bloqueados</h1>

      <div className="novo-dia">

        {/* DATA */}
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />

        {/* DIA INTEIRO */}
        <label className="checkbox-dia">

          <input
            type="checkbox"
            checked={diaInteiro}
            onChange={(e) => {
              setDiaInteiro(e.target.checked);

              if (e.target.checked) {
                setHoraInicio("");
                setHoraFim("");
              }
            }}
          />

          Bloquear o dia inteiro

        </label>

        {/* HORÁRIOS */}
        {!diaInteiro && (
          <>
            <div className="campo-horario">

              <label>
                Início
              </label>

              <input
                type="time"
                value={horaInicio}
                onChange={(e) =>
                  setHoraInicio(e.target.value)
                }
              />

            </div>

            <div className="campo-horario">

              <label>
                Fim
              </label>

              <input
                type="time"
                value={horaFim}
                onChange={(e) =>
                  setHoraFim(e.target.value)
                }
              />

            </div>
          </>
        )}

        {/* MOTIVO */}
        <input
          type="text"
          placeholder="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />

        {/* BOTÃO */}
        <button
          type="button"
          onClick={bloquearData}
        >
          🔒 Bloquear
        </button>

      </div>

      {/* LISTA DOS BLOQUEIOS */}

      <table>

        <thead>

          <tr>

            <th>
              Data
            </th>

            <th>
              Horário
            </th>

            <th>
              Motivo
            </th>

            <th>
              
            </th>

          </tr>

        </thead>

        <tbody>

          {dias.map((dia) => (

            <tr key={dia.id}>

              <td>
                {formatarData(dia.data)}
              </td>

              <td>

                {dia.hora_inicio === null &&
                dia.hora_fim === null ? (

                  <strong>
                    Dia inteiro
                  </strong>

                ) : (

                  `${dia.hora_inicio?.slice(0, 5)} - ${dia.hora_fim?.slice(0, 5)}`

                )}

              </td>

              <td>
                {dia.motivo || "-"}
              </td>

              <td>

                <button
                  type="button"
                  className="remover"
                  onClick={() =>
                    remover(dia.id)
                  }
                >
                  Liberar
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default DiasBloqueados;