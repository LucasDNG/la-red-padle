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

function syncStoredCategory(value) {
  const user = getUser();

  if (!user) {
    return;
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      ...user,
      current_category_number:
        value ?? null,
    })
  );
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem(
    "justRegistered"
  );
  window.location.href = "/";
}

function levelText(value) {
  if (value === null || value === undefined) {
    return "Sin categoría previa";
  }

  return `${value}ª categoría`;
}

export default function PairManager() {
  const navigate = useNavigate();
  const sessionUser = getUser();

  const [data, setData] =
    useState(null);
  const [partnerId, setPartnerId] =
    useState("");
  const [category, setCategory] =
    useState(7);
  const [loading, setLoading] =
    useState(true);
  const [action, setAction] =
    useState("");
  const [notice, setNotice] =
    useState(null);

  async function load() {
    try {
      setLoading(true);

      const response =
        await api.get(
          "/me/pair-management"
        );

      setData(response.data);

      syncStoredCategory(
        response.data?.user
          ?.current_category_number
      );
    } catch (error) {
      if (
        error.response?.status === 401
      ) {
        navigate("/login");
        return;
      }

      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo cargar la gestión de pareja.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!sessionUser) {
      navigate("/login");
      return;
    }

    load();
  }, []);

  const selectedPlayer =
    useMemo(
      () =>
        data?.players?.find(
          (player) =>
            Number(player.id) ===
            Number(partnerId)
        ) || null,
      [data, partnerId]
    );

  const inheritedLevels =
    useMemo(
      () =>
        [
          data?.user
            ?.current_category_number,
          selectedPlayer
            ?.current_category_number,
        ]
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
          .map(Number),
      [data, selectedPlayer]
    );

  const forcedCategory =
    inheritedLevels.length
      ? Math.min(...inheritedLevels)
      : null;

  async function createPair() {
    if (!partnerId) {
      setNotice({
        type: "error",
        text:
          "Elegí a tu compañero/a.",
      });
      return;
    }

    try {
      setAction("create");
      setNotice(null);

      const response =
        await api.post(
          "/pairs",
          {
            partnerId:
              Number(partnerId),
            category:
              forcedCategory ||
              Number(category),
          }
        );

      setPartnerId("");

      setNotice({
        type: "success",
        text:
          `Pareja creada en ${response.data.category_number}ª categoría.`,
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
      setAction("");
    }
  }

  async function dissolvePair() {
    const accepted =
      window.confirm(
        "¿Desarmar esta pareja? La pareja quedará archivada, se cancelarán sus desafíos activos y ambos jugadores conservarán su categoría actual."
      );

    if (!accepted) {
      return;
    }

    try {
      setAction("dissolve");
      setNotice(null);

      const response =
        await api.delete(
          "/pairs/current"
        );

      syncStoredCategory(
        response.data
          .currentCategoryNumber
      );

      setNotice({
        type: "success",
        text:
          "La pareja quedó archivada. Ya podés formar una nueva.",
      });

      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.error ||
          "No se pudo desarmar la pareja.",
      });
    } finally {
      setAction("");
    }
  }

  if (!sessionUser) {
    return null;
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
          <Link to="/resultados">
            Resultados
          </Link>
        </nav>

        <div className="header-actions">
          <Link
            className="header-user"
            to="/liga"
          >
            {sessionUser.first_name ||
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
        <section className="internal-page pair-manager-page">
          <div className="page-title-row">
            <div>
              <div className="section-label">
                MI LIGA · PAREJA
              </div>

              <h1>
                Tu pareja
              </h1>

              <p>
                Formá, revisá o desarmá tu pareja. Tu nivel actual se conserva aunque cambies de compañero/a.
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
              Cargando tu pareja...
            </div>
          )}

          {!loading &&
            data &&
            !data.pair && (
            <div className="league-dashboard pair-manager-grid">
              <section className="dashboard-card">
                <div className="dashboard-number">
                  FORMAR PAREJA
                </div>

                <h2>
                  Elegí compañero/a
                </h2>

                <p>
                  Si alguno ya tiene categoría, la nueva pareja entra obligatoriamente en la categoría de mayor nivel actual entre los dos.
                </p>

                <div className="pair-current-level">
                  <small>
                    TU NIVEL ACTUAL
                  </small>
                  <strong>
                    {levelText(
                      data.user
                        .current_category_number
                    )}
                  </strong>
                </div>

                {data.players.length ===
                0 ? (
                  <div className="pair-waiting-box">
                    No hay otro jugador disponible de tu liga en este momento. Podés seguir usando la app y volver más adelante.
                  </div>
                ) : (
                  <>
                    <label>
                      Compañero/a

                      <select
                        value={partnerId}
                        onChange={(event) =>
                          setPartnerId(
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Elegí jugador/a
                        </option>

                        {data.players.map(
                          (player) => (
                            <option
                              key={player.id}
                              value={player.id}
                            >
                              {player.first_name}{" "}
                              {player.last_name}
                              {player.current_category_number
                                ? ` · ${player.current_category_number}ª`
                                : " · nuevo/a"}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    {partnerId &&
                      forcedCategory && (
                      <div className="pair-rule-box">
                        <small>
                          CATEGORÍA DE ENTRADA
                        </small>
                        <strong>
                          {forcedCategory}ª categoría
                        </strong>
                        <span>
                          La determina el integrante con el nivel actual más alto.
                        </span>
                      </div>
                    )}

                    {partnerId &&
                      !forcedCategory && (
                      <label>
                        Categoría inicial

                        <select
                          value={category}
                          onChange={(event) =>
                            setCategory(
                              Number(
                                event.target.value
                              )
                            )
                          }
                        >
                          {[1,2,3,4,5,6,7].map(
                            (number) => (
                              <option
                                key={number}
                                value={number}
                              >
                                {number}ª categoría
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    )}

                    <button
                      className="button button-green dashboard-button"
                      disabled={
                        !partnerId ||
                        action === "create"
                      }
                      onClick={createPair}
                    >
                      {action === "create"
                        ? "CREANDO..."
                        : "FORMAR PAREJA"}
                    </button>
                  </>
                )}
              </section>

              <section className="dashboard-card">
                <div className="dashboard-number">
                  REGLA DE NIVEL
                </div>

                <h2>
                  El nivel no se reinicia
                </h2>

                <p>
                  Cambiar de compañero/a no permite bajar artificialmente de categoría ni trasladar el ELO de una pareja anterior.
                </p>

                <div className="challenge-list">
                  <div className="challenge-row">
                    <div>
                      <small>
                        UNO TIENE CATEGORÍA
                      </small>
                      <strong>
                        Se usa esa categoría
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>
                        AMBOS TIENEN CATEGORÍA
                      </small>
                      <strong>
                        Se usa la de mayor nivel
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>
                        AMBOS SON NUEVOS
                      </small>
                      <strong>
                        Eligen categoría inicial
                      </strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {!loading &&
            data?.pair && (
            <div className="league-dashboard pair-manager-grid">
              <section className="dashboard-card">
                <div className="dashboard-number">
                  PAREJA ACTIVA
                </div>

                <h2>
                  {data.pair.players}
                </h2>

                <p>
                  {data.pair.league_name}
                </p>

                <div className="challenge-list">
                  <div className="challenge-row">
                    <div>
                      <small>
                        CATEGORÍA
                      </small>
                      <strong>
                        {data.pair.category_number}ª
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>
                        POSICIÓN
                      </small>
                      <strong>
                        #{data.pair.position}
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>ELO</small>
                      <strong>
                        {data.pair.elo}
                      </strong>
                    </div>
                  </div>

                  <div className="challenge-row">
                    <div>
                      <small>
                        MÁXIMO DE ESTA PAREJA
                      </small>
                      <strong>
                        {data.pair.peak_elo}
                      </strong>
                    </div>
                  </div>
                </div>

                <Link
                  className="button button-green dashboard-button"
                  to="/liga"
                >
                  VOLVER A MI LIGA
                </Link>
              </section>

              <section className="dashboard-card pair-danger-card">
                <div className="dashboard-number">
                  CAMBIO DE PAREJA
                </div>

                <h2>
                  Desarmar pareja
                </h2>

                <p>
                  La pareja queda archivada y conserva su historial. No se transfiere ELO, posición ni racha a una pareja futura.
                </p>

                <div className="pair-rule-box">
                  <small>
                    AL DESARMARLA
                  </small>
                  <strong>
                    Conservás {data.pair.category_number}ª como nivel actual
                  </strong>
                  <span>
                    Los desafíos pendientes o aceptados quedan cancelados.
                  </span>
                </div>

                <button
                  className="button pair-danger-button dashboard-button"
                  disabled={
                    action === "dissolve"
                  }
                  onClick={dissolvePair}
                >
                  {action === "dissolve"
                    ? "DESARMANDO..."
                    : "DESARMAR PAREJA"}
                </button>
              </section>
            </div>
          )}

          {!loading &&
            data?.eloRecord && (
            <section className="elo-record-card">
              <div>
                <small>
                  RÉCORD HISTÓRICO DE ELO
                </small>
                <strong>
                  {data.eloRecord.pair_name}
                </strong>
              </div>
              <span>
                {data.eloRecord.elo}
              </span>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
