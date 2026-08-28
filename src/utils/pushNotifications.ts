import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY;

function converterBase64ParaUint8Array(
  base64String: string
): ArrayBuffer {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4
    );

  const base64 =
    (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  ).buffer;
}

export async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log(
      "Este navegador não suporta Service Worker."
    );

    return null;
  }

  try {
    const registration =
      await navigator.serviceWorker.register("/sw.js");

    console.log(
      "Service Worker registrado:",
      registration
    );

    return registration;
  } catch (error) {
    console.error(
      "Erro ao registrar Service Worker:",
      error
    );

    return null;
  }
}

export async function ativarPushNotifications() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    console.log(
      "Push Notifications não são suportadas."
    );

    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error(
      "VITE_VAPID_PUBLIC_KEY não encontrada."
    );

    return null;
  }

  try {
    // Pega o usuário atualmente logado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Usuário não autenticado:",
        userError
      );

      return null;
    }

    // Aguarda o Service Worker ficar pronto
    const registration =
      await navigator.serviceWorker.ready;

    // Verifica se já existe uma subscription
    let subscription =
      await registration.pushManager.getSubscription();

    // Se não existir, cria uma nova
    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,

          applicationServerKey:
            converterBase64ParaUint8Array(
              VAPID_PUBLIC_KEY
            ),
        });
    }

    console.log(
      "Push Subscription:",
      subscription
    );

    // Converte para objeto
    const subscriptionJSON =
      subscription.toJSON();

    if (
      !subscriptionJSON.endpoint ||
      !subscriptionJSON.keys?.p256dh ||
      !subscriptionJSON.keys?.auth
    ) {
      console.error(
        "Subscription inválida."
      );

      return null;
    }

    // Salva a subscription no Supabase
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,

          endpoint:
            subscriptionJSON.endpoint,

          subscription: {
            endpoint:
              subscriptionJSON.endpoint,

            keys: {
              p256dh:
                subscriptionJSON.keys.p256dh,

              auth:
                subscriptionJSON.keys.auth,
            },
          },
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) {
      console.error(
        "Erro ao salvar subscription no Supabase:",
        error
      );

      return null;
    }

    console.log(
      "Push Subscription salva no Supabase! ✅"
    );

    return subscription;

  } catch (error) {
    console.error(
      "Erro ao ativar Push Notifications:",
      error
    );

    return null;
  }
}