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

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 14,
  },

  compactCard: {
    minHeight: "auto",
    padding: 22,
  },

  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    marginBottom: 24,
  },

  history: {
    display: "grid",
    gap: 12,
    marginTop: 18,
  },

  historyCard: {
    border:
      "1px solid rgba(72, 166, 231, 0.25)",
    background:
      "linear-gradient(145deg, #062b49, #041b30)",
    padding: 20,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    border:
      "1px solid rgba(255,255,255,.16)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: ".08em",
  },

  smallButton: {
    minHeight: 40,
    width: "auto",
    padding: "0 14px",
  },
};

function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user")
    );
  } catch {
    return null;
  }
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
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function pairStatusLabel(status) {
  if (status === "review") {
    return "En revisión";
  }

  if (status === "observed") {
    return "Observada";
  }

  if (status === "inactive") {
    return "Inactiva";
  }

  return "Activa";
}

function reportStatusLabel(status) {
  if (status === "reviewed") {
    return "Revisada";
  }

  if (status === "dismissed") {
    return "Descartada";
  }

  return "Abierta";
}

function reasonLabel(reason) {
  if (reason === "coordination_refusal") {
    return "Negativa para coordinar";
  }

  if (reason === "no_show") {
    return "No se presentó";
  }

  return "Otro motivo";
}

function StatRow({
  label,
  value,
  aside,
}) {
  return (
    <div className="challenge-row">
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>

      {aside !== undefined && (
        <span>{aside}</span>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  headline,
  rows,
}) {
  return (
    <section
      className="dashboard-card"
      style={styles.compactCard}
    >
      <div className="dashboard-number">
        {title}
      </div>

      <h2>{headline}</h2>

      <div className="challenge-list">
        {rows.map((row) => (
          <StatRow
            key={row.label}
            {...row}
          />
        ))}
      </div>
    </section>
  );
}

export default function AdminReports() {
  const navigate = useNavigate();
  const user = getUser();

  const [pairs, setPairs] =
    useState([]);

  const [
    selectedPairId,
    setSelectedPairId,
  ] = useState(null);

  const [history, setHistory] =
    useState(null);

  const [query, setQuery] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [actionKey, setActionKey] =
    useState("");

  const [notice, setNotice] =
    useState(null);

  async function loadPairs() {
    const response =
      await api.get("/admin/reports");

    setPairs(response.data || []);
  }

  async function loadHistory(pairId) {
    setHistoryLoading(true);

    try {
      const response =
        await api.get(
          `/admin/reports/${pairId}/history`
        );

      setHistory(response.data);

      setSelectedPairId(
        Number(pairId)
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function load() {
    try {
      setLoading(true);
      setNotice(null);

      await loadPairs();
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response?.data?.error ||
          "No se pudo cargar administración.",
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

    if (user.role !== "admin") {
      setLoading(false);
      return;
    }

    load();
  }, []);

  const filteredPairs = useMemo(
    () => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      return pairs.filter((pair) => {
        if (
          filter !== "all" &&
          pair.status !== filter
        ) {
          return false;
        }

        if (!normalized) {
          return true;
        }

        return String(
          pair.players || ""
        )
          .toLowerCase()
          .includes(normalized);
      });
    },

    [pairs, query, filter]
  );

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

      if (selectedPairId) {
        await loadHistory(
          selectedPairId
        );
      }

      setNotice({
        type: "success",

        text:
          status === "dismissed"
            ? "Denuncia descartada. El estado de la pareja fue recalculado."
            : "Denuncia marcada como revisada.",
      });
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response?.data?.error ||
          "No se pudo actualizar la denuncia.",
      });
    } finally {
      setActionKey("");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/";
  }

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
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
        </header>

        <main>
          <section className="internal-page">
            <div className="empty-box">
              Esta sección es exclusiva
              para administradores.
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
    history?.summary?.received;

  const sent =
    history?.summary?.sent;

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
        </nav>

        <div className="header-actions">
          <Link
            className="header-user"
            to="/liga"
          >
            {user.first_name || "Admin"}
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
                Denuncias
              </h1>

              <p>
                Historial completo,
                actividad de los últimos
                180 días y revisión de
                cada caso.
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

          <div style={styles.toolbar}>
            <input
              value={query}
              placeholder="Buscar pareja..."
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              style={{
                maxWidth: 360,
                marginTop: 0,
              }}
            />

            <div className="gender-switch">
              <button
                className={
                  filter === "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                Todas
              </button>

              <button
                className={
                  filter === "observed"
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
                  filter === "review"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter("review")
                }
              >
                En revisión
              </button>
            </div>
          </div>

          {loading && (
            <div className="empty-box">
              Cargando denuncias...
            </div>
          )}

          {!loading &&
            filteredPairs.length ===
              0 && (
              <div className="empty-box">
                No hay parejas para este
                filtro.
              </div>
            )}

          <div style={styles.grid}>
            {filteredPairs.map(
              (pair) => (
                <section
                  className="dashboard-card"
                  style={
                    styles.compactCard
                  }
                  key={pair.pair_id}
                >
                  <div className="dashboard-number">
                    {pair.league_slug} ·{" "}
                    {
                      pair.category_number
                    }
                    ª · #
                    {pair.position}
                  </div>

                  <h2>
                    {pair.players}
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
                    <StatRow
                      label="RECIBIDAS · HISTÓRICO"
                      value={
                        pair.reports_received_total
                      }
                      aside={`${pair.distinct_reporters_total} denunciantes`}
                    />

                    <StatRow
                      label="RECIBIDAS · 180 DÍAS"
                      value={
                        pair.reports_received_180d_valid
                      }
                      aside={`${pair.distinct_reporters_180d_valid} distintos`}
                    />

                    <StatRow
                      label="REALIZADAS · HISTÓRICO"
                      value={
                        pair.reports_sent_total
                      }
                      aside={`${pair.distinct_reported_pairs_total} rivales`}
                    />

                    <StatRow
                      label="REALIZADAS · 180 DÍAS"
                      value={
                        pair.reports_sent_180d_total
                      }
                      aside={`${pair.distinct_reported_pairs_180d_total} rivales`}
                    />
                  </div>

                  <button
                    className="button button-outline dashboard-button"
                    onClick={() =>
                      loadHistory(
                        pair.pair_id
                      )
                    }
                  >
                    VER HISTORIAL
                  </button>
                </section>
              )
            )}
          </div>

          {historyLoading && (
            <div
              className="empty-box"
              style={{
                marginTop: 30,
              }}
            >
              Cargando historial...
            </div>
          )}

          {!historyLoading &&
            history && (
              <section
                style={{
                  marginTop: 46,
                }}
              >
                <div className="section-label">
                  HISTORIAL DE PAREJA
                </div>

                <h2
                  style={{
                    fontSize: 40,
                    margin:
                      "10px 0 8px",
                  }}
                >
                  {
                    history.pair
                      .players
                  }
                </h2>

                <p
                  style={{
                    color:
                      "var(--muted)",
                    marginTop: 0,
                  }}
                >
                  {
                    history.pair
                      .league_slug
                  }{" "}
                  ·{" "}
                  {
                    history.pair
                      .category_number
                  }
                  ª · posición #
                  {
                    history.pair
                      .position
                  }{" "}
                  · ELO{" "}
                  {history.pair.elo}
                </p>

                <div style={styles.grid}>
                  <SummaryCard
                    title="RECIBIDAS"
                    headline={`${received.total} históricas`}
                    rows={[
                      {
                        label:
                          "NO DESCARTADAS",

                        value:
                          received.valid,
                      },

                      {
                        label:
                          "ÚLTIMOS 180 DÍAS",

                        value:
                          received
                            .last_180_days
                            .valid,
                      },

                      {
                        label:
                          "DENUNCIANTES DISTINTOS · 180 DÍAS",

                        value:
                          received
                            .distinct_pairs_180d_valid,
                      },
                    ]}
                  />

                  <SummaryCard
                    title="REALIZADAS"
                    headline={`${sent.total} históricas`}
                    rows={[
                      {
                        label:
                          "NO DESCARTADAS",

                        value:
                          sent.valid,
                      },

                      {
                        label:
                          "ÚLTIMOS 180 DÍAS",

                        value:
                          sent
                            .last_180_days
                            .total,
                      },

                      {
                        label:
                          "RIVALES DISTINTOS · HISTÓRICO",

                        value:
                          sent
                            .distinct_pairs_total,
                      },
                    ]}
                  />
                </div>

                <div style={styles.history}>
                  {history.reports
                    .length === 0 && (
                    <div className="empty-box">
                      Esta pareja todavía
                      no tiene denuncias
                      realizadas ni
                      recibidas.
                    </div>
                  )}

                  {history.reports.map(
                    (report) => {
                      const incoming =
                        report.direction ===
                        "received";

                      const counterpart =
                        incoming
                          ? report
                              .reporter_players
                          : report
                              .reported_players;

                      return (
                        <article
                          key={report.id}
                          style={
                            styles.historyCard
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",

                              justifyContent:
                                "space-between",

                              alignItems:
                                "flex-start",

                              gap: 14,

                              flexWrap:
                                "wrap",
                            }}
                          >
                            <div>
                              <div className="dashboard-number">
                                {incoming
                                  ? "RECIBIDA"
                                  : "REALIZADA"}{" "}
                                · DENUNCIA #
                                {
                                  report.id
                                }
                              </div>

                              <h3
                                style={{
                                  fontSize:
                                    22,

                                  margin:
                                    "8px 0 4px",
                                }}
                              >
                                {counterpart}
                              </h3>

                              <small
                                style={{
                                  color:
                                    "var(--muted)",
                                }}
                              >
                                Desafío #
                                {
                                  report.challenge_id
                                }{" "}
                                ·{" "}
                                {formatDate(
                                  report.created_at
                                )}
                              </small>
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",

                                gap: 8,

                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <span
                                style={
                                  styles.badge
                                }
                              >
                                {reportStatusLabel(
                                  report.status
                                )}
                              </span>

                              {report.in_last_180_days && (
                                <span
                                  style={
                                    styles.badge
                                  }
                                >
                                  180 DÍAS
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop:
                                16,

                              color:
                                "var(--muted)",

                              lineHeight:
                                1.6,
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "white",
                              }}
                            >
                              {reasonLabel(
                                report.reason
                              )}
                            </strong>

                            {report.details && (
                              <p
                                style={{
                                  margin:
                                    "7px 0 0",
                                }}
                              >
                                {
                                  report.details
                                }
                              </p>
                            )}

                            {report.reviewed_at && (
                              <p
                                style={{
                                  margin:
                                    "7px 0 0",

                                  fontSize:
                                    12,
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
                          </div>

                          <div
                            style={{
                              display:
                                "flex",

                              gap: 10,

                              flexWrap:
                                "wrap",

                              marginTop:
                                18,
                            }}
                          >
                            {report.status !==
                              "reviewed" && (
                              <button
                                className="button button-green"
                                style={
                                  styles.smallButton
                                }
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
                                style={
                                  styles.smallButton
                                }
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
                    })}
                </div>
              </section>
            )}
        </section>
      </main>
    </div>
  );
}