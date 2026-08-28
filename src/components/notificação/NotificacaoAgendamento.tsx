import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ativarPushNotifications } from "../../utils/pushNotifications";

function NotificacaoAgendamento() {
  const [permissao, setPermissao] = useState(
    "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  async function ativarNotificacoes() {
    if (!("Notification" in window)) {
      alert("Seu navegador não suporta notificações.");
      return;
    }

    const resultado =
      await Notification.requestPermission();

    setPermissao(resultado);

    if (resultado === "granted") {
      new Notification("Notificações ativadas! 🔔", {
        body:
          "Agora você receberá avisos de novos agendamentos.",
      });

      // Cria e salva a Push Subscription
      await ativarPushNotifications();
    }
  }

  useEffect(() => {
    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    // IMPORTANTE:
    // Mesmo que a permissão já esteja concedida,
    // garante que a Push Subscription seja criada
    // e salva no Supabase.
    ativarPushNotifications();

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
          console.log(
            "🔔 NOVO AGENDAMENTO RECEBIDO:",
            payload
          );

          const agendamento = payload.new;

          new Notification("Novo agendamento! ✂️", {
            body: `${agendamento.nome} agendou ${agendamento.servico} para ${agendamento.data} às ${agendamento.horario}.`,
          });
        }
      )
      .subscribe((status) => {
        console.log(
          "📡 Status do Realtime:",
          status
        );
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [permissao]);

  if (permissao === "unsupported") {
    return null;
  }

  if (permissao === "granted") {
    return null;
  }

  if (permissao === "denied") {
    return (
      <div className="notificacao-aviso">
        <span>
          🔕 As notificações estão bloqueadas.
        </span>

        <small>
          Permita as notificações nas configurações
          do navegador.
        </small>
      </div>
    );
  }

  return (
    <div className="notificacao-aviso">
      <span>
        🔔 Ative as notificações para receber
        novos agendamentos.
      </span>

      <button
        onClick={ativarNotificacoes}
        type="button"
      >
        Ativar notificações
      </button>
    </div>
  );
}

export default NotificacaoAgendamento;