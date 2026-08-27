import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

function NotificacaoAgendamento() {
  useEffect(() => {
    // Pede permissão para mostrar notificações
    async function solicitarPermissao() {
      if (!("Notification" in window)) {
        console.log(
          "Este navegador não suporta notificações."
        );
        return;
      }

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }

    solicitarPermissao();

    // Escuta novos agendamentos
    const canal = supabase
      .channel("novos-agendamentos")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agendamentos",
        },
        (payload) => {
          const agendamento = payload.new;

          // Não mostra notificação se não houver permissão
          if (Notification.permission !== "granted") {
            return;
          }

          new Notification("Novo agendamento! ✂️", {
            body: `${agendamento.nome} agendou ${agendamento.servico} para ${agendamento.data} às ${agendamento.horario}.`,
          });
        }
      )
      .subscribe();

    // Limpa o canal quando o componente sair da tela
    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  return null;
}

export default NotificacaoAgendamento;