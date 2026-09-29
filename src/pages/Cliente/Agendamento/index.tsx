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

type AgendamentoExistente = {
  horario: string;
  servico: string;
  duracao: number | null;
};

function Agendamento() {
  const location = useLocation();

  const servico = location.state;

  // ==========================================
  // DATA DE HOJE
  // ==========================================

  const dataHoje = format(new Date(), "yyyy-MM-dd");

  // ==========================================
  // ESTADOS
  // ==========================================

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const [lembrarDados, setLembrarDados] = useState(false);

  const [dataSelecionada, setDataSelecionada] = useState(dataHoje);

  const [horarioSelecionado, setHorarioSelecionado] = useState("");

  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(false);

  const [agendamentosExistentes, setAgendamentosExistentes] = useState<
    AgendamentoExistente[]
  >([]);

  const [bloqueios, setBloqueios] = useState<BloqueioHorario[]>([]);

  const [dataBloqueada, setDataBloqueada] = useState(false);

  const [linkCancelamento, setLinkCancelamento] = useState("");

  // ==========================================
  // BUSCAR DADOS QUANDO A DATA MUDAR
  // ==========================================

  useEffect(() => {
    buscarAgendamentos();
    buscarBloqueios();
  }, [dataSelecionada]);

  // ==========================================
  // CARREGAR DADOS SALVOS
  // ==========================================

  useEffect(() => {
    const dadosSalvos = localStorage.getItem("gg_cliente");

    if (!dadosSalvos) return;

    try {
      const cliente = JSON.parse(dadosSalvos);

      setNome(cliente.nome || "");
      setTelefone(cliente.telefone || "");
      setLembrarDados(true);
    } catch (error) {
      console.log("Erro ao carregar dados salvos:", error);

      localStorage.removeItem("gg_cliente");
    }
  }, []);

  // ==========================================
  // VERIFICA SERVIÇO
  // ==========================================

  if (!servico) {
    return <h1>Nenhum serviço selecionado.</h1>;
  }

  // ==========================================
  // CONVERTER HORÁRIO PARA MINUTOS
  // ==========================================

  function horarioParaMinutos(horario: string) {
    const [hora, minuto] = horario.split(":").map(Number);

    return hora * 60 + minuto;
  }

  // ==========================================
  // PEGAR DURAÇÃO DO SERVIÇO
  // ==========================================

  function obterDuracaoServico(): number {
    const duracaoTexto = servico?.duracao;

    if (!duracaoTexto) {
      return 30;
    }

    const numero = Number(String(duracaoTexto).replace(/\D/g, ""));

    return numero > 0 ? numero : 30;
  }

  // ==========================================
  // BUSCAR AGENDAMENTOS
  // ==========================================

  async function buscarAgendamentos() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("horario, servico, duracao")
      .eq("data", dataSelecionada)
      .neq("status", "Cancelado");

    if (error) {
      console.log(error);

      setAgendamentosExistentes([]);

      return;
    }

    setAgendamentosExistentes((data as AgendamentoExistente[]) || []);
  }

  // ==========================================
  // BUSCAR BLOQUEIOS
  // ==========================================

  async function buscarBloqueios() {
    const { data, error } = await supabase
      .from("dias_bloqueados")
      .select("id, data, motivo, hora_inicio, hora_fim")
      .eq("data", dataSelecionada);

    if (error) {
      console.log("Erro ao buscar bloqueios:", error);

      setBloqueios([]);
      setDataBloqueada(false);

      return;
    }

    const bloqueiosEncontrados = (data as BloqueioHorario[]) || [];

    setBloqueios(bloqueiosEncontrados);

    const bloqueioDiaInteiro = bloqueiosEncontrados.some(
      (bloqueio) => bloqueio.hora_inicio === null && bloqueio.hora_fim === null,
    );

    setDataBloqueada(bloqueioDiaInteiro);

    setHorarioSelecionado("");
  }

  // ==========================================
  // VERIFICAR CONFLITO COM BLOQUEIO
  // ==========================================

  function intervaloBloqueado(inicio: number, fim: number) {
    if (dataBloqueada) {
      return true;
    }

    return bloqueios.some((bloqueio) => {
      // Dia inteiro
      if (bloqueio.hora_inicio === null && bloqueio.hora_fim === null) {
        return true;
      }

      // Bloqueio inválido/incompleto
      if (!bloqueio.hora_inicio || !bloqueio.hora_fim) {
        return false;
      }

      const inicioBloqueio = horarioParaMinutos(
        bloqueio.hora_inicio.slice(0, 5),
      );

      const fimBloqueio = horarioParaMinutos(bloqueio.hora_fim.slice(0, 5));

      return inicio < fimBloqueio && fim > inicioBloqueio;
    });
  }

  // ==========================================
  // VERIFICAR CONFLITO COM AGENDAMENTO
  // ==========================================

  function intervaloOcupado(inicio: number, fim: number) {
    return agendamentosExistentes.some((agendamento) => {
      const inicioExistente = horarioParaMinutos(agendamento.horario);

      /*
          Agendamentos antigos podem não possuir
          duração porque a coluna foi adicionada agora.

          Nesse caso usamos 30 minutos como
          compatibilidade.
        */
      const duracaoExistente = agendamento.duracao || 30;

      const fimExistente = inicioExistente + duracaoExistente;

      return inicio < fimExistente && fim > inicioExistente;
    });
  }

  // ==========================================
  // DATA / HORÁRIO ATUAL
  // ==========================================

  const agora = new Date();

  const domingo = parseISO(dataSelecionada).getDay() === 0;

  const horarioAtual = agora.getHours() * 60 + agora.getMinutes();

  const diaSemana = parseISO(dataSelecionada).getDay();

  // ==========================================
  // HORÁRIO DE ALMOÇO
  // ==========================================

  /*
    Segunda a sexta:
    12:00 até 14:00

    Sábado:
    12:00 até 13:30
  */

  const inicioAlmoco = 12 * 60;

  const fimAlmoco = diaSemana === 6 ? 13 * 60 + 30 : 14 * 60;

  // ==========================================
  // HORÁRIO DE FUNCIONAMENTO
  // ==========================================

  const fimFuncionamento = 18 * 60 + 30;

  // ==========================================
  // DURAÇÃO DO SERVIÇO
  // ==========================================

  const duracaoServico = obterDuracaoServico();

  // ==========================================
  // VERIFICAR SE PASSA PELO ALMOÇO
  // ==========================================

  function intervaloPassaPeloAlmoco(inicio: number, fim: number) {
    return inicio < fimAlmoco && fim > inicioAlmoco;
  }

  // ==========================================
  // HORÁRIOS DISPONÍVEIS
  // ==========================================

  const horariosDisponiveis = horarios.filter((horario) => {
    const inicio = horarioParaMinutos(horario);

    const fim = inicio + duracaoServico;

    // Não pode passar do fechamento
    if (fim > fimFuncionamento) {
      return false;
    }

    // Não pode entrar no almoço
    if (intervaloPassaPeloAlmoco(inicio, fim)) {
      return false;
    }

    // Não pode entrar em bloqueio
    if (intervaloBloqueado(inicio, fim)) {
      return false;
    }

    // Não pode bater com outro agendamento
    if (intervaloOcupado(inicio, fim)) {
      return false;
    }

    // Se for hoje, o horário inicial
    // precisa ser posterior ao atual
    if (dataSelecionada === dataHoje) {
      if (inicio <= horarioAtual) {
        return false;
      }
    }

    return true;
  });

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

    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(
      7,
      11,
    )}`;
  }

  // ==========================================
  // VALIDAR NOME
  // ==========================================

  function validarNome(nome: string) {
    const nomeLimpo = nome.trim();

    if (nomeLimpo.length < 3) {
      return "Digite um nome com pelo menos 3 letras.";
    }

    if (nomeLimpo.length > 60) {
      return "Nome muito grande.";
    }

    const regex = /^[A-Za-zÀ-ÿ\s]+$/;

    if (!regex.test(nomeLimpo)) {
      return "O nome deve conter apenas letras.";
    }

    return null;
  }

  // ==========================================
  // CONFIRMAR AGENDAMENTO
  // ==========================================

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

    // ========================================
    // VERIFICA DURAÇÃO NOVAMENTE
    // ========================================

    const inicioSelecionado = horarioParaMinutos(horarioSelecionado);

    const fimSelecionado = inicioSelecionado + duracaoServico;

    if (fimSelecionado > fimFuncionamento) {
      aviso("Esse serviço não cabe nesse horário.");

      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // VERIFICA ALMOÇO
    // ========================================

    if (intervaloPassaPeloAlmoco(inicioSelecionado, fimSelecionado)) {
      aviso("Esse serviço passa pelo horário de almoço.");

      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // VERIFICA BLOQUEIOS ATUALIZADOS
    // ========================================

    const { data: bloqueiosAtualizados } = await supabase
      .from("dias_bloqueados")
      .select("id, data, motivo, hora_inicio, hora_fim")
      .eq("data", dataSelecionada);

    const bloqueiosAtuais = (bloqueiosAtualizados as BloqueioHorario[]) || [];

    const diaInteiroAtual = bloqueiosAtuais.some(
      (bloqueio) => bloqueio.hora_inicio === null && bloqueio.hora_fim === null,
    );

    if (diaInteiroAtual) {
      aviso("O barbeiro bloqueou esta data.");

      setDataBloqueada(true);

      setBloqueios(bloqueiosAtuais);

      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // VERIFICA BLOQUEIO DO INTERVALO
    // ========================================

    const bloqueioNoIntervalo = bloqueiosAtuais.some((bloqueio) => {
      if (bloqueio.hora_inicio === null && bloqueio.hora_fim === null) {
        return true;
      }

      if (!bloqueio.hora_inicio || !bloqueio.hora_fim) {
        return false;
      }

      const inicioBloqueio = horarioParaMinutos(
        bloqueio.hora_inicio.slice(0, 5),
      );

      const fimBloqueio = horarioParaMinutos(bloqueio.hora_fim.slice(0, 5));

      return inicioSelecionado < fimBloqueio && fimSelecionado > inicioBloqueio;
    });

    if (bloqueioNoIntervalo) {
      aviso("Esse horário foi bloqueado pelo barbeiro.");

      setBloqueios(bloqueiosAtuais);

      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // VERIFICA AGENDAMENTOS ATUALIZADOS
    // ========================================

    const { data: agendamentosAtualizados } = await supabase
      .from("agendamentos")
      .select("id, horario, servico, duracao")
      .eq("data", dataSelecionada)
      .neq("status", "Cancelado");

    const conflitos = (agendamentosAtualizados || []).some(
      (agendamento: {
        horario: string;
        servico: string;
        duracao: number | null;
      }) => {
        const inicioExistente = horarioParaMinutos(agendamento.horario);

        const duracaoExistente = agendamento.duracao || 30;

        const fimExistente = inicioExistente + duracaoExistente;

        return (
          inicioSelecionado < fimExistente && fimSelecionado > inicioExistente
        );
      },
    );

    if (conflitos) {
      erro("Esse horário ficou indisponível.");

      await buscarAgendamentos();

      setHorarioSelecionado("");

      return;
    }

    // ========================================
    // CRIA AGENDAMENTO
    // ========================================

    const { data: novoAgendamento, error: insertError } = await supabase
      .from("agendamentos")
      .insert([
        {
          nome: nome.trim(),

          telefone: telefoneLimpo,

          servico: servico.nome,

          preco: Number(servico.preco.replace("R$", "").replace(",", ".")),

          duracao: duracaoServico,

          horario: horarioSelecionado,

          data: dataSelecionada,

          status: "Pendente",
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      console.log(insertError);

      erro("Erro ao salvar agendamento.");

      return;
    }

    if (!novoAgendamento) {
      erro("Não foi possível identificar o agendamento.");

      return;
    }

    // ========================================
    // LINK DE CANCELAMENTO
    // ========================================

    const link = `${window.location.origin}/cancelar-agendamento?id=${novoAgendamento.id}`;

    setLinkCancelamento(link);

    // ========================================
    // SALVAR DADOS DO CLIENTE
    // ========================================

    if (lembrarDados) {
      localStorage.setItem(
        "gg_cliente",
        JSON.stringify({
          nome: nome.trim(),

          telefone: telefone,
        }),
      );
    } else {
      localStorage.removeItem("gg_cliente");
    }

    // ========================================
    // SUCESSO
    // ========================================

    sucesso("Agendamento realizado com sucesso!");

    setAgendamentoConfirmado(true);

    // Mantemos data e horário
    // porque eles aparecem na tela de sucesso.

    setNome("");
    setTelefone("");

    await buscarAgendamentos();
  }

  // ==========================================
  // NOVO AGENDAMENTO
  // ==========================================

  function novoAgendamento() {
    setAgendamentoConfirmado(false);

    setLinkCancelamento("");

    setDataSelecionada(dataHoje);

    setHorarioSelecionado("");
  }

  // ==========================================
  // TELA
  // ==========================================

  return (
    <div className="agendamento">
      <div className="agendamento-card">
        {!agendamentoConfirmado ? (
          <>
            <h1>Agendamento</h1>

            {/* SERVIÇO */}

            <div className="info-servico">
              <h2>{servico.nome}</h2>

              <p>Preço: {servico.preco}</p>

              <p>Duração: {servico.duracao}</p>
            </div>

            {/* NOME */}

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

            {/* LEMBRAR DADOS */}

            <label className="lembrar-dados">
              <input
                type="checkbox"
                checked={lembrarDados}
                onChange={(e) => setLembrarDados(e.target.checked)}
              />

              <span>Lembrar meus dados neste aparelho</span>
            </label>

            {/* DATA */}

            <div className="input-group">
              <label>Data</label>

              <DatePicker
                selected={parseISO(dataSelecionada)}
                onChange={(date: Date | null) => {
                  if (!date) {
                    return;
                  }

                  const data = format(date, "yyyy-MM-dd");

                  setDataSelecionada(data);

                  setHorarioSelecionado("");
                }}
                minDate={new Date()}
                locale={ptBR}
                dateFormat="dd/MM/yyyy"
                placeholderText={"Selecione uma data"}
                filterDate={(date) => date.getDay() !== 0}
              />
            </div>

            {/* HORÁRIOS */}

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
                Não há horários disponíveis para este serviço nesta data.
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

            {/* CONFIRMAR */}

            <button
              className="botao-confirmar"
              onClick={confirmarAgendamento}
              disabled={domingo || dataBloqueada || !horarioSelecionado}
            >
              Confirmar Agendamento
            </button>
          </>
        ) : (
          /* ===================================
             TELA DE SUCESSO
             =================================== */

          <div className="sucesso-agendamento">
            <div className="check-animado">
              <div className="check-circulo">
                <span>✓</span>
              </div>
            </div>

            <h1>Agendamento confirmado!</h1>

            <p className="sucesso-subtitulo">
              Seu horário foi reservado com sucesso.
            </p>

            <div className="resumo-agendamento">
              <div className="resumo-item">
                <span>💈 Serviço</span>

                <strong>{servico.nome}</strong>
              </div>

              <div className="resumo-item">
                <span>📅 Data</span>

                <strong>{dataSelecionada}</strong>
              </div>

              <div className="resumo-item">
                <span>🕐 Horário</span>

                <strong>{horarioSelecionado}</strong>
              </div>
            </div>

            {linkCancelamento && (
              <div className="cancelamento-sucesso">
                <p>Precisou desistir do corte?</p>

                <a
                  href={linkCancelamento}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cancelar agendamento
                </a>
              </div>
            )}

            <button
              type="button"
              className="botao-novo-agendamento"
              onClick={novoAgendamento}
            >
              Fazer outro agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Agendamento;
