import { erro } from "./toast";

type AgendamentoWhatsApp = {
  nome: string;
  telefone: string;
  servico: string;
  data: string;
  horario: string;
};

export function enviarWhatsApp(agendamento: AgendamentoWhatsApp) {
  const telefone = agendamento.telefone.replace(/\D/g, "");

if (telefone.length !== 11) {
  erro("Telefone inválido.");
  return;
}

  const dataFormatada = new Date(agendamento.data).toLocaleDateString(
    "pt-BR"
  );

 const mensagem = `Olá ${agendamento.nome}! 👋

Seu agendamento foi confirmado com sucesso!

━━━━━━━━━━━━━━━
💈 GG BARBEARIA
━━━━━━━━━━━━━━━

✂️ Serviço: ${agendamento.servico}
📆 Data: ${dataFormatada}
⏰ Horário: ${agendamento.horario}

⚠️ Caso não possa comparecer, pedimos que avise com antecedência.

Obrigado pela preferência!
Até breve!`;

  const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(
    mensagem
  )}`;

  window.open(url, "_blank");
}