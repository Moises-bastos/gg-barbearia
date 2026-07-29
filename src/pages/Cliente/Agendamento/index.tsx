import "./style.css";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { horarios } from "../../../data/horarios";
import { supabase } from "../../../lib/supabase";

function Agendamento() {
  const location = useLocation();

  const servico = location.state;

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);

  const dataHoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    buscarHorariosOcupados();
  }, []);

  if (!servico) {
    return <h1>Nenhum serviço selecionado.</h1>;
  }

  async function buscarHorariosOcupados() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("horario")
      .eq("data", dataHoje)
      .neq("status", "Cancelado");

    if (error) {
      console.log(error);
      return;
    }

    setHorariosOcupados(
      data.map((item: any) => item.horario)
    );
  }

  const agora = new Date();

  const horarioAtual =
    agora.getHours() * 60 + agora.getMinutes();

  const horariosDisponiveis = horarios.filter((horario) => {

    if (horariosOcupados.includes(horario)) {
      return false;
    }

    const [hora, minuto] = horario.split(":").map(Number);

    const horarioEmMinutos = hora * 60 + minuto;

    return horarioEmMinutos > horarioAtual;
  });

  async function confirmarAgendamento() {

    if (!nome.trim()) {
      alert("Digite seu nome.");
      return;
    }

    if (!telefone.trim()) {
      alert("Digite seu telefone.");
      return;
    }

    if (!horarioSelecionado) {
      alert("Escolha um horário.");
      return;
    }

    const { data: existente } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("data", dataHoje)
      .eq("horario", horarioSelecionado)
      .neq("status", "Cancelado");

    if (existente && existente.length > 0) {
      alert("Esse horário já foi agendado.");
      buscarHorariosOcupados();
      return;
    }

    const { error } = await supabase
      .from("agendamentos")
      .insert([
        {
          nome: nome,
          telefone: telefone,
          servico: servico.nome,
          preco: Number(
            servico.preco
              .replace("R$", "")
              .replace(",", ".")
          ),
          horario: horarioSelecionado,
          data: dataHoje,
          status: "Pendente",
        },
      ]);

    if (error) {
      console.log(error);
      alert("Erro ao salvar agendamento.");
      return;
    }

    alert("Agendamento realizado com sucesso!");

    setNome("");
    setTelefone("");
    setHorarioSelecionado("");

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
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Telefone</label>

          <input
            type="tel"
            placeholder="(99) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <h3>Escolha um horário</h3>

        {horariosDisponiveis.length === 0 ? (
          <p className="sem-horarios">
            Hoje não há mais horários disponíveis.
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
                onClick={() => setHorarioSelecionado(horario)}
              >
                {horario}
              </button>
            ))}
          </div>
        )}

        <button
          className="botao-confirmar"
          onClick={confirmarAgendamento}
        >
          Confirmar Agendamento
        </button>

      </div>
    </div>
  );
}

export default Agendamento;