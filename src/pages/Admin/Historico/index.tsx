import "./style.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Agendamento = {
  id: number;
  nome: string;
  telefone: string;
  servico: string;
  preco: number;
  horario: string;
  data: string;
  status: string;
};

function Historico() {
  const [historico, setHistorico] = useState<Agendamento[]>([]);

  useEffect(() => {
    buscarHistorico();
  }, []);

  async function buscarHistorico() {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .in("status", ["Concluído", "Cancelado"])
      .order("data", { ascending: false })
      .order("horario", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    if (data) {
      setHistorico(data as Agendamento[]);
    }
  }
return (
  <div className="historico-page">

    <h1>Histórico de Agendamentos</h1>

    {historico.length === 0 ? (

      <h2 className="sem-registros">
        Nenhum atendimento encontrado.
      </h2>

    ) : (

      <div className="table-container">

        <table className="historico-table">

          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Serviço</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {historico.map((item) => (

              <tr key={item.id}>

                <td>{item.nome}</td>

                <td>{item.telefone}</td>

                <td>{item.servico}</td>

                <td>
                  {new Date(item.data).toLocaleDateString("pt-BR")}
                </td>

                <td>{item.horario}</td>

                <td>
                  {item.preco.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>

                <td>
                  {item.status === "Concluído"
                    ? "✅ Concluído"
                    : "❌ Cancelado"}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    )}

  </div>
);
}

export default Historico;