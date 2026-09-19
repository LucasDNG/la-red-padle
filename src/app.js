import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";

import { pool } from "./db.js";
import { auth, admin, sign } from "./auth.js";

import {
  registerPair,
  createChallenge,
  submitMatch,
  reportPair,
  maintenance,
  ranking,
  adminReports,
  adminReportHistory,
} from "./league.js";

import {
  availablePlayers,
  myPair,
  opponents,
  challengeInbox,
  playerChallenges,
  acceptPendingChallenge,
} from "./playerArea.js";

export const app = express();

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
  })
);

app.use(express.json({ limit: "1mb" }));

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    name: "LA RED Pádel",
  })
);

app.post(
  "/api/auth/register",
  wrap(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !["male", "female"].includes(gender)
    ) {
      return res
        .status(400)
        .json({ error: "Datos incompletos" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = (
      await pool.query(
        `
          INSERT INTO users(
            first_name,
            last_name,
            email,
            phone,
            password_hash,
            gender
          )
          VALUES(
            $1,
            $2,
            lower($3),
            $4,
            $5,
            $6
          )
          RETURNING
            id,
            first_name,
            last_name,
            email,
            gender,
            role
        `,
        [
          firstName,
          lastName,
          email,
          phone,
          hash,
          gender,
        ]
      )
    ).rows[0];

    res.status(201).json({
      token: sign(user),
      user,
    });
  })
);

app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const user = (
      await pool.query(
        `
          SELECT *
          FROM users
          WHERE email = lower($1)
        `,
        [req.body.email]
      )
    ).rows[0];

    const passwordMatches =
      user &&
      (await bcrypt.compare(
        req.body.password || "",
        user.password_hash
      ));

    if (!user || !passwordMatches) {
      return res
        .status(401)
        .json({ error: "Credenciales inválidas" });
    }

    res.json({
      token: sign(user),
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        gender: user.gender,
        role: user.role,
      },
    });
  })
);

app.get(
  "/api/players",
  auth,
  wrap(async (req, res) => {
    res.json(
      await availablePlayers(req.user.id)
    );
  })
);

app.get(
  "/api/me/pair",
  auth,
  wrap(async (req, res) => {
    res.json(
      await myPair(req.user.id)
    );
  })
);

app.get(
  "/api/opponents",
  auth,
  wrap(async (req, res) => {
    res.json(
      await opponents(req.user.id)
    );
  })
);

app.post(
  "/api/pairs",
  auth,
  wrap(async (req, res) => {
    res.status(201).json(
      await registerPair(
        req.user.id,
        req.body.partnerId,
        Number(req.body.category)
      )
    );
  })
);

app.get(
  "/api/ranking",
  wrap(async (req, res) => {
    res.json(await ranking());
  })
);

app.get(
  "/api/challenges/mine",
  auth,
  wrap(async (req, res) => {
    await maintenance();

    res.json(
      await playerChallenges(req.user.id)
    );
  })
);

app.get(
  "/api/challenges/inbox",
  auth,
  wrap(async (req, res) => {
    await maintenance();

    res.json(
      await challengeInbox(req.user.id)
    );
  })
);

app.post(
  "/api/challenges",
  auth,
  wrap(async (req, res) => {
    res.status(201).json(
      await createChallenge(
        req.user.id,
        req.body.targetPairId
      )
    );
  })
);

app.patch(
  "/api/challenges/:id/accept",
  auth,
  wrap(async (req, res) => {
    res.json(
      await acceptPendingChallenge(
        req.user.id,
        Number(req.params.id)
      )
    );
  })
);

app.post(
  "/api/matches",
  auth,
  wrap(async (req, res) => {
    res.status(201).json(
      await submitMatch(
        req.user.id,
        req.body.challengeId,
        req.body.winnerPairId,
        req.body.score,
        req.body.status
      )
    );
  })
);

app.post(
  "/api/reports",
  auth,
  wrap(async (req, res) => {
    res.status(201).json(
      await reportPair(
        req.user.id,
        req.body.challengeId,
        req.body.reason,
        req.body.details
      )
    );
  })
);

app.get(
  "/api/admin/reports",
  auth,
  admin,
  wrap(async (req, res) => {
    res.json(await adminReports());
  })
);

app.get(
  "/api/admin/reports/:pairId/history",
  auth,
  admin,
  wrap(async (req, res) => {
    const pairId = Number(req.params.pairId);

    if (
      !Number.isInteger(pairId) ||
      pairId <= 0
    ) {
      return res
        .status(400)
        .json({ error: "Pareja inválida" });
    }

    res.json(
      await adminReportHistory(pairId)
    );
  })
);

app.post(
  "/api/admin/maintenance",
  auth,
  admin,
  wrap(async (req, res) => {
    res.json({
      expired: await maintenance(),
    });
  })
);

app.use((err, req, res, next) => {
  console.error(err);

  const message =
    err.code === "23505"
      ? "Ese dato ya existe"
      : err.message || "Error interno";

  res
    .status(
      err.code?.startsWith?.("23")
        ? 400
        : 500
    )
    .json({
      error: message,
    });
});