import "./style.css";
import logo from "../../assets/logo.jpeg";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="logo-container">
        <img src={logo} alt="Logo GG Barbearia" className="logo" />
      </div>

      <ul className="menu">
        <li
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          Home
        </li>

        <li
          onClick={() =>
            document
              .getElementById("servicos")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Serviços
        </li>

        <li
          onClick={() =>
            document
              .getElementById("contato")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Contato
        </li>

        <li onClick={() => navigate("/login")}>
          Área do Barbeiro
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;