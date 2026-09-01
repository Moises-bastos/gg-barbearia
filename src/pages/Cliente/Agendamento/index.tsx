import "./style.css";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { horarios } from "../../../data/horarios";
import { supabase } from "../../../lib/supabase";
import { sucesso, erro, aviso } from "../../../utils/toast";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { ptBR } from "date-fns/locale";
import { format, parseISO } from "date-fns";

type BloqueioHorario = {
  id: number;
  data: string;
  motivo: string;
  hora_inicio: string | null;
  hora_fim: string | null;
};

function Agendamento() {
  const location = useLocation();

  const servico = location.state;

  // ==========================================
  // DATA DE HOJE
  // ==========================================

  const dataHoje = format(
    new Date(),
    "yyyy-MM-dd"
  );

  // ==========================================
  // ESTADOS
  // ==========================================

  const [nome, setNome] = useState("");

  const [telefone, setTelefone] = useState("");

  const [dataSelecionada, setDataSelecionada] =
    useState(dataHoje);

  const [horarioSelecionado, setHorarioSelecionado] =
    useState("");

  const [horariosOcupados, setHorariosOcupados] =
    useState<string[]>([]);

  const [bloqueios, setBloqueios] =
    useState<BloqueioHorario[]>([]);

  const [dataBloqueada, setDataBloqueada] =
    useState(false);

  const [linkCancelamento, setLinkCancelamento] =
    useState("");

  // ==========================================
  // BUSCAR DADOS QUANDO A DATA MUDAR
  // ==========================================

  useEffect(() => {
    buscarHorariosOcupados();
    buscarBloqueios();
  }, [dataSelecionada]);

  // ==========================================
  // VERIFICA SERVIÇO
  // ==========================================

  if (!servico) {
    return (
      <h1>
        Nenhum serviço selecionado.
      </h1>
    );
  }

  // ==========================================
  // BUSCAR HORÁRIOS OCUPADOS
  // ==========================================

  async function buscarHorariosOcupados() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("horario")
      .eq("data", dataSelecionada)
      .neq("status", "Cancelado");

    if (error) {
      console.log(error);
      return;
    }

    setHorariosOcupados(
      data?.map(
        (item: { horario: string }) =>
          item.horario
      ) || []
    );
  }

  // ==========================================
  // BUSCAR BLOQUEIOS
  // ==========================================

  async function buscarBloqueios() {
    const { data, error } = await supabase
      .from("dias_bloqueados")
      .select(
        "id, data, motivo, hora_inicio, hora_fim"
      )
      .eq("data", dataSelecionada);

    if (error) {
      console.log(
        "Erro ao buscar bloqueios:",
        error
      );

      setBloqueios([]);
      setDataBloqueada(false);

      return;
    }

    const bloqueiosEncontrados =
      (data as BloqueioHorario[]) || [];

    setBloqueios(bloqueiosEncontrados);

    // ==========================================
    // VERIFICA SE EXISTE BLOQUEIO DO DIA INTEIRO
    // ==========================================

    const bloqueioDiaInteiro =
      bloqueiosEncontrados.some(
        (bloqueio) =>
          bloqueio.hora_inicio === null &&
          bloqueio.hora_fim === null
      );

    setDataBloqueada(
      bloqueioDiaInteiro
    );

    // Caso a data tenha mudado e o horário
    // selecionado tenha ficado bloqueado
    setHorarioSelecionado("");
  }

  // ==========================================
  // VERIFICA SE UM HORÁRIO ESTÁ BLOQUEADO
  // ==========================================

  function horarioEstaBloqueado(
    horario: string
  ) {
    // Se o dia inteiro estiver bloqueado
    if (dataBloqueada) {
      return true;
    }

    const [hora, minuto] =
      horario.split(":").map(Number);

    const horarioEmMinutos =
      hora * 60 + minuto;

    return bloqueios.some((bloqueio) => {
      // Segurança: bloqueio do dia inteiro
      if (
        bloqueio.hora_inicio === null &&
        bloqueio.hora_fim === null
      ) {
        return true;
      }

      if (
        !bloqueio.hora_inicio ||
        !bloqueio.hora_fim
      ) {
        return false;
      }

      const [inicioHora, inicioMinuto] =
        bloqueio.hora_inicio
          .slice(0, 5)
          .split(":")
          .map(Number);

      const [fimHora, fimMinuto] =
        bloqueio.hora_fim
          .slice(0, 5)
          .split(":")
          .map(Number);

      const inicioEmMinutos =
        inicioHora * 60 +
        inicioMinuto;

      const fimEmMinutos =
        fimHora * 60 +
        fimMinuto;

      /*
        Exemplo:

        Bloqueio:
        12:00 até 14:00

        12:00 -> bloqueado
        12:30 -> bloqueado
        13:00 -> bloqueado
        13:30 -> bloqueado
        14:00 -> disponível
      */

      return (
        horarioEmMinutos >=
          inicioEmMinutos &&
        horarioEmMinutos <
          fimEmMinutos
      );
    });
  }

  // ==========================================
  // DATA ATUAL
  // ==========================================

  const agora = new Date();

  // ==========================================
  // DOMINGO
  // ==========================================

  const domingo =
    parseISO(
      dataSelecionada
    ).getDay() === 0;

  // ==========================================
  // HORÁRIO ATUAL
  // ==========================================

  const horarioAtual =
    agora.getHours() * 60 +
    agora.getMinutes();

  // ==========================================
  // DIA DA SEMANA
  // ==========================================

  const diaSemana =
    parseISO(
      dataSelecionada
    ).getDay();

  // ==========================================
  // HORÁRIO DE ALMOÇO
  // ==========================================

  const horariosAlmoco =
    diaSemana === 6
      ? [
          "12:00",
          "12:30",
          "13:00",
        ]
      : [
          "12:00",
          "12:30",
          "13:00",
          "13:30",
        ];

  // ==========================================
  // HORÁRIOS DISPONÍVEIS
  // ==========================================

  const horariosDisponiveis =
    horarios.filter((horario) => {

      // ----------------------------------------
      // HORÁRIO JÁ AGENDADO
      // ----------------------------------------

      if (
        horariosOcupados.includes(
          horario
        )
      ) {
        return false;
      }

      // ----------------------------------------
      // HORÁRIO DE ALMOÇO
      // ----------------------------------------

      if (
        horariosAlmoco.includes(
          horario
        )
      ) {
        return false;
      }

      // ----------------------------------------
      // BLOQUEIO DO BARBEIRO
      // ----------------------------------------

      if (
        horarioEstaBloqueado(
          horario
        )
      ) {
        return false;
      }

      // ----------------------------------------
      // CONVERTE HORÁRIO PARA MINUTOS
      // ----------------------------------------

      const [hora, minuto] =
        horario
          .split(":")
          .map(Number);

      const horarioEmMinutos =
        hora * 60 + minuto;

      // ----------------------------------------
      // DATA FUTURA
      // ----------------------------------------

      if (
        dataSelecionada !==
        dataHoje
      ) {
        return true;
      }

      // ----------------------------------------
      // HOJE
      // ----------------------------------------

      return (
        horarioEmMinutos >
        horarioAtual
      );
    });

  // ==========================================
  // FORMATAR TELEFONE
  // ==========================================

  function formatarTelefone(
    valor: string
  ) {
    const numeros =
      valor.replace(
        /\D/g,
        ""
      );

    if (
      numeros.length <= 2
    ) {
      return numeros;
    }

    if (
      numeros.length <= 7
    ) {
      return `(${numeros.slice(
        0,
        2
      )}) ${numeros.slice(2)}`;
    }

    return `(${numeros.slice(
      0,
      2
    )}) ${numeros.slice(
      2,
      7
    )}-${numeros.slice(
      7,
      11
    )}`;
  }

  // ==========================================
  // VALIDAR NOME
  // ==========================================

  function validarNome(
    nome: string
  ) {
    const nomeLimpo =
      nome.trim();

    if (
      nomeLimpo.length < 3
    ) {
      return (
        "Digite um nome com pelo menos 3 letras."
      );
    }

    if (
      nomeLimpo.length > 60
    ) {
      return (
        "Nome muito grande."
      );
    }

    const regex =
      /^[A-Za-zÀ-ÿ\s]+$/;

    if (
      !regex.test(
        nomeLimpo
      )
    ) {
      return (
        "O nome deve conter apenas letras."
      );
    }

    return null;
  }

  // ==========================================
  // CONFIRMAR AGENDAMENTO
  // ==========================================

  async function confirmarAgendamento() {

    // ========================================
    // VERIFICA BLOQUEIO DO DIA
    // ========================================

    if (
      dataBloqueada
    ) {
      aviso(
        "Esta data está bloqueada pelo barbeiro."
      );

      return;
    }

    // ========================================
    // VERIFICA SE O HORÁRIO FOI BLOQUEADO
    // ========================================

    if (
      horarioSelecionado &&
      horarioEstaBloqueado(
        horarioSelecionado
      )
    ) {
      aviso(
        "Esse horário não está disponível."
      );

      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // VERIFICA DOMINGO
    // ========================================

    if (domingo) {
      aviso(
        "A GG Barbearia não funciona aos domingos."
      );

      return;
    }

    // ========================================
    // VALIDA NOME
    // ========================================

    const erroNome =
      validarNome(nome);

    if (erroNome) {
      aviso(erroNome);

      return;
    }

    // ========================================
    // VALIDA TELEFONE
    // ========================================

    const telefoneLimpo =
      telefone.replace(
        /\D/g,
        ""
      );

    if (
      telefoneLimpo.length !==
      11
    ) {
      aviso(
        "Digite um telefone válido."
      );

      return;
    }

    // ========================================
    // VALIDA HORÁRIO
    // ========================================

    if (
      !horarioSelecionado
    ) {
      aviso(
        "Escolha um horário."
      );

      return;
    }

    // ========================================
    // VERIFICA HORÁRIO NOVAMENTE
    // ========================================

    const {
      data: bloqueiosAtualizados,
    } = await supabase
      .from("dias_bloqueados")
      .select(
        "id, data, motivo, hora_inicio, hora_fim"
      )
      .eq(
        "data",
        dataSelecionada
      );

    const bloqueiosAtuais =
      (bloqueiosAtualizados as BloqueioHorario[]) ||
      [];

    const diaInteiroAtual =
      bloqueiosAtuais.some(
        (bloqueio) =>
          bloqueio.hora_inicio === null &&
          bloqueio.hora_fim === null
      );

    if (
      diaInteiroAtual
    ) {
      aviso(
        "O barbeiro bloqueou esta data."
      );

      setDataBloqueada(true);
      setBloqueios(
        bloqueiosAtuais
      );
      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // VERIFICA BLOQUEIO DO HORÁRIO
    // ========================================

    const horarioBloqueadoAgora =
      bloqueiosAtuais.some(
        (bloqueio) => {

          if (
            bloqueio.hora_inicio === null &&
            bloqueio.hora_fim === null
          ) {
            return true;
          }

          if (
            !bloqueio.hora_inicio ||
            !bloqueio.hora_fim
          ) {
            return false;
          }

          const [horaInicio, minutoInicio] =
            bloqueio.hora_inicio
              .slice(0, 5)
              .split(":")
              .map(Number);

          const [horaFim, minutoFim] =
            bloqueio.hora_fim
              .slice(0, 5)
              .split(":")
              .map(Number);

          const [hora, minuto] =
            horarioSelecionado
              .split(":")
              .map(Number);

          const inicio =
            horaInicio * 60 +
            minutoInicio;

          const fim =
            horaFim * 60 +
            minutoFim;

          const horario =
            hora * 60 +
            minuto;

          return (
            horario >= inicio &&
            horario < fim
          );
        }
      );

    if (
      horarioBloqueadoAgora
    ) {
      aviso(
        "Esse horário foi bloqueado pelo barbeiro."
      );

      setBloqueios(
        bloqueiosAtuais
      );

      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // VERIFICA SE O HORÁRIO JÁ FOI AGENDADO
    // ========================================

    const {
      data: existente,
    } = await supabase
      .from("agendamentos")
      .select("id")
      .eq(
        "data",
        dataSelecionada
      )
      .eq(
        "horario",
        horarioSelecionado
      )
      .neq(
        "status",
        "Cancelado"
      );

    if (
      existente &&
      existente.length > 0
    ) {
      erro(
        "Esse horário já foi agendado."
      );

      buscarHorariosOcupados();

      return;
    }

    // ========================================
    // CRIA AGENDAMENTO
    // ========================================

    const {
      data: novoAgendamento,
      error: insertError,
    } = await supabase
      .from("agendamentos")
      .insert([
        {
          nome,

          telefone:
            telefoneLimpo,

          servico:
            servico.nome,

          preco:
            Number(
              servico.preco
                .replace("R$", "")
                .replace(",", ".")
            ),

          horario:
            horarioSelecionado,

          data:
            dataSelecionada,

          status:
            "Pendente",
        },
      ])
      .select("id")
      .single();

    if (
      insertError
    ) {
      console.log(
        insertError
      );

      erro(
        "Erro ao salvar agendamento."
      );

      return;
    }

    if (
      !novoAgendamento
    ) {
      erro(
        "Não foi possível identificar o agendamento."
      );

      return;
    }

    // ========================================
    // LINK DE CANCELAMENTO
    // ========================================

    const link =
      `${window.location.origin}/cancelar-agendamento?id=${novoAgendamento.id}`;

    console.log(
      "LINK:",
      link
    );

    setLinkCancelamento(
      link
    );

    // ========================================
    // SUCESSO
    // ========================================

    sucesso(
      "Agendamento realizado com sucesso!"
    );

    // ========================================
    // LIMPA CAMPOS
    // ========================================

    setNome("");

    setTelefone("");

    setHorarioSelecionado("");

    // ========================================
    // VOLTA PARA HOJE
    // ========================================

    setDataSelecionada(
      dataHoje
    );

    buscarHorariosOcupados();
  }

  // ==========================================
  // TELA
  // ==========================================

  return (
    <div className="agendamento">

      <div className="agendamento-card">

        <h1>
          Agendamento
        </h1>

        {/* ================================= */}
        {/* SERVIÇO */}
        {/* ================================= */}

        <div className="info-servico">

          <h2>
            {servico.nome}
          </h2>

          <p>
            Preço:{" "}
            {servico.preco}
          </p>

          <p>
            Duração:{" "}
            {servico.duracao}
          </p>

        </div>

        {/* ================================= */}
        {/* NOME */}
        {/* ================================= */}

        <div className="input-group">

          <label>
            Nome
          </label>

          <input
            type="text"
            placeholder="Digite seu nome"
            value={nome}
            maxLength={60}
            onChange={(e) => {

              const valor =
                e.target.value.replace(
                  /\s{2,}/g,
                  " "
                );

              setNome(
                valor
              );

            }}
          />

        </div>

        {/* ================================= */}
        {/* TELEFONE */}
        {/* ================================= */}

        <div className="input-group">

          <label>
            Telefone
          </label>

          <input
            type="tel"
            placeholder="(99) 99999-9999"
            value={telefone}
            maxLength={15}
            onChange={(e) =>
              setTelefone(
                formatarTelefone(
                  e.target.value
                )
              )
            }
          />

        </div>

        {/* ================================= */}
        {/* DATA */}
        {/* ================================= */}

        <div className="input-group">

          <label>
            Data
          </label>

          <DatePicker

            selected={
              parseISO(
                dataSelecionada
              )
            }

            onChange={(
              date: Date | null
            ) => {

              if (!date) {
                return;
              }

              const data =
                format(
                  date,
                  "yyyy-MM-dd"
                );

              setDataSelecionada(
                data
              );

              setHorarioSelecionado(
                ""
              );

            }}

            minDate={
              new Date()
            }

            locale={ptBR}

            dateFormat="dd/MM/yyyy"

            placeholderText={
              "Selecione uma data"
            }

            filterDate={(
              date
            ) =>
              date.getDay() !==
              0
            }

          />

        </div>

        {/* ================================= */}
        {/* HORÁRIOS */}
        {/* ================================= */}

        <h3>
          Escolha um horário
        </h3>

        {domingo ? (

          <p className="sem-horarios">
            A GG Barbearia não funciona
            aos domingos.
          </p>

        ) : dataBloqueada ? (

          <p className="sem-horarios">
            O barbeiro não atenderá
            nesta data.
          </p>

        ) : horariosDisponiveis.length === 0 ? (

          <p className="sem-horarios">
            Não há horários disponíveis
            para esta data.
          </p>

        ) : (

          <div className="horarios">

            {horariosDisponiveis.map(
              (horario) => (

                <button
                  key={horario}
                  type="button"

                  className={
                    horarioSelecionado ===
                    horario
                      ? "horario ativo"
                      : "horario"
                  }

                  onClick={() =>
                    setHorarioSelecionado(
                      horario
                    )
                  }
                >
                  {horario}
                </button>

              )
            )}

          </div>

        )}

        {/* ================================= */}
        {/* CONFIRMAR */}
        {/* ================================= */}

        <button
          className="botao-confirmar"

          onClick={
            confirmarAgendamento
          }

          disabled={
            domingo ||
            dataBloqueada ||
            !horarioSelecionado
          }
        >
          Confirmar Agendamento
        </button>

        {/* ================================= */}
        {/* CANCELAMENTO */}
        {/* ================================= */}

        {linkCancelamento && (

          <div className="cancelamento">

            <p>
              Precisa cancelar
              seu agendamento?
            </p>

            <a
              href={
                linkCancelamento
              }

              target="_blank"

              rel="noopener noreferrer"
            >
              Cancelar agendamento
            </a>

          </div>

        )}

      </div>

    </div>
  );
}

export default Agendamento;