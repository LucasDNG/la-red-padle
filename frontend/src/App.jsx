import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { api } from "./api.js";

const setSession = (data) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
};

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
};

function Brand() {
  return (
    <Link to="/" className="brand">
      <span>LA RED</span>
      <small>PÁDEL · SAN PEDRO</small>
    </Link>
  );
}

function Shell({ children, transparent = false }) {
  const user = getUser();

  return (
    <div className="app">
      <header className={`header ${transparent ? "header-transparent" : ""}`}>
        <Brand />

        <nav className="nav">
          <Link to="/">Inicio</Link>
          <Link to="/ranking">Ranking</Link>
          {user && <Link to="/liga">Mi liga</Link>}
          <Link to="/instalar">Instalar</Link>
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <Link className="header-user" to="/liga">
                {user.first_name || "Mi cuenta"}
              </Link>
              <button className="header-link" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link className="header-link" to="/login">
                Ingresar
              </Link>
              <Link className="header-create" to="/login?registro=1">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

function RankingPreview() {
  const [rows, setRows] = useState([]);
  const [gender, setGender] = useState("masculino");

  useEffect(() => {
    api
      .get("/ranking")
      .then((response) => setRows(response.data || []))
      .catch(() => setRows([]));
  }, []);

  const top = useMemo(() => {
    return rows
      .filter((row) => row.slug === gender)
      .sort((a, b) => {
        if (Number(a.number) !== Number(b.number)) {
          return Number(a.number) - Number(b.number);
        }

        return Number(a.position) - Number(b.position);
      })
      .slice(0, 10);
  }, [rows, gender]);

  return (
    <aside className="top-card">
      <div className="top-card-header">
        <h2>TOP 10</h2>

        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
        </select>
      </div>

      <div className="top-list">
        {top.length === 0 && (
          <div className="top-empty">
            Todavía no hay parejas en este ranking.
          </div>
        )}

        {top.map((row, index) => (
          <div className="top-row" key={row.pair_id}>
            <span className={`top-position ${index === 0 ? "first" : ""}`}>
              {index + 1}
            </span>

            <div className="top-player">
              <strong>{row.players}</strong>
              <small>
                {row.number}ª · posición #{row.position}
              </small>
            </div>

            <span className="top-elo">{row.elo}</span>
          </div>
        ))}
      </div>

      <Link className="top-link" to="/ranking">
        Ver ranking completo <span>→</span>
      </Link>
    </aside>
  );
}

function FeatureIcon({ type }) {
  if (type === "challenge") return <span className="feature-symbol">♛</span>;
  if (type === "coordination") return <span className="feature-symbol">◎</span>;
  if (type === "results") return <span className="feature-symbol">▥</span>;
  return <span className="feature-symbol">◉</span>;
}

function Home() {
  return (
    <Shell transparent>
      <section className="home-hero">
        <div className="hero-photo" />
        <div className="hero-overlay" />

        <div className="hero-top-tags">
          <span>LA RED</span>
          <span>LIGA DE PÁDEL</span>
          <span>SAN PEDRO</span>
        </div>

        <div className="hero-layout">
          <div className="hero-copy">
            <div className="hero-mini">LA RED · SAN PEDRO</div>

            <h1>
              La Red
              <span>PÁDEL · SAN PEDRO</span>
            </h1>

            <p>
              Una liga abierta para jugadores de San Pedro. Desafiá, coordiná
              tu partido y competí para hacerte un lugar en La Red.
            </p>

            <div className="hero-buttons">
              <Link className="button button-green" to="/ranking">
                <span className="button-icon">▥</span>
                VER RANKING
              </Link>

              <Link className="button button-outline" to="/login">
                <span className="button-icon">♙</span>
                QUIERO JUGAR
              </Link>
            </div>
          </div>

          <RankingPreview />
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon blue">
              <FeatureIcon type="challenge" />
            </div>
            <h3>DESAFÍOS</h3>
            <p>Competí dentro de tu categoría.</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon green">
              <FeatureIcon type="coordination" />
            </div>
            <h3>COORDINACIÓN</h3>
            <p>Contactate en privado y organizá el partido.</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon blue">
              <FeatureIcon type="results" />
            </div>
            <h3>RESULTADOS</h3>
            <p>Cargá y confirmá tus partidos.</p>
          </article>

          <article className="feature-card">
            <div className="feature-icon green">
              <FeatureIcon type="community" />
            </div>
            <h3>LA RED PÁDEL</h3>
            <p>Comunidad, competencia y más juego.</p>
          </article>
        </div>
      </section>

      <section className="home-rules">
        <div className="rules-title">
          <span>CÓMO FUNCIONA</span>
          <h2>Jugá. Ganá.<br />Subí.</h2>
        </div>

        <div className="rules">
          <article>
            <strong>01</strong>
            <h3>Elegí tu categoría</h3>
            <p>
              Formá tu pareja e ingresá en la última posición disponible de tu
              categoría.
            </p>
          </article>

          <article>
            <strong>02</strong>
            <h3>Aceptá desafíos</h3>
            <p>
              Cada desafío aceptado tiene su propio plazo de 30 días para
              jugarse.
            </p>
          </article>

          <article>
            <strong>03</strong>
            <h3>Ganate el ascenso</h3>
            <p>
              Tres victorias consecutivas siendo líder pueden llevarte a la
              categoría superior.
            </p>
          </article>
        </div>
      </section>

      <footer className="footer">
        <div>
          <strong>LA RED PÁDEL · SAN PEDRO</strong>
          <span>Más pádel. Más comunidad.</span>
        </div>

        <div className="footer-links">
          <Link to="/ranking">Ranking</Link>
          <Link to="/login">Ingresar</Link>
          <Link to="/instalar">Instalar app</Link>
        </div>
      </footer>
    </Shell>
  );
}

function Login() {
  const navigate = useNavigate();

  const initialRegister =
    new URLSearchParams(window.location.search).get("registro") === "1";

  const [mode, setMode] = useState(initialRegister ? "register" : "login");
  const [form, setForm] = useState({ gender: "male" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const url = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(url, form);

      setSession(data);
      navigate("/liga");
    } catch (error) {
      setMessage(error.response?.data?.error || "No se pudo continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <section className="internal-page auth-page">
        <div className="auth-card">
          <div className="section-label">LA RED PÁDEL</div>

          <h1>{mode === "login" ? "Ingresar" : "Crear cuenta"}</h1>

          <p className="auth-description">
            {mode === "login"
              ? "Entrá a tu liga, revisá tus desafíos y seguí tu posición."
              : "Registrate para formar tu pareja y empezar a competir."}
          </p>

          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <div className="form-columns">
                  <label>
                    Nombre
                    <input
                      required
                      placeholder="Nombre"
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Apellido
                    <input
                      required
                      placeholder="Apellido"
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                    />
                  </label>
                </div>

                <label>
                  WhatsApp
                  <input
                    placeholder="Ej: 3329..."
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>

                <label>
                  Liga
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </select>
                </label>
              </>
            )}

            <label>
              Email
              <input
                required
                type="email"
                placeholder="tu@email.com"
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </label>

            <label>
              Contraseña
              <input
                required
                type="password"
                placeholder="••••••••"
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </label>

            <button className="button button-green form-button" disabled={loading}>
              {loading ? "Cargando..." : "CONTINUAR"}
            </button>
          </form>

          {message && <p className="error-message">{message}</p>}

          <button
            className="mode-button"
            onClick={() => {
              setMessage("");
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login"
              ? "¿Todavía no tenés cuenta? Crear cuenta"
              : "Ya tengo una cuenta"}
          </button>
        </div>
      </section>
    </Shell>
  );
}

function Ranking() {
  const [rows, setRows] = useState([]);
  const [gender, setGender] = useState("masculino");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/ranking")
      .then((response) => setRows(response.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((row) => row.slug === gender),
    [rows, gender]
  );

  const categories = useMemo(() => {
    return filtered.reduce((accumulator, row) => {
      const key = row.number;

      if (!accumulator[key]) {
        accumulator[key] = [];
      }

      accumulator[key].push(row);
      return accumulator;
    }, {});
  }, [filtered]);

  return (
    <Shell>
      <section className="internal-page ranking-page">
        <div className="page-title-row">
          <div>
            <div className="section-label">LA RED PÁDEL · SAN PEDRO</div>
            <h1>Ranking</h1>
            <p>
              La posición dentro de cada categoría define el orden competitivo.
            </p>
          </div>

          <div className="gender-switch">
            <button
              className={gender === "masculino" ? "active" : ""}
              onClick={() => setGender("masculino")}
            >
              Masculino
            </button>

            <button
              className={gender === "femenino" ? "active" : ""}
              onClick={() => setGender("femenino")}
            >
              Femenino
            </button>
          </div>
        </div>

        {loading && <div className="empty-box">Cargando ranking...</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-box">
            Todavía no hay parejas en este ranking.
          </div>
        )}

        <div className="categories-grid">
          {Object.entries(categories)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([number, categoryRows]) => (
              <section className="ranking-card" key={number}>
                <div className="ranking-card-title">
                  <div>
                    <small>CATEGORÍA</small>
                    <strong>{number}ª</strong>
                  </div>

                  <span>{categoryRows.length} parejas</span>
                </div>

                <div className="ranking-table-head">
                  <span>POS.</span>
                  <span>PAREJA</span>
                  <span>ELO</span>
                </div>

                {categoryRows
                  .sort((a, b) => Number(a.position) - Number(b.position))
                  .map((row) => (
                    <div className="ranking-row" key={row.pair_id}>
                      <span className="ranking-position">
                        {row.position}
                      </span>

                      <strong>{row.players}</strong>

                      <span>{row.elo}</span>
                    </div>
                  ))}
              </section>
            ))}
        </div>
      </section>
    </Shell>
  );
}

function League() {
  const user = getUser();

  const [players, setPlayers] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [partner, setPartner] = useState("");
  const [category, setCategory] = useState(7);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [playersResponse, challengesResponse] = await Promise.all([
        api.get("/players"),
        api.get("/challenges/inbox"),
      ]);

      setPlayers(playersResponse.data || []);
      setInbox(challengesResponse.data || []);
    } catch (error) {
      setMessage(error.response?.data?.error || "Iniciá sesión.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function makePair() {
    try {
      setMessage("");

      await api.post("/pairs", {
        partnerId: Number(partner),
        category: Number(category),
      });

      setMessage(
        "Pareja creada correctamente. Ingresaron en la última posición de la categoría."
      );

      load();
    } catch (error) {
      setMessage(error.response?.data?.error || "No se pudo crear la pareja.");
    }
  }

  async function acceptChallenge(id) {
    try {
      setMessage("");

      await api.patch(`/challenges/${id}/accept`);

      setMessage(
        "Desafío aceptado. Desde ahora tienen 30 días para jugarlo."
      );

      load();
    } catch (error) {
      setMessage(
        error.response?.data?.error || "No se pudo aceptar el desafío."
      );
    }
  }

  return (
    <Shell>
      <section className="internal-page league-page">
        <div className="page-title-row">
          <div>
            <div className="section-label">ÁREA DE JUGADORES</div>
            <h1>Mi liga</h1>
            <p>
              Hola {user?.first_name || ""}. Administrá tu pareja y tus
              desafíos.
            </p>
          </div>
        </div>

        <div className="league-dashboard">
          <section className="dashboard-card">
            <div className="dashboard-number">01</div>

            <h2>Formar pareja</h2>

            <p>
              Elegí a tu compañero/a y la categoría en la que van a comenzar.
            </p>

            <label>
              Compañero/a
              <select
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
              >
                <option value="">Elegí jugador/a</option>

                {players
                  .filter((player) => player.gender === user?.gender)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.first_name} {player.last_name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Categoría
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((number) => (
                  <option value={number} key={number}>
                    {number}ª categoría
                  </option>
                ))}
              </select>
            </label>

            <button
              className="button button-green dashboard-button"
              onClick={makePair}
              disabled={!partner}
            >
              CREAR PAREJA
            </button>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-number">02</div>

            <h2>Desafíos</h2>

            <p>
              Cada desafío aceptado tiene su propio plazo de 30 días.
            </p>

            <div className="challenge-list">
              {inbox.length === 0 && (
                <div className="challenge-empty">
                  No tenés desafíos pendientes.
                </div>
              )}

              {inbox.map((challenge) => (
                <div className="challenge-row" key={challenge.id}>
                  <div>
                    <small>DESAFÍO</small>
                    <strong>#{challenge.id}</strong>
                  </div>

                  <button
                    onClick={() => acceptChallenge(challenge.id)}
                  >
                    Aceptar
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {message && <div className="league-message">{message}</div>}
      </section>
    </Shell>
  );
}

function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () =>
      window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <Shell>
      <section className="internal-page install-page">
        <div className="install-card">
          <div className="install-logo">LR</div>

          <div className="section-label">LA RED PÁDEL</div>

          <h1>Llevá la liga en el teléfono.</h1>

          <p>
            Instalá LA RED Pádel como aplicación para entrar más rápido al
            ranking, desafíos y resultados.
          </p>

          {deferredPrompt ? (
            <button className="button button-green" onClick={install}>
              INSTALAR AHORA
            </button>
          ) : (
            <div className="install-help">
              <strong>iPhone</strong>
              <span>Safari → Compartir → Agregar a pantalla de inicio.</span>

              <strong>Android</strong>
              <span>
                Abrí el menú del navegador y seleccioná Instalar aplicación.
              </span>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/liga" element={<League />} />
      <Route path="/instalar" element={<Install />} />
    </Routes>
  );
}