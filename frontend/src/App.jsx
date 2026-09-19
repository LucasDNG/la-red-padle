import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";

import { api } from "./api.js";

const setSession = (data) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem(
    "user",
    JSON.stringify(data.user)
  );
};

const getUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user")
    );
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

function Shell({
  children,
  transparent = false,
}) {
  const user = getUser();

  return (
    <div className="app">
      <header
        className={`header ${
          transparent
            ? "header-transparent"
            : ""
        }`}
      >
        <Brand />

        <nav className="nav">
          <Link to="/">Inicio</Link>
          <Link to="/ranking">Ranking</Link>

          {user && (
            <Link to="/liga">
              Mi liga
            </Link>
          )}

          <Link to="/instalar">
            Instalar
          </Link>
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <Link
                className="header-user"
                to="/liga"
              >
                {user.first_name ||
                  "Mi cuenta"}
              </Link>

              <button
                className="header-link"
                onClick={logout}
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                className="header-link"
                to="/login"
              >
                Ingresar
              </Link>

              <Link
                className="header-create"
                to="/login?registro=1"
              >
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
  const [gender, setGender] =
    useState("masculino");

  useEffect(() => {
    api
      .get("/ranking")
      .then((response) =>
        setRows(response.data || [])
      )
      .catch(() => setRows([]));
  }, []);

  const top = useMemo(() => {
    return rows
      .filter(
        (row) => row.slug === gender
      )
      .sort((a, b) => {
        if (
          Number(a.number) !==
          Number(b.number)
        ) {
          return (
            Number(a.number) -
            Number(b.number)
          );
        }

        return (
          Number(a.position) -
          Number(b.position)
        );
      })
      .slice(0, 10);
  }, [rows, gender]);

  return (
    <aside className="top-card">
      <div className="top-card-header">
        <h2>TOP 10</h2>

        <select
          value={gender}
          onChange={(event) =>
            setGender(event.target.value)
          }
        >
          <option value="masculino">
            Masculino
          </option>

          <option value="femenino">
            Femenino
          </option>
        </select>
      </div>

      <div className="top-list">
        {top.length === 0 && (
          <div className="top-empty">
            Todavía no hay parejas en
            este ranking.
          </div>
        )}

        {top.map((row, index) => (
          <div
            className="top-row"
            key={row.pair_id}
          >
            <span
              className={`top-position ${
                index === 0
                  ? "first"
                  : ""
              }`}
            >
              {index + 1}
            </span>

            <div className="top-player">
              <strong>
                {row.players}
              </strong>

              <small>
                {row.number}ª · posición #
                {row.position}
              </small>
            </div>

            <span className="top-elo">
              {row.elo}
            </span>
          </div>
        ))}
      </div>

      <Link
        className="top-link"
        to="/ranking"
      >
        Ver ranking completo{" "}
        <span>→</span>
      </Link>
    </aside>
  );
}

function FeatureIcon({ type }) {
  if (type === "challenge") {
    return (
      <span className="feature-symbol">
        ♛
      </span>
    );
  }

  if (type === "coordination") {
    return (
      <span className="feature-symbol">
        ◎
      </span>
    );
  }

  if (type === "results") {
    return (
      <span className="feature-symbol">
        ▥
      </span>
    );
  }

  return (
    <span className="feature-symbol">
      ◉
    </span>
  );
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
            <div className="hero-mini">
              LA RED PÁDEL · SAN PEDRO
            </div>

            <h1>
              La Red
              <span>
                PÁDEL · SAN PEDRO
              </span>
            </h1>

            <p>
              Una liga abierta para
              jugadores de San Pedro.
              Desafiá, coordiná tu partido y
              competí para hacerte un lugar
              en La Red.
            </p>

            <div className="hero-buttons">
              <Link
                className="button button-green"
                to="/ranking"
              >
                <span className="button-icon">
                  ▥
                </span>
                VER RANKING
              </Link>

              <Link
                className="button button-outline"
                to="/login"
              >
                <span className="button-icon">
                  ♙
                </span>
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

            <p>
              Competí dentro de tu
              categoría.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon green">
              <FeatureIcon type="coordination" />
            </div>

            <h3>COORDINACIÓN</h3>

            <p>
              Contactate en privado y
              organizá el partido.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon blue">
              <FeatureIcon type="results" />
            </div>

            <h3>RESULTADOS</h3>

            <p>
              Cargá y confirmá tus partidos.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon green">
              <FeatureIcon type="community" />
            </div>

            <h3>LA RED PÁDEL</h3>

            <p>
              Comunidad, competencia y más
              juego.
            </p>
          </article>
        </div>
      </section>

      <section className="home-rules">
        <div className="rules-title">
          <span>CÓMO FUNCIONA</span>

          <h2>
            Jugá. Ganá.
            <br />
            Subí.
          </h2>
        </div>

        <div className="rules">
          <article>
            <strong>01</strong>

            <h3>
              Elegí tu categoría
            </h3>

            <p>
              Formá tu pareja e ingresá en
              la última posición disponible
              de tu categoría.
            </p>
          </article>

          <article>
            <strong>02</strong>

            <h3>
              Aceptá desafíos
            </h3>

            <p>
              Cada desafío aceptado tiene
              su propio plazo de 30 días
              para jugarse.
            </p>
          </article>

          <article>
            <strong>03</strong>

            <h3>
              Ganate el ascenso
            </h3>

            <p>
              Tres victorias consecutivas
              siendo líder pueden llevarte
              a la categoría superior.
            </p>
          </article>
        </div>
      </section>

      <footer className="footer">
        <div>
          <strong>
            LA RED PÁDEL · SAN PEDRO
          </strong>

          <span>
            Más pádel. Más comunidad.
          </span>
        </div>

        <div className="footer-links">
          <Link to="/ranking">
            Ranking
          </Link>

          <Link to="/login">
            Ingresar
          </Link>

          <Link to="/instalar">
            Instalar app
          </Link>
        </div>
      </footer>
    </Shell>
  );
}

function Login() {
  const navigate = useNavigate();

  const initialRegister =
    new URLSearchParams(
      window.location.search
    ).get("registro") === "1";

  const [mode, setMode] = useState(
    initialRegister
      ? "register"
      : "login"
  );

  const [form, setForm] = useState({
    gender: "male",
  });

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function submit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const url =
        mode === "login"
          ? "/auth/login"
          : "/auth/register";

      const { data } = await api.post(
        url,
        form
      );

      setSession(data);
      navigate("/liga");
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "No se pudo continuar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <section className="internal-page auth-page">
        <div className="auth-card">
          <div className="section-label">
            LA RED PÁDEL
          </div>

          <h1>
            {mode === "login"
              ? "Ingresar"
              : "Crear cuenta"}
          </h1>

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
                      onChange={(event) =>
                        setForm({
                          ...form,
                          firstName:
                            event.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Apellido

                    <input
                      required
                      placeholder="Apellido"
                      onChange={(event) =>
                        setForm({
                          ...form,
                          lastName:
                            event.target
                              .value,
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  WhatsApp

                  <input
                    required
                    placeholder="Ej: 3329..."
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Liga

                  <select
                    value={form.gender}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        gender:
                          event.target.value,
                      })
                    }
                  >
                    <option value="male">
                      Masculino
                    </option>

                    <option value="female">
                      Femenino
                    </option>
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
                onChange={(event) =>
                  setForm({
                    ...form,
                    email:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Contraseña

              <input
                required
                type="password"
                placeholder="••••••••"
                onChange={(event) =>
                  setForm({
                    ...form,
                    password:
                      event.target.value,
                  })
                }
              />
            </label>

            <button
              className="button button-green form-button"
              disabled={loading}
            >
              {loading
                ? "Cargando..."
                : "CONTINUAR"}
            </button>
          </form>

          {message && (
            <p className="error-message">
              {message}
            </p>
          )}

          <button
            className="mode-button"
            onClick={() => {
              setMessage("");

              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              );
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
  const [rows, setRows] =
    useState([]);

  const [gender, setGender] =
    useState("masculino");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    api
      .get("/ranking")
      .then((response) =>
        setRows(response.data || [])
      )
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) => row.slug === gender
      ),
    [rows, gender]
  );

  const categories = useMemo(() => {
    return filtered.reduce(
      (accumulator, row) => {
        const key = row.number;

        if (!accumulator[key]) {
          accumulator[key] = [];
        }

        accumulator[key].push(row);

        return accumulator;
      },
      {}
    );
  }, [filtered]);

  return (
    <Shell>
      <section className="internal-page ranking-page">
        <div className="page-title-row">
          <div>
            <div className="section-label">
              LA RED PÁDEL · SAN PEDRO
            </div>

            <h1>Ranking</h1>

            <p>
              La posición dentro de cada
              categoría define el orden
              competitivo.
            </p>
          </div>

          <div className="gender-switch">
            <button
              className={
                gender === "masculino"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setGender("masculino")
              }
            >
              Masculino
            </button>

            <button
              className={
                gender === "femenino"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setGender("femenino")
              }
            >
              Femenino
            </button>
          </div>
        </div>

        {loading && (
          <div className="empty-box">
            Cargando ranking...
          </div>
        )}

        {!loading &&
          filtered.length === 0 && (
            <div className="empty-box">
              Todavía no hay parejas en
              este ranking.
            </div>
          )}

        <div className="categories-grid">
          {Object.entries(categories)
            .sort(
              ([a], [b]) =>
                Number(a) - Number(b)
            )
            .map(
              ([
                number,
                categoryRows,
              ]) => (
                <section
                  className="ranking-card"
                  key={number}
                >
                  <div className="ranking-card-title">
                    <div>
                      <small>
                        CATEGORÍA
                      </small>

                      <strong>
                        {number}ª
                      </strong>
                    </div>

                    <span>
                      {
                        categoryRows.length
                      }{" "}
                      parejas
                    </span>
                  </div>

                  <div className="ranking-table-head">
                    <span>POS.</span>
                    <span>PAREJA</span>
                    <span>ELO</span>
                  </div>

                  {categoryRows
                    .sort(
                      (a, b) =>
                        Number(
                          a.position
                        ) -
                        Number(
                          b.position
                        )
                    )
                    .map((row) => (
                      <div
                        className="ranking-row"
                        key={
                          row.pair_id
                        }
                      >
                        <span className="ranking-position">
                          {row.position}
                        </span>

                        <strong>
                          {row.players}
                        </strong>

                        <span>
                          {row.elo}
                        </span>
                      </div>
                    ))}
                </section>
              )
            )}
        </div>
      </section>
    </Shell>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function daysRemaining(value) {
  if (!value) {
    return null;
  }

  const milliseconds =
    new Date(value).getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      milliseconds /
        (1000 * 60 * 60 * 24)
    )
  );
}

function statusLabel(status) {
  if (status === "observed") {
    return "Observada";
  }

  if (status === "review") {
    return "En revisión";
  }

  return "Activa";
}

function League() {
  const user = getUser();

  const [pair, setPair] =
    useState(null);

  const [players, setPlayers] =
    useState([]);

  const [opponents, setOpponents] =
    useState([]);

  const [inbox, setInbox] =
    useState([]);

  const [
    challenges,
    setChallenges,
  ] = useState([]);

  const [partner, setPartner] =
    useState("");

  const [category, setCategory] =
    useState(7);

  const [loading, setLoading] =
    useState(true);

  const [actionKey, setActionKey] =
    useState("");

  const [notice, setNotice] =
    useState(null);

  const [
    resultForms,
    setResultForms,
  ] = useState({});

  const [
    reportForms,
    setReportForms,
  ] = useState({});

  async function load() {
    try {
      setLoading(true);

      const [
        pairResponse,
        playersResponse,
        opponentsResponse,
        inboxResponse,
        challengesResponse,
      ] = await Promise.all([
        api.get("/me/pair"),
        api.get("/players"),
        api.get("/opponents"),
        api.get(
          "/challenges/inbox"
        ),
        api.get(
          "/challenges/mine"
        ),
      ]);

      setPair(
        pairResponse.data || null
      );

      setPlayers(
        playersResponse.data || []
      );

      setOpponents(
        opponentsResponse.data || []
      );

      setInbox(
        inboxResponse.data || []
      );

      setChallenges(
        challengesResponse.data || []
      );
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo cargar tu liga.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      load();
    } else {
      setLoading(false);
    }
  }, []);

  function updateResultForm(
    challengeId,
    changes
  ) {
    setResultForms(
      (current) => ({
        ...current,
        [challengeId]: {
          ...(current[
            challengeId
          ] || {}),
          ...changes,
        },
      })
    );
  }

  function updateReportForm(
    challengeId,
    changes
  ) {
    setReportForms(
      (current) => ({
        ...current,
        [challengeId]: {
          reason:
            current[challengeId]
              ?.reason ||
            "coordination_refusal",

          details:
            current[challengeId]
              ?.details || "",

          ...changes,
        },
      })
    );
  }

  async function makePair() {
    if (!partner) {
      return;
    }

    try {
      setActionKey("pair");
      setNotice(null);

      await api.post(
        "/pairs",
        {
          partnerId:
            Number(partner),

          category:
            Number(category),
        }
      );

      setPartner("");

      setNotice({
        type: "success",
        text:
          "Pareja creada. Ingresaron en la última posición disponible de la categoría.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo crear la pareja.",
      });
    } finally {
      setActionKey("");
    }
  }

  async function createChallenge(
    targetPairId
  ) {
    try {
      setActionKey(
        `create-${targetPairId}`
      );

      setNotice(null);

      await api.post(
        "/challenges",
        {
          targetPairId:
            Number(targetPairId),
        }
      );

      setNotice({
        type: "success",
        text:
          "Desafío enviado correctamente.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo crear el desafío.",
      });
    } finally {
      setActionKey("");
    }
  }

  async function acceptChallenge(
    challengeId
  ) {
    try {
      setActionKey(
        `accept-${challengeId}`
      );

      setNotice(null);

      await api.patch(
        `/challenges/${challengeId}/accept`
      );

      setNotice({
        type: "success",
        text:
          "Desafío aceptado. Desde ahora tienen 30 días para jugarlo.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo aceptar el desafío.",
      });
    } finally {
      setActionKey("");
    }
  }

  async function submitResult(
    challenge
  ) {
    const form =
      resultForms[challenge.id] ||
      {};

    if (!form.winnerPairId) {
      setNotice({
        type: "error",
        text:
          "Elegí la pareja ganadora.",
      });

      return;
    }

    try {
      setActionKey(
        `result-${challenge.id}`
      );

      setNotice(null);

      await api.post(
        "/matches",
        {
          challengeId:
            Number(challenge.id),

          winnerPairId:
            Number(
              form.winnerPairId
            ),

          score:
            form.score?.trim()
              ? {
                  text:
                    form.score.trim(),
                }
              : null,

          status: "confirmed",
        }
      );

      setNotice({
        type: "success",
        text:
          "Resultado cargado correctamente.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo cargar el resultado.",
      });
    } finally {
      setActionKey("");
    }
  }

  async function submitReport(
    challenge
  ) {
    const form =
      reportForms[challenge.id] ||
      {
        reason:
          "coordination_refusal",
        details: "",
      };

    if (
      form.reason === "other" &&
      !form.details?.trim()
    ) {
      setNotice({
        type: "error",
        text:
          "Explicá el motivo de la denuncia.",
      });

      return;
    }

    try {
      setActionKey(
        `report-${challenge.id}`
      );

      setNotice(null);

      await api.post(
        "/reports",
        {
          challengeId:
            Number(challenge.id),

          reason:
            form.reason,

          details:
            form.details?.trim() ||
            null,
        }
      );

      setNotice({
        type: "success",
        text:
          "Denuncia registrada para revisión.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo registrar la denuncia.",
      });
    } finally {
      setActionKey("");
    }
  }

  if (!user) {
    return (
      <Shell>
        <section className="internal-page league-page">
          <div className="empty-box">
            Iniciá sesión para entrar a
            tu liga.
          </div>

          <Link
            className="button button-green"
            to="/login"
          >
            INGRESAR
          </Link>
        </section>
      </Shell>
    );
  }

  const acceptedChallenges =
    challenges.filter(
      (challenge) =>
        challenge.status ===
        "accepted"
    );

  const pendingSent =
    challenges.filter(
      (challenge) =>
        challenge.status ===
          "pending" &&
        challenge.role ===
          "challenger"
    );

  return (
    <Shell>
      <section className="internal-page league-page">
        <div className="page-title-row">
          <div>
            <div className="section-label">
              ÁREA DE JUGADORES
            </div>

            <h1>Mi liga</h1>

            <p>
              Hola{" "}
              {user.first_name || ""}.
              Administrá tu pareja,
              desafíos y partidos.
            </p>
          </div>
        </div>

        {notice && (
          <div
            className={
              notice.type === "error"
                ? "error-message league-message"
                : "league-message"
            }
          >
            {notice.text}
          </div>
        )}

        {loading && (
          <div className="empty-box">
            Cargando tu liga...
          </div>
        )}

        {!loading && !pair && (
          <div className="league-dashboard">
            <section className="dashboard-card">
              <div className="dashboard-number">
                01
              </div>

              <h2>
                Formar pareja
              </h2>

              <p>
                Elegí a tu compañero/a
                y la categoría en la que
                van a comenzar.
              </p>

              <label>
                Compañero/a

                <select
                  value={partner}
                  onChange={(event) =>
                    setPartner(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Elegí jugador/a
                  </option>

                  {players.map(
                    (player) => (
                      <option
                        key={player.id}
                        value={player.id}
                      >
                        {
                          player.first_name
                        }{" "}
                        {
                          player.last_name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Categoría

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                >
                  {[
                    1, 2, 3, 4, 5,
                    6, 7,
                  ].map((number) => (
                    <option
                      value={number}
                      key={number}
                    >
                      {number}ª categoría
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="button button-green dashboard-button"
                onClick={makePair}
                disabled={
                  !partner ||
                  actionKey === "pair"
                }
              >
                {actionKey === "pair"
                  ? "CREANDO..."
                  : "CREAR PAREJA"}
              </button>
            </section>

            <section className="dashboard-card">
              <div className="dashboard-number">
                LA RED
              </div>

              <h2>
                Tu posición empieza acá
              </h2>

              <p>
                Al crear la pareja
                ingresan en la última
                posición disponible de
                la categoría elegida.
              </p>

              <div className="challenge-list">
                <div className="challenge-row">
                  <div>
                    <small>
                      1ª A 3ª
                    </small>

                    <strong>
                      Hasta 10 parejas
                    </strong>
                  </div>
                </div>

                <div className="challenge-row">
                  <div>
                    <small>
                      4ª A 6ª
                    </small>

                    <strong>
                      Hasta 30 parejas
                    </strong>
                  </div>
                </div>

                <div className="challenge-row">
                  <div>
                    <small>7ª</small>

                    <strong>
                      Sin límite
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {!loading && pair && (
          <>
            <div className="league-dashboard">
              <section className="dashboard-card">
                <div className="dashboard-number">
                  TU PAREJA
                </div>

                <h2>
                  {pair.players}
                </h2>

                <p>
                  {pair.league_name}
                </p>

                <div className="challenge-list">
                  <div className="challenge-row">
                    <div>
                      <small>
                        CATEGORÍA
                      </small>

                      <strong>
                        {
                          pair.category_number
                        }
                        ª
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>
                        POSICIÓN
                      </small>

                      <strong>
                        #{pair.position}
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>ELO</small>

                      <strong>
                        {pair.elo}
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>
                        ESTADO
                      </small>

                      <strong>
                        {statusLabel(
                          pair.status
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dashboard-card">
                <div className="dashboard-number">
                  RACHA
                </div>

                <h2>
                  Movimiento de categoría
                </h2>

                <p>
                  Las rachas cuentan para
                  el ascenso o descenso
                  cuando la pareja ocupa
                  el extremo de su
                  categoría.
                </p>

                <div className="challenge-list">
                  <div className="challenge-row">
                    <div>
                      <small>
                        VICTORIAS
                        CONSECUTIVAS
                      </small>

                      <strong>
                        {
                          pair.consecutive_wins
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>
                        DERROTAS
                        CONSECUTIVAS
                      </small>

                      <strong>
                        {
                          pair.consecutive_losses
                        }
                      </strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div
              className="league-dashboard"
              style={{
                marginTop: 18,
              }}
            >
              <section className="dashboard-card">
                <div className="dashboard-number">
                  01 · DESAFIAR
                </div>

                <h2>
                  Rivales de tu categoría
                </h2>

                <p>
                  La rueda prioriza
                  historial de cruces y
                  antigüedad de los
                  desafíos.
                </p>

                <div className="challenge-list">
                  {opponents.length ===
                    0 && (
                    <div className="challenge-empty">
                      Todavía no hay otras
                      parejas disponibles
                      en tu categoría.
                    </div>
                  )}

                  {opponents.map(
                    (opponent) => (
                      <div
                        className="challenge-row"
                        key={
                          opponent.pair_id
                        }
                      >
                        <div>
                          <small>
                            #
                            {
                              opponent.position
                            }{" "}
                            · ELO{" "}
                            {
                              opponent.elo
                            }
                          </small>

                          <strong>
                            {
                              opponent.players
                            }
                          </strong>

                          <small>
                            {
                              opponent.historical_meetings
                            }{" "}
                            cruces históricos
                          </small>
                        </div>

                        <button
                          disabled={
                            pair.status ===
                              "review" ||
                            actionKey ===
                              `create-${opponent.pair_id}`
                          }
                          onClick={() =>
                            createChallenge(
                              opponent.pair_id
                            )
                          }
                        >
                          {pair.status ===
                          "review"
                            ? "EN REVISIÓN"
                            : actionKey ===
                                `create-${opponent.pair_id}`
                              ? "ENVIANDO..."
                              : "DESAFIAR"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              </section>

              <section className="dashboard-card">
                <div className="dashboard-number">
                  02 · RECIBIDOS
                </div>

                <h2>
                  Desafíos pendientes
                </h2>

                <p>
                  Podés tener varios
                  desafíos aceptados al
                  mismo tiempo. Cada uno
                  tendrá su propio plazo
                  de 30 días.
                </p>

                <div className="challenge-list">
                  {inbox.length === 0 && (
                    <div className="challenge-empty">
                      No tenés desafíos
                      pendientes.
                    </div>
                  )}

                  {inbox.map(
                    (challenge) => (
                      <div
                        className="challenge-row"
                        key={challenge.id}
                      >
                        <div>
                          <small>
                            POSICIÓN #
                            {
                              challenge.challenger_position
                            }{" "}
                            · ELO{" "}
                            {
                              challenge.challenger_elo
                            }
                          </small>

                          <strong>
                            {
                              challenge.challenger_players
                            }
                          </strong>

                          <small>
                            Recibido{" "}
                            {formatDate(
                              challenge.created_at
                            )}
                          </small>
                        </div>

                        <button
                          disabled={
                            actionKey ===
                            `accept-${challenge.id}`
                          }
                          onClick={() =>
                            acceptChallenge(
                              challenge.id
                            )
                          }
                        >
                          {actionKey ===
                          `accept-${challenge.id}`
                            ? "ACEPTANDO..."
                            : "ACEPTAR"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>

            {pendingSent.length > 0 && (
              <section
                className="dashboard-card"
                style={{
                  marginTop: 18,
                  minHeight: "auto",
                }}
              >
                <div className="dashboard-number">
                  ENVIADOS
                </div>

                <h2>
                  Esperando respuesta
                </h2>

                <div className="challenge-list">
                  {pendingSent.map(
                    (challenge) => (
                      <div
                        className="challenge-row"
                        key={challenge.id}
                      >
                        <div>
                          <small>
                            DESAFÍO #
                            {challenge.id}
                          </small>

                          <strong>
                            {
                              challenge.opponent_players
                            }
                          </strong>

                          <small>
                            Enviado{" "}
                            {formatDate(
                              challenge.created_at
                            )}
                          </small>
                        </div>

                        <span>
                          Pendiente
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            <div
              style={{
                marginTop: 40,
              }}
            >
              <div className="section-label">
                PARTIDOS ACTIVOS
              </div>

              <h2
                style={{
                  fontSize: 38,
                  marginBottom: 20,
                }}
              >
                Desafíos aceptados
              </h2>
            </div>

            {acceptedChallenges.length ===
              0 && (
              <div className="empty-box">
                Todavía no tenés desafíos
                aceptados.
              </div>
            )}

            <div className="league-dashboard">
              {acceptedChallenges.map(
                (challenge) => {
                  const remaining =
                    daysRemaining(
                      challenge.play_deadline_at
                    );

                  const resultForm =
                    resultForms[
                      challenge.id
                    ] || {};

                  const reportForm =
                    reportForms[
                      challenge.id
                    ] || {
                      reason:
                        "coordination_refusal",
                      details: "",
                    };

                  const contacts =
                    Array.isArray(
                      challenge.opponent_contacts
                    )
                      ? challenge.opponent_contacts
                      : [];

                  return (
                    <section
                      className="dashboard-card"
                      key={challenge.id}
                    >
                      <div className="dashboard-number">
                        DESAFÍO #
                        {challenge.id}
                      </div>

                      <h2>
                        {
                          challenge.opponent_players
                        }
                      </h2>

                      <p>
                        Posición #
                        {
                          challenge.opponent_position
                        }{" "}
                        · ELO{" "}
                        {
                          challenge.opponent_elo
                        }
                      </p>

                      <div className="challenge-list">
                        <div className="challenge-row">
                          <div>
                            <small>
                              ACEPTADO
                            </small>

                            <strong>
                              {formatDate(
                                challenge.accepted_at
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="challenge-row">
                          <div>
                            <small>
                              FECHA LÍMITE
                            </small>

                            <strong>
                              {formatDate(
                                challenge.play_deadline_at
                              )}
                            </strong>

                            <small>
                              {remaining !==
                              null
                                ? `${remaining} días restantes`
                                : ""}
                            </small>
                          </div>
                        </div>
                      </div>

                      {contacts.length >
                        0 && (
                        <>
                          <h3>
                            Contacto privado
                          </h3>

                          <div className="challenge-list">
                            {contacts.map(
                              (
                                contact
                              ) => (
                                <div
                                  className="challenge-row"
                                  key={
                                    contact.id
                                  }
                                >
                                  <div>
                                    <small>
                                      JUGADOR
                                    </small>

                                    <strong>
                                      {
                                        contact.name
                                      }
                                    </strong>
                                  </div>

                                  <a
                                    href={`tel:${contact.phone}`}
                                  >
                                    {
                                      contact.phone
                                    }
                                  </a>
                                </div>
                              )
                            )}
                          </div>
                        </>
                      )}

                      <h3>
                        Cargar resultado
                      </h3>

                      <label>
                        Pareja ganadora

                        <select
                          value={
                            resultForm.winnerPairId ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateResultForm(
                              challenge.id,
                              {
                                winnerPairId:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                        >
                          <option value="">
                            Elegí ganador
                          </option>

                          <option
                            value={pair.id}
                          >
                            {pair.players}
                          </option>

                          <option
                            value={
                              challenge.opponent_pair_id
                            }
                          >
                            {
                              challenge.opponent_players
                            }
                          </option>
                        </select>
                      </label>

                      <label>
                        Resultado

                        <input
                          value={
                            resultForm.score ||
                            ""
                          }
                          placeholder="Ej: 6-4 3-6 10-8"
                          onChange={(
                            event
                          ) =>
                            updateResultForm(
                              challenge.id,
                              {
                                score:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                        />
                      </label>

                      <button
                        className="button button-green dashboard-button"
                        disabled={
                          actionKey ===
                          `result-${challenge.id}`
                        }
                        onClick={() =>
                          submitResult(
                            challenge
                          )
                        }
                      >
                        {actionKey ===
                        `result-${challenge.id}`
                          ? "CARGANDO..."
                          : "CARGAR RESULTADO"}
                      </button>

                      <h3
                        style={{
                          marginTop: 35,
                        }}
                      >
                        Reportar problema
                      </h3>

                      {challenge.report_submitted ? (
                        <div className="challenge-empty">
                          Ya registraste una
                          denuncia vinculada
                          a este desafío.
                        </div>
                      ) : (
                        <>
                          <label>
                            Motivo

                            <select
                              value={
                                reportForm.reason
                              }
                              onChange={(
                                event
                              ) =>
                                updateReportForm(
                                  challenge.id,
                                  {
                                    reason:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            >
                              <option value="coordination_refusal">
                                Rechazo o
                                negativa para
                                coordinar
                              </option>

                              <option value="no_show">
                                No se presentó
                              </option>

                              <option value="other">
                                Otro motivo
                              </option>
                            </select>
                          </label>

                          <label>
                            Detalle

                            <input
                              value={
                                reportForm.details
                              }
                              placeholder="Contanos brevemente qué pasó"
                              onChange={(
                                event
                              ) =>
                                updateReportForm(
                                  challenge.id,
                                  {
                                    details:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />
                          </label>

                          <button
                            className="button button-outline dashboard-button"
                            disabled={
                              actionKey ===
                              `report-${challenge.id}`
                            }
                            onClick={() =>
                              submitReport(
                                challenge
                              )
                            }
                          >
                            {actionKey ===
                            `report-${challenge.id}`
                              ? "ENVIANDO..."
                              : "ENVIAR REPORTE"}
                          </button>
                        </>
                      )}
                    </section>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}

function Install() {
  const [
    deferredPrompt,
    setDeferredPrompt,
  ] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();

      setDeferredPrompt(event);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler
    );

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );
  }, []);

  async function install() {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
  }

  return (
    <Shell>
      <section className="internal-page install-page">
        <div className="install-card">
          <img
            className="install-logo"
            src="/icon-192.png"
            alt="LA RED Pádel"
            style={{
              objectFit: "cover",
            }}
          />

          <div className="section-label">
            LA RED PÁDEL
          </div>

          <h1>
            Llevá la liga en el teléfono.
          </h1>

          <p>
            Instalá LA RED Pádel como
            aplicación para entrar más
            rápido al ranking, desafíos y
            resultados.
          </p>

          {deferredPrompt ? (
            <button
              className="button button-green"
              onClick={install}
            >
              INSTALAR AHORA
            </button>
          ) : (
            <div className="install-help">
              <strong>
                iPhone
              </strong>

              <span>
                Safari → Compartir →
                Agregar a pantalla de
                inicio.
              </span>

              <strong>
                Android
              </strong>

              <span>
                Abrí el menú del navegador
                y seleccioná Instalar
                aplicación.
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
      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/ranking"
        element={<Ranking />}
      />

      <Route
        path="/liga"
        element={<League />}
      />

      <Route
        path="/instalar"
        element={<Install />}
      />
    </Routes>
  );
}