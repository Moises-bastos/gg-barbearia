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

function Agendamento() {
  const location = useLocation();
  const servico = location.state;

  // Data de hoje no formato yyyy-MM-dd,
  // usando o horário local.
  const dataHoje = format(new Date(), "yyyy-MM-dd");

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const [dataSelecionada, setDataSelecionada] =
    useState(dataHoje);

  const [horarioSelecionado, setHorarioSelecionado] =
    useState("");

  const [horariosOcupados, setHorariosOcupados] =
    useState<string[]>([]);

  const [dataBloqueada, setDataBloqueada] =
    useState(false);

  const [linkCancelamento, setLinkCancelamento] =
    useState("");

  useEffect(() => {
    buscarHorariosOcupados();
    verificarDataBloqueada();
  }, [dataSelecionada]);

  if (!servico) {
    return <h1>Nenhum serviço selecionado.</h1>;
  }

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
      data.map((item: any) => item.horario)
    );
  }

  async function verificarDataBloqueada() {
    const { data } = await supabase
      .from("dias_bloqueados")
      .select("id")
      .eq("data", dataSelecionada)
      .maybeSingle();

    console.log("Resultado:", data);

    setDataBloqueada(!!data);
  }

  const agora = new Date();

  /*
    Usamos parseISO para evitar problemas de fuso horário.
  */
  const domingo =
    parseISO(dataSelecionada).getDay() === 0;

  const horarioAtual =
    agora.getHours() * 60 + agora.getMinutes();

  // 0 = domingo
  // 6 = sábado
  const diaSemana =
    parseISO(dataSelecionada).getDay();

  /*
    Horário de almoço:

    Segunda a sexta:
    12:00
    12:30
    13:00
    13:30

    Sábado:
    12:00
    12:30
    13:00
  */
  const horariosAlmoco =
    diaSemana === 6
      ? ["12:00", "12:30", "13:00"]
      : ["12:00", "12:30", "13:00", "13:30"];

  const horariosDisponiveis =
    horarios.filter((horario) => {

      // Horário já agendado
      if (horariosOcupados.includes(horario)) {
        return false;
      }

      // Horário de almoço
      if (horariosAlmoco.includes(horario)) {
        return false;
      }

      const [hora, minuto] =
        horario.split(":").map(Number);

      const horarioEmMinutos =
        hora * 60 + minuto;

      /*
        Se for uma data futura,
        mostra os horários normalmente.
      */
      if (dataSelecionada !== dataHoje) {
        return true;
      }

      /*
        Se for hoje,
        mostra somente horários que ainda não passaram.
      */
      return horarioEmMinutos > horarioAtual;
    });

  function formatarTelefone(valor: string) {
    const numeros =
      valor.replace(/\D/g, "");

    if (numeros.length <= 2) {
      return numeros;
    }

    if (numeros.length <= 7) {
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
    )}-${numeros.slice(7, 11)}`;
  }

  function validarNome(nome: string) {
    const nomeLimpo = nome.trim();

    // Mínimo de 3 caracteres
    if (nomeLimpo.length < 3) {
      return "Digite um nome com pelo menos 3 letras.";
    }

    // Máximo de 60 caracteres
    if (nomeLimpo.length > 60) {
      return "Nome muito grande.";
    }

    // Apenas letras e espaços
    const regex =
      /^[A-Za-zÀ-ÿ\s]+$/;

    if (!regex.test(nomeLimpo)) {
      return "O nome deve conter apenas letras.";
    }

    return null;
  }

  async function confirmarAgendamento() {

    // Verifica se a data está bloqueada
    if (dataBloqueada) {
      aviso(
        "Esta data está bloqueada pelo barbeiro."
      );
      return;
    }

    // Verifica domingo
    if (domingo) {
      aviso(
        "A GG Barbearia não funciona aos domingos."
      );
      return;
    }

    // Valida nome
    const erroNome =
      validarNome(nome);

    if (erroNome) {
      aviso(erroNome);
      return;
    }

    // Valida telefone
    const telefoneLimpo =
      telefone.replace(/\D/g, "");

    if (telefoneLimpo.length !== 11) {
      aviso(
        "Digite um telefone válido."
      );
      return;
    }

    // Verifica horário
    if (!horarioSelecionado) {
      aviso(
        "Escolha um horário."
      );
      return;
    }

    // Verifica se o horário já foi ocupado
    const { data: existente } =
      await supabase
        .from("agendamentos")
        .select("id")
        .eq("data", dataSelecionada)
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

    // Cria o agendamento
    const {
      data: novoAgendamento,
      error: insertError,
    } = await supabase
      .from("agendamentos")
      .insert([
        {
          nome,
          telefone,
          servico: servico.nome,

          preco: Number(
            servico.preco
              .replace("R$", "")
              .replace(",", ".")
          ),

          horario:
            horarioSelecionado,

          data:
            dataSelecionada,

          status: "Pendente",
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      console.log(insertError);

      erro(
        "Erro ao salvar agendamento."
      );

      return;
    }

    if (!novoAgendamento) {
      erro(
        "Não foi possível identificar o agendamento."
      );

      return;
    }

    /*
      Gera o link de cancelamento
      usando o ID do agendamento.
    */
    const link =
      `${window.location.origin}/cancelar-agendamento?id=${novoAgendamento.id}`;

    console.log(
      "LINK:",
      link
    );

    setLinkCancelamento(link);

    sucesso(
      "Agendamento realizado com sucesso!"
    );

    // Limpa os campos
    setNome("");
    setTelefone("");
    setHorarioSelecionado("");

    /*
      Volta para a data de hoje
      sem problema de fuso horário.
    */
    setDataSelecionada(dataHoje);

    buscarHorariosOcupados();
  }

  return (
    <div className="agendamento">
      <div className="agendamento-card">

        <h1>Agendamento</h1>

        <div className="info-servico">

          <h2>
            {servico.nome}
          </h2>

          <p>
            Preço: {servico.preco}
          </p>

          <p>
            Duração: {servico.duracao}
          </p>

        </div>

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

              setNome(valor);

            }}
          />

        </div>

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

        <div className="input-group">

          <label>
            Data
          </label>

          <DatePicker
            /*
              parseISO evita que o
              calendário volte um dia.
            */
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

              /*
                format mantém a data
                no horário local.
              */
              const data =
                format(
                  date,
                  "yyyy-MM-dd"
                );

              setDataSelecionada(
                data
              );

              // Ao mudar a data,
              // limpa o horário selecionado.
              setHorarioSelecionado("");
            }}

            minDate={new Date()}

            locale={ptBR}

            dateFormat="dd/MM/yyyy"

            placeholderText={
              "Selecione uma data"
            }

            /*
              Domingo fica bloqueado.
            */
            filterDate={(date) =>
              date.getDay() !== 0
            }
          />

        </div>

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

        <button
          className="botao-confirmar"

          onClick={
            confirmarAgendamento
          }

          disabled={
            domingo ||
            dataBloqueada
          }
        >
          Confirmar Agendamento
        </button>

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