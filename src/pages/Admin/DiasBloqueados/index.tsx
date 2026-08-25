import "./style.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { sucesso, erro } from "../../../utils/toast";

type DiaBloqueado = {
  id: number;
  data: string;
  motivo: string;
};

function DiasBloqueados() {
  const [dias, setDias] = useState<DiaBloqueado[]>([]);
  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    buscarDias();
  }, []);

  async function buscarDias() {
    const { data, error } = await supabase
      .from("dias_bloqueados")
      .select("*")
      .order("data");

    if (error) {
      console.log(error);
      return;
    }

    setDias(data as DiaBloqueado[]);
  }
async function bloquearData() {
  if (!data) {
    erro("Escolha uma data.");
    return;
  }

  const { data: existente, error: erroBusca } = await supabase
    .from("dias_bloqueados")
    .select("id")
    .eq("data", data)
    .maybeSingle();

  if (erroBusca) {
    console.log("Erro ao verificar data:", erroBusca);
    erro("Não foi possível verificar a data.");
    return;
  }

  if (existente) {
    erro("Essa data já está bloqueada.");
    return;
  }

  const { error } = await supabase
    .from("dias_bloqueados")
    .insert([
      {
        data,
        motivo,
      },
    ]);

  if (error) {
    console.log("Erro ao bloquear data:", error);

    erro("Não foi possível bloquear a data.");
    return;
  }

  sucesso("Data bloqueada!");

  setData("");
  setMotivo("");

  buscarDias();
}

  async function remover(id: number) {
    await supabase
      .from("dias_bloqueados")
      .delete()
      .eq("id", id);

    sucesso("Data liberada!");

    buscarDias();
  }

  return (
    <div className="dias-page">

      <h1>Dias Bloqueados</h1>

      <div className="novo-dia">

        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />

        <input
          type="text"
          placeholder="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />

        <button onClick={bloquearData}>
          Bloquear
        </button>

      </div>

      <table>

        <thead>

          <tr>
            <th>Data</th>
            <th>Motivo</th>
            <th></th>
          </tr>

        </thead>

        <tbody>

          {dias.map((dia) => (

            <tr key={dia.id}>

              <td>
                {new Date(dia.data).toLocaleDateString("pt-BR")}
              </td>

              <td>{dia.motivo || "-"}</td>

              <td>

                <button
                  className="remover"
                  onClick={() => remover(dia.id)}
                >
                  Liberar
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default DiasBloqueados;