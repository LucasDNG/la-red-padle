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
      localStorage.getItem(
        "user"
      )
    );
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function scoreText(score) {
  if (!score) {
    return "Sin marcador";
  }

  if (
    typeof score ===
    "string"
  ) {
    return score;
  }

  if (score.text) {
    return score.text;
  }

  try {
    return JSON.stringify(
      score
    );
  } catch {
    return "Resultado";
  }
}

function pairStatusLabel(
  status
) {
  if (
    status === "review"
  ) {
    return "En revisión";
  }

  if (
    status === "observed"
  ) {
    return "Observada";
  }

  if (
    status === "inactive"
  ) {
    return "Inactiva";
  }

  return "Activa";
}

function reportStatusLabel(
  status
) {
  if (
    status === "reviewed"
  ) {
    return "Revisada";
  }

  if (
    status === "dismissed"
  ) {
    return "Descartada";
  }

  return "Abierta";
}

function reasonLabel(
  reason
) {
  if (
    reason ===
    "coordination_refusal"
  ) {
    return "Negativa para coordinar";
  }

  if (
    reason ===
    "no_show"
  ) {
    return "No se presentó";
  }

  return "Otro motivo";
}

function logout() {
  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "user"
  );

  window.location.href =
    "/";
}

const gridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",

  gap: 16,
};

export default function AdminReports() {
  const navigate =
    useNavigate();

  const user =
    getUser();

  const [
    pairs,
    setPairs,
  ] = useState([]);

  const [
    history,
    setHistory,
  ] = useState(null);

  const [
    disputes,
    setDisputes,
  ] = useState([]);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("all");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionKey,
    setActionKey,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState(null);

  async function loadPairs() {
    const response =
      await api.get(
        "/admin/reports"
      );

    setPairs(
      response.data ||
        []
    );
  }

  async function loadDisputes() {
    const response =
      await api.get(
        "/admin/match-submissions/disputed"
      );

    setDisputes(
      response.data ||
        []
    );
  }

  async function loadAll() {
    try {
      setLoading(true);
      setNotice(null);

      await Promise.all([
        loadPairs(),
        loadDisputes(),
      ]);
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response
            ?.data
            ?.error ||
          "No se pudo cargar la administración.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(
    pairId
  ) {
    try {
      setActionKey(
        `history-${pairId}`
      );

      setNotice(null);

      const response =
        await api.get(
          `/admin/reports/${pairId}/history`
        );

      setHistory(
        response.data ||
          null
      );
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response
            ?.data
            ?.error ||
          "No se pudo cargar el historial.",
      });
    } finally {
      setActionKey("");
    }
  }

  async function changeReportStatus(
    reportId,
    status
  ) {
    try {
      setActionKey(
        `${reportId}-${status}`
      );

      setNotice(null);

      await api.patch(
        `/admin/reports/${reportId}`,
        {
          status,
        }
      );

      await loadPairs();

      if (
        history?.pair
          ?.pair_id
      ) {
        await loadHistory(
          history
            .pair
            .pair_id
        );
      }

      setNotice({
        type: "success",

        text:
          status ===
          "dismissed"
            ? "Denuncia descartada y disciplina recalculada."
            : "Denuncia marcada como revisada.",
      });
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response
            ?.data
            ?.error ||
          "No se pudo actualizar la denuncia.",
      });
    } finally {
      setActionKey("");
    }
  }

  async function resolveDispute(
    submissionId,
    action
  ) {
    try {
      setActionKey(
        `${submissionId}-${action}`
      );

      setNotice(null);

      await api.patch(
        `/admin/match-submissions/${submissionId}/resolve`,
        {
          action,
        }
      );

      await Promise.all([
        loadDisputes(),
        loadPairs(),
      ]);

      setNotice({
        type: "success",

        text:
          action ===
          "confirm"
            ? "Resultado validado. El partido ya impactó en rachas y categorías."
            : "Resultado rechazado. El desafío volvió a quedar disponible según su plazo original.",
      });
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response
            ?.data
            ?.error ||
          "No se pudo resolver el resultado.",
      });
    } finally {
      setActionKey("");
    }
  }

  useEffect(() => {
    if (!user) {
      navigate(
        "/login"
      );

      return;
    }

    if (
      user.role ===
      "admin"
    ) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, []);

  const filteredPairs =
    useMemo(
      () => {
        const search =
          query
            .trim()
            .toLowerCase();

        return pairs.filter(
          (pair) => {
            if (
              filter !==
                "all" &&
              pair.status !==
                filter
            ) {
              return false;
            }

            if (
              !search
            ) {
              return true;
            }

            return String(
              pair.players ||
                ""
            )
              .toLowerCase()
              .includes(
                search
              );
          }
        );
      },
      [
        pairs,
        query,
        filter,
      ]
    );

  if (!user) {
    return null;
  }

  if (
    user.role !==
    "admin"
  ) {
    return (
      <div className="app">
        <header className="header">
          <Link
            to="/"
            className="brand"
          >
            <span>
              LA RED
            </span>

            <small>
              PÁDEL · SAN PEDRO
            </small>
          </Link>
        </header>

        <main>
          <section className="internal-page">
            <div className="empty-box">
              Esta sección es
              exclusiva para
              administradores.
            </div>

            <Link
              className="button button-green"
              to="/liga"
            >
              VOLVER A MI LIGA
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const received =
    history?.summary
      ?.received;

  const sent =
    history?.summary
      ?.sent;

  return (
    <div className="app">
      <header className="header">
        <Link
          to="/"
          className="brand"
        >
          <span>
            LA RED
          </span>

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

          <Link to="/resultados">
            Resultados
          </Link>
        </nav>

        <div className="header-actions">
          <Link
            className="header-user"
            to="/liga"
          >
            {user.first_name ||
              "Admin"}
          </Link>

          <button
            className="header-link"
            onClick={logout}
          >
            Salir
          </button>
        </div>
      </header>

      <main>
        <section className="internal-page">
          <div className="page-title-row">
            <div>
              <div className="section-label">
                ADMINISTRACIÓN
              </div>

              <h1>
                Control de liga
              </h1>

              <p>
                Denuncias,
                historial de
                parejas y
                resultados en
                disputa.
              </p>
            </div>
          </div>

          {notice && (
            <div
              className={
                notice.type ===
                "error"
                  ? "error-message league-message"
                  : "league-message"
              }
            >
              {notice.text}
            </div>
          )}

          {loading && (
            <div className="empty-box">
              Cargando
              administración...
            </div>
          )}

          {!loading && (
            <>
              <section
                style={{
                  marginBottom:
                    46,
                }}
              >
                <div className="section-label">
                  RESULTADOS EN
                  DISPUTA
                </div>

                <h2
                  style={{
                    fontSize:
                      34,

                    margin:
                      "10px 0 18px",
                  }}
                >
                  Resolución
                  administrativa
                </h2>

                {disputes.length ===
                0 ? (
                  <div className="empty-box">
                    No hay
                    resultados en
                    disputa.
                  </div>
                ) : (
                  <div
                    style={
                      gridStyle
                    }
                  >
                    {disputes.map(
                      (
                        item
                      ) => (
                        <section
                          className="dashboard-card"
                          key={
                            item.id
                          }
                        >
                          <div className="dashboard-number">
                            DESAFÍO #
                            {
                              item.challenge_id
                            }
                          </div>

                          <h2>
                            {
                              item.pair_a_players
                            }{" "}
                            vs{" "}
                            {
                              item.pair_b_players
                            }
                          </h2>

                          <div className="challenge-list">
                            <div className="challenge-row">
                              <div>
                                <small>
                                  GANADOR
                                  CARGADO
                                </small>

                                <strong>
                                  {
                                    item.winner_players
                                  }
                                </strong>
                              </div>
                            </div>

                            <div className="challenge-row">
                              <div>
                                <small>
                                  RESULTADO
                                </small>

                                <strong>
                                  {scoreText(
                                    item.score
                                  )}
                                </strong>
                              </div>
                            </div>

                            <div className="challenge-row">
                              <div>
                                <small>
                                  CARGADO
                                  POR
                                </small>

                                <strong>
                                  {
                                    item.submitted_by_players
                                  }
                                </strong>
                              </div>
                            </div>

                            <div className="challenge-row">
                              <div>
                                <small>
                                  OBJETADO
                                  POR
                                </small>

                                <strong>
                                  {item.responded_by_players ||
                                    "Rival"}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="error-message">
                            {item.response_note ||
                              "Sin detalle del desacuerdo."}
                          </div>

                          <p
                            style={{
                              color:
                                "var(--muted)",
                            }}
                          >
                            Cargado{" "}
                            {formatDate(
                              item.created_at
                            )}
                          </p>

                          <button
                            className="button button-green dashboard-button"
                            disabled={
                              actionKey ===
                              `${item.id}-confirm`
                            }
                            onClick={() =>
                              resolveDispute(
                                item.id,
                                "confirm"
                              )
                            }
                          >
                            {actionKey ===
                            `${item.id}-confirm`
                              ? "VALIDANDO..."
                              : "VALIDAR RESULTADO"}
                          </button>

                          <button
                            className="button button-outline dashboard-button"
                            disabled={
                              actionKey ===
                              `${item.id}-reject`
                            }
                            onClick={() =>
                              resolveDispute(
                                item.id,
                                "reject"
                              )
                            }
                          >
                            {actionKey ===
                            `${item.id}-reject`
                              ? "RECHAZANDO..."
                              : "RECHAZAR RESULTADO"}
                          </button>
                        </section>
                      )
                    )}
                  </div>
                )}
              </section>

              <section>
                <div className="section-label">
                  DENUNCIAS
                </div>

                <h2
                  style={{
                    fontSize:
                      34,

                    margin:
                      "10px 0 18px",
                  }}
                >
                  Historial de
                  parejas
                </h2>

                <div
                  style={{
                    display:
                      "flex",

                    flexWrap:
                      "wrap",

                    gap: 10,

                    marginBottom:
                      22,
                  }}
                >
                  <input
                    value={
                      query
                    }
                    placeholder="Buscar pareja..."
                    onChange={(
                      event
                    ) => {
                      setQuery(
                        event
                          .target
                          .value
                      );
                    }}
                    style={{
                      maxWidth:
                        360,

                      marginTop:
                        0,
                    }}
                  />

                  <div className="gender-switch">
                    <button
                      className={
                        filter ===
                        "all"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFilter(
                          "all"
                        )
                      }
                    >
                      Todas
                    </button>

                    <button
                      className={
                        filter ===
                        "observed"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFilter(
                          "observed"
                        )
                      }
                    >
                      Observadas
                    </button>

                    <button
                      className={
                        filter ===
                        "review"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFilter(
                          "review"
                        )
                      }
                    >
                      En revisión
                    </button>
                  </div>
                </div>

                {filteredPairs.length ===
                0 ? (
                  <div className="empty-box">
                    No hay parejas
                    para este
                    filtro.
                  </div>
                ) : (
                  <div
                    style={
                      gridStyle
                    }
                  >
                    {filteredPairs.map(
                      (
                        pair
                      ) => (
                        <section
                          className="dashboard-card"
                          key={
                            pair.pair_id
                          }
                        >
                          <div className="dashboard-number">
                            {
                              pair.league_slug
                            }{" "}
                            ·{" "}
                            {
                              pair.category_number
                            }
                            ª · #
                            {
                              pair.position
                            }
                          </div>

                          <h2>
                            {
                              pair.players
                            }
                          </h2>

                          <p>
                            Estado:{" "}
                            <strong>
                              {pairStatusLabel(
                                pair.status
                              )}
                            </strong>
                          </p>

                          <div className="challenge-list">
                            <div className="challenge-row">
                              <div>
                                <small>
                                  RECIBIDAS
                                  ·
                                  HISTÓRICO
                                </small>

                                <strong>
                                  {
                                    pair.reports_received_total
                                  }
                                </strong>
                              </div>

                              <span>
                                {
                                  pair.distinct_reporters_total
                                }{" "}
                                denunciantes
                              </span>
                            </div>

                            <div className="challenge-row">
                              <div>
                                <small>
                                  RECIBIDAS
                                  · 180
                                  DÍAS
                                </small>

                                <strong>
                                  {
                                    pair.reports_received_180d_valid
                                  }
                                </strong>
                              </div>

                              <span>
                                {
                                  pair.distinct_reporters_180d_valid
                                }{" "}
                                distintos
                              </span>
                            </div>

                            <div className="challenge-row">
                              <div>
                                <small>
                                  REALIZADAS
                                  ·
                                  HISTÓRICO
                                </small>

                                <strong>
                                  {
                                    pair.reports_sent_total
                                  }
                                </strong>
                              </div>

                              <span>
                                {
                                  pair.distinct_reported_pairs_total
                                }{" "}
                                rivales
                              </span>
                            </div>

                            <div className="challenge-row">
                              <div>
                                <small>
                                  REALIZADAS
                                  · 180
                                  DÍAS
                                </small>

                                <strong>
                                  {
                                    pair.reports_sent_180d_total
                                  }
                                </strong>
                              </div>

                              <span>
                                {
                                  pair.distinct_reported_pairs_180d_total
                                }{" "}
                                rivales
                              </span>
                            </div>
                          </div>

                          <button
                            className="button button-outline dashboard-button"
                            disabled={
                              actionKey ===
                              `history-${pair.pair_id}`
                            }
                            onClick={() =>
                              loadHistory(
                                pair.pair_id
                              )
                            }
                          >
                            {actionKey ===
                            `history-${pair.pair_id}`
                              ? "CARGANDO..."
                              : "VER HISTORIAL"}
                          </button>
                        </section>
                      )
                    )}
                  </div>
                )}
              </section>

              {history &&
                received &&
                sent && (
                  <section
                    style={{
                      marginTop:
                        46,
                    }}
                  >
                    <div className="section-label">
                      HISTORIAL DE
                      PAREJA
                    </div>

                    <h2
                      style={{
                        fontSize:
                          36,

                        margin:
                          "10px 0 6px",
                      }}
                    >
                      {
                        history
                          .pair
                          .players
                      }
                    </h2>

                    <p
                      style={{
                        color:
                          "var(--muted)",
                      }}
                    >
                      {
                        history
                          .pair
                          .league_slug
                      }{" "}
                      ·{" "}
                      {
                        history
                          .pair
                          .category_number
                      }
                      ª · posición
                      #
                      {
                        history
                          .pair
                          .position
                      }{" "}
                      · ELO{" "}
                      {
                        history
                          .pair
                          .elo
                      }
                    </p>

                    <div
                      style={
                        gridStyle
                      }
                    >
                      <section className="dashboard-card">
                        <div className="dashboard-number">
                          RECIBIDAS
                        </div>

                        <h2>
                          {
                            received.total
                          }{" "}
                          históricas
                        </h2>

                        <div className="challenge-list">
                          <div className="challenge-row">
                            <div>
                              <small>
                                NO
                                DESCARTADAS
                              </small>

                              <strong>
                                {
                                  received.valid
                                }
                              </strong>
                            </div>
                          </div>

                          <div className="challenge-row">
                            <div>
                              <small>
                                ÚLTIMOS
                                180
                                DÍAS
                              </small>

                              <strong>
                                {
                                  received
                                    .last_180_days
                                    .valid
                                }
                              </strong>
                            </div>
                          </div>

                          <div className="challenge-row">
                            <div>
                              <small>
                                DENUNCIANTES
                                DISTINTOS
                                · 180
                                DÍAS
                              </small>

                              <strong>
                                {
                                  received
                                    .distinct_pairs_180d_valid
                                }
                              </strong>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="dashboard-card">
                        <div className="dashboard-number">
                          REALIZADAS
                        </div>

                        <h2>
                          {
                            sent.total
                          }{" "}
                          históricas
                        </h2>

                        <div className="challenge-list">
                          <div className="challenge-row">
                            <div>
                              <small>
                                NO
                                DESCARTADAS
                              </small>

                              <strong>
                                {
                                  sent.valid
                                }
                              </strong>
                            </div>
                          </div>

                          <div className="challenge-row">
                            <div>
                              <small>
                                ÚLTIMOS
                                180
                                DÍAS
                              </small>

                              <strong>
                                {
                                  sent
                                    .last_180_days
                                    .total
                                }
                              </strong>
                            </div>
                          </div>

                          <div className="challenge-row">
                            <div>
                              <small>
                                RIVALES
                                DISTINTOS
                                ·
                                HISTÓRICO
                              </small>

                              <strong>
                                {
                                  sent
                                    .distinct_pairs_total
                                }
                              </strong>
                            </div>
                          </div>

                          <div className="challenge-row">
                            <div>
                              <small>
                                RIVALES
                                DISTINTOS
                                · 180
                                DÍAS
                              </small>

                              <strong>
                                {
                                  sent
                                    .distinct_pairs_180d_total
                                }
                              </strong>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div
                      style={{
                        display:
                          "grid",

                        gap: 12,

                        marginTop:
                          18,
                      }}
                    >
                      {history
                        .reports
                        .length ===
                        0 && (
                        <div className="empty-box">
                          Esta
                          pareja
                          todavía
                          no tiene
                          denuncias
                          realizadas
                          ni
                          recibidas.
                        </div>
                      )}

                      {history
                        .reports
                        .map(
                          (
                            report
                          ) => {
                            const incoming =
                              report.direction ===
                              "received";

                            const counterpart =
                              incoming
                                ? report.reporter_players
                                : report.reported_players;

                            return (
                              <article
                                className="dashboard-card"
                                key={
                                  report.id
                                }
                              >
                                <div className="dashboard-number">
                                  {incoming
                                    ? "RECIBIDA"
                                    : "REALIZADA"}{" "}
                                  ·
                                  DENUNCIA
                                  #
                                  {
                                    report.id
                                  }
                                </div>

                                <h3>
                                  {
                                    counterpart
                                  }
                                </h3>

                                <p
                                  style={{
                                    color:
                                      "var(--muted)",
                                  }}
                                >
                                  Desafío
                                  #
                                  {
                                    report.challenge_id
                                  }{" "}
                                  ·{" "}
                                  {formatDate(
                                    report.created_at
                                  )}
                                </p>

                                <strong>
                                  {reasonLabel(
                                    report.reason
                                  )}
                                </strong>

                                {report.details && (
                                  <p>
                                    {
                                      report.details
                                    }
                                  </p>
                                )}

                                <p
                                  style={{
                                    color:
                                      "var(--muted)",
                                  }}
                                >
                                  Estado:{" "}
                                  {reportStatusLabel(
                                    report.status
                                  )}

                                  {report.in_last_180_days
                                    ? " · dentro de 180 días"
                                    : " · histórico"}
                                </p>

                                {report.reviewed_at && (
                                  <p
                                    style={{
                                      color:
                                        "var(--muted)",
                                    }}
                                  >
                                    Revisada{" "}
                                    {formatDate(
                                      report.reviewed_at
                                    )}

                                    {report.reviewer_name
                                      ? ` por ${report.reviewer_name}`
                                      : ""}
                                  </p>
                                )}

                                <div
                                  style={{
                                    display:
                                      "flex",

                                    flexWrap:
                                      "wrap",

                                    gap: 10,
                                  }}
                                >
                                  {report.status ===
                                    "open" && (
                                    <button
                                      className="button button-green"
                                      disabled={
                                        actionKey ===
                                        `${report.id}-reviewed`
                                      }
                                      onClick={() =>
                                        changeReportStatus(
                                          report.id,
                                          "reviewed"
                                        )
                                      }
                                    >
                                      {actionKey ===
                                      `${report.id}-reviewed`
                                        ? "GUARDANDO..."
                                        : "MARCAR REVISADA"}
                                    </button>
                                  )}

                                  {report.status !==
                                    "dismissed" && (
                                    <button
                                      className="button button-outline"
                                      disabled={
                                        actionKey ===
                                        `${report.id}-dismissed`
                                      }
                                      onClick={() =>
                                        changeReportStatus(
                                          report.id,
                                          "dismissed"
                                        )
                                      }
                                    >
                                      {actionKey ===
                                      `${report.id}-dismissed`
                                        ? "GUARDANDO..."
                                        : "DESCARTAR"}
                                    </button>
                                  )}
                                </div>
                              </article>
                            );
                          }
                        )}
                    </div>
                  </section>
                )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
