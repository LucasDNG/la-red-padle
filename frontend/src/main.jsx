import React from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import App from "./App.jsx";
import AdminReports from "./AdminReports.jsx";
import Results from "./Results.jsx";
import PairManager from "./PairManager.jsx";

import "./styles.css";
import "./layout-fixes.css";

function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "user"
      )
    );
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem(
    "token"
  );
  localStorage.removeItem(
    "user"
  );
  localStorage.removeItem(
    "justRegistered"
  );

  window.location.href = "/";
}

function RegisterChoice() {
  const navigate = useNavigate();
  const user = getUser();

  function choose(path) {
    localStorage.removeItem(
      "justRegistered"
    );
    navigate(path);
  }

  return (
    <div className="app">
      <header className="header">
        <Link
          to="/"
          className="brand"
        >
          <span>LA RED</span>
          <small>
            PÁDEL · SAN PEDRO
          </small>
        </Link>

        <nav className="nav">
          <Link to="/">
            Inicio
          </Link>
          <Link to="/ranking">
            Ranking
          </Link>
          <Link to="/liga">
            Mi liga
          </Link>
          <Link to="/instalar">
            Instalar
          </Link>
        </nav>

        <div className="header-actions">
          <span className="header-user">
            {user?.first_name ||
              "Mi cuenta"}
          </span>
          <button
            className="header-link"
            onClick={logout}
          >
            Salir
          </button>
        </div>
      </header>

      <main>
        <section className="internal-page welcome-page">
          <div className="welcome-card">
            <div className="section-label">
              CUENTA CREADA
            </div>

            <h1>
              Ya estás en La Red.
            </h1>

            <p>
              Podés formar tu pareja ahora o seguir recorriendo la app y hacerlo más adelante desde Mi liga.
            </p>

            <div className="welcome-actions">
              <button
                className="button button-green"
                onClick={() =>
                  choose("/pareja")
                }
              >
                FORMAR PAREJA
              </button>

              <button
                className="button button-outline"
                onClick={() =>
                  choose("/")
                }
              >
                MÁS TARDE
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Root() {
  const location =
    useLocation();

  const user =
    getUser();

  if (
    location.pathname ===
    "/admin/reportes"
  ) {
    return (
      <AdminReports />
    );
  }

  if (
    location.pathname ===
    "/resultados"
  ) {
    return (
      <Results />
    );
  }

  if (
    location.pathname ===
    "/pareja"
  ) {
    return (
      <PairManager />
    );
  }

  if (
    user &&
    location.pathname ===
      "/liga" &&
    localStorage.getItem(
      "justRegistered"
    ) === "1"
  ) {
    return (
      <RegisterChoice />
    );
  }

  const onHome =
    location.pathname === "/";

  const onLeague =
    location.pathname ===
    "/liga";

  return (
    <>
      <App />

      {user && onHome && (
        <Link
          className="home-league-entry"
          to="/liga"
        >
          MI LIGA
        </Link>
      )}

      {user && onLeague && (
        <div className="league-tools">
          <Link
            className="league-tool league-tool-pair"
            to="/pareja"
          >
            PAREJA
          </Link>

          <Link
            className="league-tool league-tool-results"
            to="/resultados"
          >
            RESULTADOS
          </Link>

          {user.role ===
            "admin" && (
            <Link
              className="league-tool league-tool-admin"
              to="/admin/reportes"
            >
              ADMIN
            </Link>
          )}
        </div>
      )}
    </>
  );
}

if (
  "serviceWorker" in
  navigator
) {
  if (
    import.meta.env.PROD
  ) {
    window.addEventListener(
      "load",
      () => {
        navigator
          .serviceWorker
          .register(
            "/sw.js"
          )
          .catch(
            () => {}
          );
      }
    );
  } else {
    navigator
      .serviceWorker
      .getRegistrations()
      .then(
        (registrations) =>
          Promise.all(
            registrations.map(
              (registration) =>
                registration.unregister()
            )
          )
      )
      .catch(
        () => {}
      );
  }
}

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <BrowserRouter>
    <Root />
  </BrowserRouter>
);
