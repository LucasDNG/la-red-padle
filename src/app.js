import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";

import { pool } from "./db.js";
import {
  auth,
  admin,
  sign,
} from "./auth.js";

import {
  createChallenge,
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

import {
  updateReportStatus,
} from "./adminReports.js";

import {
  createMatchSubmission,
  myMatchSubmissions,
  confirmMatchSubmission,
  disputeMatchSubmission,
  adminDisputedMatchSubmissions,
  adminResolveMatchSubmission,
} from "./matchResults.js";

import {
  pairManagement,
  registerStablePair,
  dissolveCurrentPair,
  eloRecords,
} from "./pairLifecycle.js";

export const app = express();

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

const wrap =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(
      fn(req, res, next)
    ).catch(next);

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,
      name: "LA RED Pádel",
    });
  }
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
      ![
        "male",
        "female",
      ].includes(gender)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Datos incompletos",
        });
    }

    const hash =
      await bcrypt.hash(
        password,
        10
      );

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
            role,
            current_category_number
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

    const validPassword =
      user &&
      (await bcrypt.compare(
        req.body.password ||
          "",
        user.password_hash
      ));

    if (
      !user ||
      !validPassword
    ) {
      return res
        .status(401)
        .json({
          error:
            "Credenciales inválidas",
        });
    }

    res.json({
      token: sign(user),

      user: {
        id: user.id,

        first_name:
          user.first_name,

        last_name:
          user.last_name,

        email:
          user.email,

        gender:
          user.gender,

        role:
          user.role,

        current_category_number:
          user.current_category_number,
      },
    });
  })
);

app.get(
  "/api/players",
  auth,
  wrap(async (req, res) => {
    res.json(
      await availablePlayers(
        req.user.id
      )
    );
  })
);

app.get(
  "/api/me/pair",
  auth,
  wrap(async (req, res) => {
    res.json(
      await myPair(
        req.user.id
      )
    );
  })
);

app.get(
  "/api/me/pair-management",
  auth,
  wrap(async (req, res) => {
    res.json(
      await pairManagement(
        req.user.id
      )
    );
  })
);

app.get(
  "/api/opponents",
  auth,
  wrap(async (req, res) => {
    res.json(
      await opponents(
        req.user.id
      )
    );
  })
);

app.post(
  "/api/pairs",
  auth,
  wrap(async (req, res) => {
    res.status(201).json(
      await registerStablePair(
        req.user.id,
        Number(
          req.body.partnerId
        ),
        Number(
          req.body.category
        )
      )
    );
  })
);

app.delete(
  "/api/pairs/current",
  auth,
  wrap(async (req, res) => {
    res.json(
      await dissolveCurrentPair(
        req.user.id
      )
    );
  })
);

app.get(
  "/api/elo-records",
  wrap(async (req, res) => {
    res.json(
      await eloRecords()
    );
  })
);

app.get(
  "/api/ranking",
  wrap(async (req, res) => {
    res.json(
      await ranking()
    );
  })
);

app.get(
  "/api/challenges/mine",
  auth,
  wrap(async (req, res) => {
    await maintenance();

    res.json(
      await playerChallenges(
        req.user.id
      )
    );
  })
);

app.get(
  "/api/challenges/inbox",
  auth,
  wrap(async (req, res) => {
    await maintenance();

    res.json(
      await challengeInbox(
        req.user.id
      )
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
        req.body
          .targetPairId
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
        Number(
          req.params.id
        )
      )
    );
  })
);

app.post(
  "/api/matches",
  auth,
  wrap(async (req, res) => {
    await maintenance();

    res.status(201).json(
      await createMatchSubmission(
        req.user.id,

        Number(
          req.body
            .challengeId
        ),

        Number(
          req.body
            .winnerPairId
        ),

        req.body.score
      )
    );
  })
);

app.get(
  "/api/match-submissions/mine",
  auth,
  wrap(async (req, res) => {
    res.json(
      await myMatchSubmissions(
        req.user.id
      )
    );
  })
);

app.patch(
  "/api/match-submissions/:id/confirm",
  auth,
  wrap(async (req, res) => {
    res.json(
      await confirmMatchSubmission(
        req.user.id,
        Number(
          req.params.id
        )
      )
    );
  })
);

app.patch(
  "/api/match-submissions/:id/dispute",
  auth,
  wrap(async (req, res) => {
    res.json(
      await disputeMatchSubmission(
        req.user.id,

        Number(
          req.params.id
        ),

        req.body.note
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

        req.body
          .challengeId,

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
    res.json(
      await adminReports()
    );
  })
);

app.get(
  "/api/admin/reports/:pairId/history",
  auth,
  admin,
  wrap(async (req, res) => {
    const pairId =
      Number(
        req.params.pairId
      );

    if (
      !Number.isInteger(
        pairId
      ) ||
      pairId <= 0
    ) {
      return res
        .status(400)
        .json({
          error:
            "Pareja inválida",
        });
    }

    res.json(
      await adminReportHistory(
        pairId
      )
    );
  })
);

app.patch(
  "/api/admin/reports/:reportId",
  auth,
  admin,
  wrap(async (req, res) => {
    const reportId =
      Number(
        req.params.reportId
      );

    if (
      !Number.isInteger(
        reportId
      ) ||
      reportId <= 0
    ) {
      return res
        .status(400)
        .json({
          error:
            "Denuncia inválida",
        });
    }

    const status =
      req.body.status;

    if (
      ![
        "reviewed",
        "dismissed",
      ].includes(status)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Estado de denuncia inválido",
        });
    }

    res.json(
      await updateReportStatus(
        req.user.id,
        reportId,
        status
      )
    );
  })
);

app.get(
  "/api/admin/match-submissions/disputed",
  auth,
  admin,
  wrap(async (req, res) => {
    res.json(
      await adminDisputedMatchSubmissions()
    );
  })
);

app.patch(
  "/api/admin/match-submissions/:id/resolve",
  auth,
  admin,
  wrap(async (req, res) => {
    const submissionId =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        submissionId
      ) ||
      submissionId <= 0
    ) {
      return res
        .status(400)
        .json({
          error:
            "Resultado inválido",
        });
    }

    res.json(
      await adminResolveMatchSubmission(
        submissionId,
        req.body.action
      )
    );
  })
);

app.post(
  "/api/admin/maintenance",
  auth,
  admin,
  wrap(async (req, res) => {
    res.json({
      expired:
        await maintenance(),
    });
  })
);

app.use(
  (err, req, res, next) => {
    console.error(err);

    const message =
      err.code ===
      "23505"
        ? "Ese dato ya existe"
        : err.message ||
          "Error interno";

    const status =
      err.statusCode ||
      (
        err.code?.startsWith?.(
          "23"
        )
          ? 400
          : 500
      );

    res
      .status(status)
      .json({
        error:
          message,
      });
  }
);
