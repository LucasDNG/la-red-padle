import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { api } from "./api.js";

function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user")
    );
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("justRegistered");
  window.location.href = "/";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

  const ms = new Date(value).getTime() - Date.now();

  return Math.max(
    0,
    Math.ceil(ms / (1000 * 60 * 60 * 24))
  );
}

function eloText(value) {
  const number = Number(value || 0);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number
    .toFixed(2)
    .replace(".", ",")
    .replace(/,00$/, "");
}

export default function LeagueV2() {
  const navigate = useNavigate();
  const user = getUser();

  const [management, setManagement] = useState(null);
  const [opponents, setOpponents] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState("");
  const [notice, setNotice] = useState(null);
  const [resultForms, setResultForms] = useState({});
  const [reportForms, setReportForms] = useState({});

  async function load() {
    try {
      setLoading(true);

      const [
        managementResponse,
        opponentsResponse,
        inboxResponse,
        challengesResponse,
      ] = await Promise.all([
        api.get("/me/pair-management"),
        api.get("/opponents"),
        api.get("/challenges/inbox"),
        api.get("/challenges/mine"),
      ]);

      setManagement(managementResponse.data);
      setOpponents(opponentsResponse.data || []);
      setInbox(inboxResponse.data || []);
      setChallenges(challengesResponse.data || []);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
        return;
      }

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
    if (!user) {
      navigate("/login");
      return;
    }

    load();
  }, []);

  const pair = management?.pair || null;

  const accepted = useMemo(
    () =>
      challenges.filter(
        (challenge) => challenge.status === "accepted"
      ),
    [challenges]
  );

  const pendingSent = useMemo(
    () =>
      challenges.filter(
        (challenge) =>
          challenge.status === "pending" &&
          challenge.role === "challenger"
      ),
    [challenges]
  );

  function updateResultForm(challengeId, changes) {
    setResultForms((current) => ({
      ...current,
      [challengeId]: {
        ...(current[challengeId] || {}),
        ...changes,
      },
    }));
  }

  function updateReportForm(challengeId, changes) {
    setReportForms((current) => ({
      ...current,
      [challengeId]: {
        reason:
          current[challengeId]?.reason ||
          "coordination_refusal",
        details:
          current[challengeId]?.details || "",
        ...changes,
      },
    }));
  }

  async function createChallenge(targetPairId) {
    try {
      setActionKey(`create-${targetPairId}`);
      setNotice(null);

      await api.post("/challenges", {
        targetPairId: Number(targetPairId),
      });

      setNotice({
        type: "success",
        text:
          "Desafío enviado. La otra pareja tiene 30 días para aceptarlo.",
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

  async function acceptChallenge(challengeId) {
    try {
      setActionKey(`accept-${challengeId}`);
      setNotice(null);

      await api.patch(
        `/challenges/${challengeId}/accept`
      );

      setNotice({
        type: "success",
        text:
          "Desafío aceptado. Desde ahora tienen 90 días para jugarlo y resolverlo.",
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

  async function submitResult(challenge) {
    const form = resultForms[challenge.id] || {};

    if (!form.winnerPairId) {
      setNotice({
        type: "error",
        text: "Elegí la pareja ganadora.",
      });
      return;
    }

    try {
      setActionKey(`result-${challenge.id}`);
      setNotice(null);

      await api.post("/matches", {
        challengeId: Number(challenge.id),
        winnerPairId: Number(form.winnerPairId),
        score: form.score?.trim()
          ? { text: form.score.trim() }
          : null,
      });

      setNotice({
        type: "success",
        text:
          "Resultado cargado. Falta la confirmación de la otra pareja.",
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

  async function submitReport(challenge) {
    const form = reportForms[challenge.id] || {
      reason: "coordination_refusal",
      details: "",
    };

    if (
      form.reason === "other" &&
      !form.details?.trim()
    ) {
      setNotice({
        type: "error",
        text: "Explicá el motivo de la denuncia.",
      });
      return;
    }

    try {
      setActionKey(`report-${challenge.id}`);
      setNotice(null);

      await api.post("/reports", {
        challengeId: Number(challenge.id),
        reason: form.reason,
        details: form.details?.trim() || null,
      });

      setNotice({
        type: "success",
        text: "Denuncia registrada para revisión.",
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
    return null;
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">
          <span>LA RED</span>
          <small>PÁDEL · SAN PEDRO</small>
        </Link>

        <nav className="nav">
          <Link to="/">Inicio</Link>
          <Link to="/ranking">Ranking</Link>
          <Link to="/liga">Mi liga</Link>
          <Link to="/resultados">Resultados</Link>
          {user.role === "admin" && (
            <Link to="/admin/reportes">Admin</Link>
          )}
          <Link to="/instalar">Instalar</Link>
        </nav>

        <div className="header-actions">
          <span className="header-user">
            {user.first_name || "Mi cuenta"}
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
        <section className="internal-page league-page">
          <div className="page-title-row">
            <div>
              <div className="section-label">
                ÁREA DE JUGADORES
              </div>
              <h1>Mi liga</h1>
              <p>
                Tu posición se gana en cancha: si vencés a una pareja que está arriba, intercambian lugares.
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
                  PAREJA
                </div>
                <h2>Formá tu pareja cuando quieras</h2>
                <p>
                  No necesitás una pareja para tener cuenta. Cuando estés listo/a, gestionála desde un único lugar.
                </p>
                <Link
                  className="button button-green dashboard-button"
                  to="/pareja"
                >
                  GESTIONAR PAREJA
                </Link>
              </section>

              <section className="dashboard-card">
                <div className="dashboard-number">
                  CATEGORÍAS
                </div>
                <h2>Sin cupos</h2>
                <p>
                  Todas las categorías aceptan cualquier cantidad de parejas. No existe lista de espera por capacidad.
                </p>
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
                  <h2>{pair.players}</h2>
                  <p>{pair.league_name}</p>

                  <div className="challenge-list">
                    <div className="challenge-row">
                      <div>
                        <small>CATEGORÍA</small>
                        <strong>
                          {pair.category_number}ª
                        </strong>
                      </div>
                    </div>

                    <div className="challenge-row">
                      <div>
                        <small>POSICIÓN</small>
                        <strong>#{pair.position}</strong>
                      </div>
                    </div>

                    <div className="challenge-row">
                      <div>
                        <small>ELO</small>
                        <strong>{eloText(pair.elo)}</strong>
                      </div>
                    </div>

                    <div className="challenge-row">
                      <div>
                        <small>RACHA</small>
                        <strong>
                          {Number(pair.consecutive_wins || 0)} G · {Number(pair.consecutive_losses || 0)} P
                        </strong>
                      </div>
                    </div>

                    <div className="challenge-row">
                      <div>
                        <small>DEUDA DE POSICIÓN</small>
                        <strong>
                          {Number(pair.position_penalty_debt || 0)}
                        </strong>
                      </div>
                    </div>

                    {Number(pair.category_number) === 1 &&
                      Number(pair.position) === 1 && (
                      <div className="challenge-row">
                        <div>
                          <small>DEFENSAS DEL #1</small>
                          <strong>
                            {Number(pair.first_place_defenses || 0)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    className="button button-outline dashboard-button"
                    to="/pareja"
                  >
                    GESTIONAR PAREJA
                  </Link>
                </section>

                <section className="dashboard-card">
                  <div className="dashboard-number">
                    RUEDA
                  </div>
                  <h2>Rivales disponibles</h2>
                  <p>
                    La rueda prioriza menos cruces históricos y antigüedad.
                  </p>

                  {opponents.length === 0 ? (
                    <div className="challenge-empty">
                      No hay otros rivales activos en tu categoría.
                    </div>
                  ) : (
                    <div className="challenge-list">
                      {opponents.map((opponent) => (
                        <div
                          className="challenge-row"
                          key={opponent.pair_id}
                        >
                          <div>
                            <small>
                              #{opponent.position} · {opponent.historical_meetings} cruces
                            </small>
                            <strong>{opponent.players}</strong>
                          </div>

                          <button
                            className="button button-outline mini-action"
                            disabled={
                              actionKey ===
                              `create-${opponent.pair_id}`
                            }
                            onClick={() =>
                              createChallenge(
                                opponent.pair_id
                              )
                            }
                          >
                            {actionKey ===
                            `create-${opponent.pair_id}`
                              ? "ENVIANDO..."
                              : "DESAFIAR"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="competition-section">
                <div className="section-label">
                  DESAFÍOS RECIBIDOS
                </div>
                <h2>30 días para aceptar</h2>

                {inbox.length === 0 ? (
                  <div className="empty-box">
                    No tenés desafíos pendientes de aceptar.
                  </div>
                ) : (
                  <div className="league-dashboard">
                    {inbox.map((challenge) => {
                      const remaining = daysRemaining(
                        challenge.response_deadline_at
                      );

                      return (
                        <section
                          className="dashboard-card"
                          key={challenge.id}
                        >
                          <div className="dashboard-number">
                            DESAFÍO #{challenge.id}
                          </div>
                          <h2>
                            {challenge.challenger_players}
                          </h2>
                          <p>
                            Posición #{challenge.challenger_position} · ELO {eloText(challenge.challenger_elo)}
                          </p>

                          <div className="challenge-list">
                            <div className="challenge-row">
                              <div>
                                <small>VENCE PARA ACEPTAR</small>
                                <strong>
                                  {formatDate(
                                    challenge.response_deadline_at
                                  )}
                                </strong>
                              </div>
                              <span>
                                {remaining === null
                                  ? ""
                                  : `${remaining} días`}
                              </span>
                            </div>
                          </div>

                          <button
                            className="button button-green dashboard-button"
                            disabled={
                              actionKey ===
                              `accept-${challenge.id}`
                            }
                            onClick={() =>
                              acceptChallenge(challenge.id)
                            }
                          >
                            {actionKey ===
                            `accept-${challenge.id}`
                              ? "ACEPTANDO..."
                              : "ACEPTAR DESAFÍO"}
                          </button>

                          <small className="rule-note">
                            Si no lo aceptás dentro del plazo, perdés un puesto. Si ya estás último/a, se acumula una deuda de posición.
                          </small>
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="competition-section">
                <div className="section-label">
                  DESAFÍOS ENVIADOS
                </div>
                <h2>Pendientes de aceptación</h2>

                {pendingSent.length === 0 ? (
                  <div className="empty-box">
                    No tenés desafíos enviados pendientes.
                  </div>
                ) : (
                  <div className="league-dashboard">
                    {pendingSent.map((challenge) => (
                      <section
                        className="dashboard-card"
                        key={challenge.id}
                      >
                        <div className="dashboard-number">
                          DESAFÍO #{challenge.id}
                        </div>
                        <h2>{challenge.opponent_players}</h2>
                        <p>
                          Tiene tiempo hasta {formatDate(challenge.response_deadline_at)} para aceptar.
                        </p>
                      </section>
                    ))}
                  </div>
                )}
              </section>

              <section className="competition-section">
                <div className="section-label">
                  PARTIDOS ACTIVOS
                </div>
                <h2>90 días desde la aceptación</h2>

                {accepted.length === 0 ? (
                  <div className="empty-box">
                    No tenés desafíos aceptados pendientes de resolución.
                  </div>
                ) : (
                  <div className="league-dashboard">
                    {accepted.map((challenge) => {
                      const remaining = daysRemaining(
                        challenge.play_deadline_at
                      );
                      const form =
                        resultForms[challenge.id] || {};
                      const report =
                        reportForms[challenge.id] || {
                          reason: "coordination_refusal",
                          details: "",
                        };
                      const contacts = Array.isArray(
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
                            DESAFÍO #{challenge.id}
                          </div>
                          <h2>{challenge.opponent_players}</h2>
                          <p>
                            Fecha límite: {formatDate(challenge.play_deadline_at)}
                            {remaining !== null
                              ? ` · ${remaining} días restantes`
                              : ""}
                          </p>

                          <div className="challenge-list">
                            {contacts.map((contact) => (
                              <div
                                className="challenge-row"
                                key={contact.id}
                              >
                                <div>
                                  <small>CONTACTO</small>
                                  <strong>{contact.name}</strong>
                                </div>
                                <a href={`tel:${contact.phone}`}>
                                  {contact.phone}
                                </a>
                              </div>
                            ))}
                          </div>

                          <h3>Cargar resultado</h3>

                          <label>
                            Pareja ganadora
                            <select
                              value={form.winnerPairId || ""}
                              onChange={(event) =>
                                updateResultForm(
                                  challenge.id,
                                  {
                                    winnerPairId:
                                      event.target.value,
                                  }
                                )
                              }
                            >
                              <option value="">
                                Elegí ganador
                              </option>
                              <option value={pair.id}>
                                {pair.players}
                              </option>
                              <option
                                value={
                                  challenge.opponent_pair_id
                                }
                              >
                                {challenge.opponent_players}
                              </option>
                            </select>
                          </label>

                          <label>
                            Resultado (cargado desde la pareja ganadora)
                            <input
                              value={form.score || ""}
                              placeholder="Ej: 6-4 3-6 10-8"
                              onChange={(event) =>
                                updateResultForm(
                                  challenge.id,
                                  {
                                    score: event.target.value,
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
                              submitResult(challenge)
                            }
                          >
                            {actionKey ===
                            `result-${challenge.id}`
                              ? "CARGANDO..."
                              : "CARGAR RESULTADO"}
                          </button>

                          <h3>Reportar problema</h3>

                          {challenge.report_submitted ? (
                            <div className="challenge-empty">
                              Ya registraste una denuncia para este desafío.
                            </div>
                          ) : (
                            <>
                              <label>
                                Motivo
                                <select
                                  value={report.reason}
                                  onChange={(event) =>
                                    updateReportForm(
                                      challenge.id,
                                      {
                                        reason:
                                          event.target.value,
                                      }
                                    )
                                  }
                                >
                                  <option value="coordination_refusal">
                                    Rechazo o negativa para coordinar
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
                                  value={report.details}
                                  placeholder="Contanos brevemente qué pasó"
                                  onChange={(event) =>
                                    updateReportForm(
                                      challenge.id,
                                      {
                                        details:
                                          event.target.value,
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
                                  submitReport(challenge)
                                }
                              >
                                {actionKey ===
                                `report-${challenge.id}`
                                  ? "ENVIANDO..."
                                  : "ENVIAR REPORTE"}
                              </button>
                            </>
                          )}

                          <small className="rule-note">
                            Si pasan 90 días sin resolverlo, ambas parejas pierden un puesto. Si alguna ya está última, acumula deuda.
                          </small>
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
