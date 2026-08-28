import express from "express";
import webpush from "web-push";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

app.use(express.json());

const PORT = 3001;

// ========================================
// SUPABASE
// ========================================

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    "❌ Chaves do Supabase não encontradas no .env"
  );

  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// ========================================
// VAPID
// ========================================

const PUBLIC_KEY =
  process.env.VITE_VAPID_PUBLIC_KEY;

const PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY;

if (!PUBLIC_KEY || !PRIVATE_KEY) {
  console.error(
    "❌ Chaves VAPID não encontradas no .env"
  );

  process.exit(1);
}

// ========================================
// WEB PUSH
// ========================================

webpush.setVapidDetails(
  "mailto:moisebastosousa@gmail.com",
  PUBLIC_KEY,
  PRIVATE_KEY
);

// ========================================
// ROTA DE TESTE
// ========================================

app.get("/", (req, res) => {
  res.json({
    mensagem:
      "Servidor de notificações funcionando!",
  });
});

// ========================================
// ENVIA NOTIFICAÇÃO
// ========================================

async function enviarNotificacao(
  subscription,
  nome,
  servico,
  data,
  horario
) {
  const payload = JSON.stringify({
    titulo: "Novo agendamento! ✂️",

    corpo:
      `${nome} agendou ${servico} ` +
      `para ${data} às ${horario}.`,
  });

  try {
    await webpush.sendNotification(
      subscription,
      payload
    );

    console.log(
      `🔔 Notificação enviada para ${nome}`
    );

    return true;

  } catch (error) {
    console.error(
      "❌ Erro ao enviar Push:",
      error
    );

    return false;
  }
}

// ========================================
// TESTE MANUAL
// ========================================

app.post(
  "/enviar-notificacao",
  async (req, res) => {
    try {
      const {
        subscription,
        nome,
        servico,
        data,
        horario,
      } = req.body;

      if (!subscription) {
        return res.status(400).json({
          erro:
            "Subscription não enviada.",
        });
      }

      const enviada =
        await enviarNotificacao(
          subscription,
          nome,
          servico,
          data,
          horario
        );

      if (!enviada) {
        return res.status(500).json({
          sucesso: false,
          erro:
            "Não foi possível enviar.",
        });
      }

      res.json({
        sucesso: true,
        mensagem:
          "Notificação enviada!",
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        sucesso: false,
        erro:
          "Erro ao enviar notificação.",
      });
    }
  }
);

// ========================================
// MONITORAR NOVOS AGENDAMENTOS
// ========================================

function monitorarAgendamentos() {
  console.log(
    "👀 Monitorando novos agendamentos..."
  );

  const canal =
    supabase
      .channel("servidor-agendamentos")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agendamentos",
        },
        async (payload) => {
          console.log(
            "📅 Novo agendamento detectado!"
          );

          const agendamento =
            payload.new;

          console.log(
            agendamento
          );

          // Busca todas as subscriptions
          const { data, error } =
            await supabase
              .from(
                "push_subscriptions"
              )
              .select("*");

          if (error) {
            console.error(
              "❌ Erro ao buscar subscriptions:",
              error
            );

            return;
          }

          if (!data || data.length === 0) {
            console.log(
              "⚠️ Nenhuma subscription cadastrada."
            );

            return;
          }

          console.log(
            `📱 ${data.length} subscription(s) encontrada(s).`
          );

          // Envia para todas as subscriptions
          for (const registro of data) {
            const subscription =
              registro.subscription;

            await enviarNotificacao(
              subscription,
              agendamento.nome,
              agendamento.servico,
              agendamento.data,
              agendamento.horario
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(
          "📡 Status do servidor:",
          status
        );
      });

  return canal;
}

// Inicia o monitoramento
monitorarAgendamentos();

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, () => {
  console.log(
    `Servidor de notificações rodando em http://localhost:${PORT}`
  );
});