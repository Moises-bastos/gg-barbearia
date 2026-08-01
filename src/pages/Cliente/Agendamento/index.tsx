import "./style.css";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { horarios } from "../../../data/horarios";
import { supabase } from "../../../lib/supabase";
import { sucesso, erro, aviso } from "../../../utils/toast";

function Agendamento() {
  const location = useLocation();
  const servico = location.state;

  const dataHoje = new Date().toISOString().split("T")[0];

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

  const domingo =
    new Date(dataSelecionada).getDay() === 0;

  const horarioAtual =
    agora.getHours() * 60 + agora.getMinutes();

  const horariosDisponiveis = horarios.filter(
    (horario) => {
      if (horariosOcupados.includes(horario)) {
        return false;
      }

      const [hora, minuto] = horario
        .split(":")
        .map(Number);

      const horarioEmMinutos =
        hora * 60 + minuto;

      if (dataSelecionada !== dataHoje) {
        return true;
      }

      return horarioEmMinutos > horarioAtual;
    }
  );

  function formatarTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "");

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

    // mínimo de 3 letras
    if (nomeLimpo.length < 3) {
      return "Digite um nome com pelo menos 3 letras.";
    }

    // máximo de 60 caracteres
    if (nomeLimpo.length > 60) {
      return "Nome muito grande.";
    }

    // apenas letras e espaços
    const regex = /^[A-Za-zÀ-ÿ\s]+$/;

    if (!regex.test(nomeLimpo)) {
      return "O nome deve conter apenas letras.";
    }

    return null;
  }

  async function confirmarAgendamento() {
    if (dataBloqueada) {
      aviso("Esta data está bloqueada pelo barbeiro.");
      return;
    }

    if (domingo) {
      aviso("A GG Barbearia não funciona aos domingos.");
      return;
    }

    const erroNome = validarNome(nome);

    if (erroNome) {
      aviso(erroNome);
      return;
    }


    const telefoneLimpo = telefone.replace(/\D/g, "");

    if (telefoneLimpo.length !== 11) {
      aviso("Digite um telefone válido.");
      return;
    }

    if (!horarioSelecionado) {
      aviso("Escolha um horário.");
      return;
    }

    const { data: existente } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("data", dataSelecionada)
      .eq("horario", horarioSelecionado)
      .neq("status", "Cancelado");

    if (existente && existente.length > 0) {
      erro("Esse horário já foi agendado.");
      buscarHorariosOcupados();
      return;
    }

    const { error: insertError } = await supabase
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
          horario: horarioSelecionado,
          data: dataSelecionada,
          status: "Pendente",
        },
      ]);

    if (insertError) {
      console.log(insertError);
      erro("Erro ao salvar agendamento.");
      return;
    }

    sucesso("Agendamento realizado com sucesso!");

    setNome("");
    setTelefone("");
    setHorarioSelecionado("");
    setDataSelecionada(dataHoje);

    buscarHorariosOcupados();
  }

  return (
    <div className="agendamento">
      <div className="agendamento-card">

        <h1>Agendamento</h1>

        <div className="info-servico">
          <h2>{servico.nome}</h2>

          <p>Preço: {servico.preco}</p>

          <p>Duração: {servico.duracao}</p>
        </div>

        <div className="input-group">
          <label>Nome</label>

          <input
            type="text"
            placeholder="Digite seu nome"
            value={nome}
            maxLength={60}
            onChange={(e) => {

              const valor = e.target.value.replace(/\s{2,}/g, " ");

              setNome(valor);

            }}
          />
        </div>

        <div className="input-group">
          <label>Telefone</label>

          <input
            type="tel"
            placeholder="(99) 99999-9999"
            value={telefone}
            maxLength={15}
            onChange={(e) =>
              setTelefone(
                formatarTelefone(e.target.value)
              )
            }
          />
        </div>

        <div className="input-group">
          <label>Data</label>

          <input
            type="date"
            value={dataSelecionada}
            min={dataHoje}
            onChange={(e) =>
              setDataSelecionada(e.target.value)
            }
          />
        </div>

        <h3>Escolha um horário</h3>
        {domingo ? (

          <p className="sem-horarios">
            A GG Barbearia não funciona aos domingos.
          </p>

        ) : dataBloqueada ? (

          <p className="sem-horarios">
            O barbeiro não atenderá nesta data.
          </p>

        ) : horariosDisponiveis.length === 0 ? (

          <p className="sem-horarios">
            Não há horários disponíveis para esta data.
          </p>

        ) : (

          <div className="horarios">
            {horariosDisponiveis.map((horario) => (
              <button
                key={horario}
                type="button"
                className={
                  horarioSelecionado === horario
                    ? "horario ativo"
                    : "horario"
                }
                onClick={() =>
                  setHorarioSelecionado(horario)
                }
              >
                {horario}
              </button>
            ))}
          </div>

        )}

        <button
          className="botao-confirmar"
          onClick={confirmarAgendamento}
          disabled={domingo || dataBloqueada}
        >
          Confirmar Agendamento
        </button>

      </div>
    </div>
  );
}

export default Agendamento;