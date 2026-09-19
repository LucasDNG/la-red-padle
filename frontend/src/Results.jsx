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

function ResultCard({
  submission,
  actionKey,
  disputeNote,
  setDisputeNote,
  onConfirm,
  onDispute,
}) {
  const received =
    submission.role ===
    "received";

  const disputed =
    submission.status ===
    "disputed";

  return (
    <section className="dashboard-card">
      <div className="dashboard-number">
        DESAFÍO #
        {submission.challenge_id}
      </div>

      <h2>
        {
          submission.opponent_players
        }
      </h2>

      <p>
        Resultado cargado{" "}
        {formatDate(
          submission.created_at
        )}
      </p>

      <div className="challenge-list">
        <div className="challenge-row">
          <div>
            <small>
              GANADOR PROPUESTO
            </small>

            <strong>
              {
                submission.winner_players
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
                submission.score
              )}
            </strong>
          </div>
        </div>

        <div className="challenge-row">
          <div>
            <small>
              CARGADO POR
            </small>

            <strong>
              {
                submission
                  .submitted_by_players
              }
            </strong>
          </div>
        </div>

        {submission
          .play_deadline_at && (
          <div className="challenge-row">
            <div>
              <small>
                FECHA LÍMITE ORIGINAL
              </small>

              <strong>
                {formatDate(
                  submission
                    .play_deadline_at
                )}
              </strong>
            </div>
          </div>
        )}
      </div>

      {disputed && (
        <div className="error-message">
          <strong>
            Resultado objetado.
          </strong>

          <div
            style={{
              marginTop: 8,
            }}
          >
            {submission
              .response_note ||
              "Pendiente de revisión administrativa."}
          </div>
        </div>
      )}

      {!disputed &&
        received && (
        <>
          <button
            className="button button-green dashboard-button"
            disabled={
              actionKey ===
              `confirm-${submission.id}`
            }
            onClick={() =>
              onConfirm(
                submission.id
              )
            }
          >
            {actionKey ===
            `confirm-${submission.id}`
              ? "CONFIRMANDO..."
              : "CONFIRMAR RESULTADO"}
          </button>

          <label>
            Si no coincide, explicá
            brevemente qué pasó

            <input
              value={
                disputeNote ||
                ""
              }
              placeholder="Ej: el ganador o el marcador no coincide"
              onChange={(
                event
              ) =>
                setDisputeNote(
                  event.target
                    .value
                )
              }
            />
          </label>

          <button
            className="button button-outline dashboard-button"
            disabled={
              actionKey ===
              `dispute-${submission.id}`
            }
            onClick={() =>
              onDispute(
                submission.id
              )
            }
          >
            {actionKey ===
            `dispute-${submission.id}`
              ? "ENVIANDO..."
              : "NO COINCIDE"}
          </button>
        </>
      )}

      {!disputed &&
        !received && (
        <div className="challenge-empty">
          Esperando confirmación
          de la otra pareja.
        </div>
      )}
    </section>
  );
}

export default function Results() {
  const navigate =
    useNavigate();

  const user =
    getUser();

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [notice, setNotice] =
    useState(null);

  const [
    actionKey,
    setActionKey,
  ] = useState("");

  const [
    disputeNotes,
    setDisputeNotes,
  ] = useState({});

  async function load() {
    try {
      setLoading(true);

      const response =
        await api.get(
          "/match-submissions/mine"
        );

      setRows(
        response.data || []
      );
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response
            ?.data?.error ||
          "No se pudieron cargar los resultados.",
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

  const awaiting =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.status ===
              "pending" &&
            row.role ===
              "received"
        ),
      [rows]
    );

  const waiting =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.status ===
              "pending" &&
            row.role ===
              "submitted"
        ),
      [rows]
    );

  const disputed =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.status ===
            "disputed"
        ),
      [rows]
    );

  async function confirm(
    submissionId
  ) {
    try {
      setActionKey(
        `confirm-${submissionId}`
      );

      setNotice(null);

      await api.patch(
        `/match-submissions/${submissionId}/confirm`
      );

      setNotice({
        type: "success",

        text:
          "Resultado confirmado. Ahora sí se aplicaron las rachas y cualquier movimiento de categoría correspondiente.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response
            ?.data?.error ||
          "No se pudo confirmar el resultado.",
      });
    } finally {
      setActionKey("");
    }
  }

  async function dispute(
    submissionId
  ) {
    const note =
      String(
        disputeNotes[
          submissionId
        ] || ""
      ).trim();

    if (!note) {
      setNotice({
        type: "error",

        text:
          "Explicá qué dato del resultado no coincide.",
      });

      return;
    }

    try {
      setActionKey(
        `dispute-${submissionId}`
      );

      setNotice(null);

      await api.patch(
        `/match-submissions/${submissionId}/dispute`,
        {
          note,
        }
      );

      setNotice({
        type: "success",

        text:
          "Desacuerdo registrado. El resultado no impactará en el ranking hasta que se resuelva.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",

        text:
          error.response
            ?.data?.error ||
          "No se pudo registrar el desacuerdo.",
      });
    } finally {
      setActionKey("");
    }
  }

  if (!user) {
    return null;
  }

  const gridStyle = {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",

    gap: 18,
  };

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
              "Mi cuenta"}
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
                RESULTADOS
              </div>

              <h1>
                Confirmaciones
              </h1>

              <p>
                Un resultado recién
                impacta en La Red
                cuando la otra pareja
                lo confirma.
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
              Cargando resultados...
            </div>
          )}

          {!loading &&
            rows.length === 0 && (
            <div className="empty-box">
              No tenés resultados
              pendientes de
              confirmación.
            </div>
          )}

          {!loading &&
            awaiting.length >
              0 && (
            <>
              <div
                style={{
                  marginTop: 25,
                  marginBottom: 18,
                }}
              >
                <div className="section-label">
                  REQUIEREN TU ACCIÓN
                </div>

                <h2>
                  Confirmar resultados
                </h2>
              </div>

              <div
                style={gridStyle}
              >
                {awaiting.map(
                  (submission) => (
                    <ResultCard
                      key={
                        submission.id
                      }
                      submission={
                        submission
                      }
                      actionKey={
                        actionKey
                      }
                      disputeNote={
                        disputeNotes[
                          submission.id
                        ]
                      }
                      setDisputeNote={(
                        value
                      ) =>
                        setDisputeNotes(
                          (
                            current
                          ) => ({
                            ...current,

                            [submission.id]:
                              value,
                          })
                        )
                      }
                      onConfirm={
                        confirm
                      }
                      onDispute={
                        dispute
                      }
                    />
                  )
                )}
              </div>
            </>
          )}

          {!loading &&
            waiting.length >
              0 && (
            <>
              <div
                style={{
                  marginTop: 45,
                  marginBottom: 18,
                }}
              >
                <div className="section-label">
                  ESPERANDO RIVAL
                </div>

                <h2>
                  Resultados cargados
                </h2>
              </div>

              <div
                style={gridStyle}
              >
                {waiting.map(
                  (submission) => (
                    <ResultCard
                      key={
                        submission.id
                      }
                      submission={
                        submission
                      }
                      actionKey={
                        actionKey
                      }
                      disputeNote=""
                      setDisputeNote={() =>
                        {}
                      }
                      onConfirm={
                        confirm
                      }
                      onDispute={
                        dispute
                      }
                    />
                  )
                )}
              </div>
            </>
          )}

          {!loading &&
            disputed.length >
              0 && (
            <>
              <div
                style={{
                  marginTop: 45,
                  marginBottom: 18,
                }}
              >
                <div className="section-label">
                  REVISIÓN
                  ADMINISTRATIVA
                </div>

                <h2>
                  Resultados con
                  desacuerdo
                </h2>

                <p
                  style={{
                    color:
                      "var(--muted)",
                  }}
                >
                  Estos resultados no
                  modifican rachas ni
                  categorías mientras
                  exista el desacuerdo.
                </p>
              </div>

              <div
                style={gridStyle}
              >
                {disputed.map(
                  (submission) => (
                    <ResultCard
                      key={
                        submission.id
                      }
                      submission={
                        submission
                      }
                      actionKey={
                        actionKey
                      }
                      disputeNote=""
                      setDisputeNote={() =>
                        {}
                      }
                      onConfirm={
                        confirm
                      }
                      onDispute={
                        dispute
                      }
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}