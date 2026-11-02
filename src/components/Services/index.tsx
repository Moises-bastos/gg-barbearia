import { useNavigate } from "react-router-dom";
import "./style.css";
import { servicos } from "../../data/servicos";

function Services() {
  const navigate = useNavigate();

  return (
    <section id="servicos" className="services">
      {/* Tesoura decorativa ao fundo */}
      <div className="services-scissors" aria-hidden="true">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="30"
            cy="75"
            r="13"
            stroke="currentColor"
            strokeWidth="4"
          />

          <circle
            cx="70"
            cy="75"
            r="13"
            stroke="currentColor"
            strokeWidth="4"
          />

          <path
            d="M50 52 L15 10 M50 52 L85 10"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M50 52 L30 75 M50 52 L70 75"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <circle cx="50" cy="52" r="4" fill="currentColor" />
        </svg>
      </div>

      <h2>Nossos Serviços</h2>

      <p>Escolha o serviço ideal para renovar seu visual.</p>

      <div className="services-grid">
        {servicos.map((servico) => (
          <div className="card" key={servico.nome}>
            <h3>{servico.nome}</h3>

            <span>{servico.duracao}</span>

            <strong>{servico.preco}</strong>

            <button
              onClick={() =>
                navigate("/agendamento", {
                  state: servico,
                })
              }
            >
              Agendar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Services;
