import { toast } from "react-toastify";

export function sucesso(mensagem: string) {
  toast.success(mensagem);
}

export function erro(mensagem: string) {
  toast.error(mensagem);
}

export function aviso(mensagem: string) {
  toast.warning(mensagem);
}