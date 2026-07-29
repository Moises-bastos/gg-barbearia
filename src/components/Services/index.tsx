import { useNavigate } from "react-router-dom";
import "./style.css";
import { servicos } from "../../data/servicos";

function Services() {
    const navigate = useNavigate();
    return (
        <section id="servicos" className="services">
            <h2>Nossos Serviços</h2>

            <p>
                Escolha o serviço ideal para renovar seu visual.
            </p>

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