import React from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
  Link,
  useLocation,
} from "react-router-dom";

import App from "./App.jsx";
import AdminReports from "./AdminReports.jsx";
import Results from "./Results.jsx";

import "./styles.css";

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

  return (
    <>
      <App />

      {user && (
        <div
          style={{
            position:
              "fixed",

            right: 18,

            bottom: 18,

            zIndex: 100,

            display:
              "grid",

            gap: 8,

            justifyItems:
              "end",
          }}
        >
          {user.role ===
            "admin" && (
            <Link
              to="/admin/reportes"
              style={{
                padding:
                  "11px 16px",

                borderRadius:
                  999,

                background:
                  "var(--blue-light)",

                color:
                  "#032333",

                boxShadow:
                  "0 12px 30px rgba(0,0,0,.28)",

                fontSize:
                  11,

                fontWeight:
                  900,

                letterSpacing:
                  ".08em",
              }}
            >
              ADMIN
            </Link>
          )}

          <Link
            to="/resultados"
            style={{
              padding:
                "11px 16px",

              borderRadius:
                999,

              background:
                "var(--green)",

              color:
                "#032333",

              boxShadow:
                "0 12px 30px rgba(0,0,0,.28)",

              fontSize:
                11,

              fontWeight:
                900,

              letterSpacing:
                ".08em",
            }}
          >
            RESULTADOS
          </Link>
        </div>
      )}
    </>
  );
}

if (
  "serviceWorker" in
  navigator
) {
  addEventListener(
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
