import { pool } from "./db.js";

const q = (client, text, values = []) => client.query(text, values);

async function pairForUser(client, userId) {
  const result = await q(
    client,
    `SELECT p.*
     FROM pairs p
     JOIN pair_members pm ON pm.pair_id = p.id
     WHERE pm.user_id = $1
       AND p.status <> 'inactive'
     ORDER BY p.id DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0];
}

async function applyElo(
  client,
  pairId,
  delta,
  reason,
  sourceType,
  sourceId
) {
  const pair = (
    await q(
      client,
      "SELECT elo FROM pairs WHERE id = $1 FOR UPDATE",
      [pairId]
    )
  ).rows[0];

  if (!pair) {
    throw new Error("Pareja inexistente");
  }

  const after =
    Number(pair.elo) +
    Number(delta);

  await q(
    client,
    "UPDATE pairs SET elo = $2 WHERE id = $1",
    [pairId, after]
  );

  await q(
    client,
    `INSERT INTO elo_events(
       pair_id,
       delta,
       elo_before,
       elo_after,
       reason,
       source_type,
       source_id
     )
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT DO NOTHING`,
    [
      pairId,
      delta,
      pair.elo,
      after,
      reason,
      sourceType,
      sourceId,
    ]
  );
}

async function normalize(
  client,
  categoryId
) {
  const rows = (
    await q(
      client,
      `SELECT
         id,
         position
       FROM pairs
       WHERE category_id = $1
         AND status <> 'inactive'
       ORDER BY
         position,
         id`,
      [categoryId]
    )
  ).rows;

  if (!rows.length) {
    return;
  }

  const maxPosition = Math.max(
    ...rows.map((row) =>
      Number(row.position)
    )
  );

  const temporaryBase =
    maxPosition +
    rows.length +
    1000;

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    await q(
      client,
      "UPDATE pairs SET position = $2 WHERE id = $1",
      [
        rows[index].id,
        temporaryBase + index,
      ]
    );
  }

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    await q(
      client,
      "UPDATE pairs SET position = $2 WHERE id = $1",
      [
        rows[index].id,
        index + 1,
      ]
    );
  }
}

async function swapCategories(
  client,
  upPair,
  downPair,
  reason
) {
  const a = (
    await q(
      client,
      "SELECT * FROM pairs WHERE id = $1 FOR UPDATE",
      [upPair]
    )
  ).rows[0];

  const b = (
    await q(
      client,
      "SELECT * FROM pairs WHERE id = $1 FOR UPDATE",
      [downPair]
    )
  ).rows[0];

  if (!a || !b) {
    throw new Error(
      "No se pudo completar el cambio de categoría"
    );
  }

  const categoryA =
    a.category_id;

  const categoryB =
    b.category_id;

  const positionA =
    Number(a.position);

  const positionB =
    Number(b.position);

  if (
    Number(categoryA) ===
    Number(categoryB)
  ) {
    throw new Error(
      "Las parejas deben pertenecer a categorías distintas"
    );
  }

  const maxA = Number(
    (
      await q(
        client,
        `SELECT
           COALESCE(
             MAX(position),
             0
           ) max_position
         FROM pairs
         WHERE category_id = $1`,
        [categoryA]
      )
    ).rows[0].max_position
  );

  const maxB = Number(
    (
      await q(
        client,
        `SELECT
           COALESCE(
             MAX(position),
             0
           ) max_position
         FROM pairs
         WHERE category_id = $1`,
        [categoryB]
      )
    ).rows[0].max_position
  );

  const offsetA =
    maxA + 1000;

  const offsetB =
    maxB + 1000;

  await q(
    client,
    `UPDATE pairs
     SET position =
       position + $2
     WHERE category_id = $1`,
    [
      categoryA,
      offsetA,
    ]
  );

  await q(
    client,
    `UPDATE pairs
     SET position =
       position + $2
     WHERE category_id = $1`,
    [
      categoryB,
      offsetB,
    ]
  );

  await q(
    client,
    `UPDATE pairs
     SET position = $2
     WHERE id = $1`,
    [
      a.id,
      maxA +
        offsetA +
        1,
    ]
  );

  await q(
    client,
    `UPDATE pairs
     SET position = $2
     WHERE id = $1`,
    [
      b.id,
      maxB +
        offsetB +
        1,
    ]
  );

  await q(
    client,
    `UPDATE pairs
     SET
       category_id = $2,
       position = $3,
       consecutive_wins = 0,
       consecutive_losses = 0
     WHERE id = $1`,
    [
      a.id,
      categoryB,
      positionB + offsetB,
    ]
  );

  await q(
    client,
    `UPDATE pairs
     SET
       category_id = $2,
       position = $3,
       consecutive_wins = 0,
       consecutive_losses = 0
     WHERE id = $1`,
    [
      b.id,
      categoryA,
      positionA + offsetA,
    ]
  );

  await normalize(
    client,
    categoryA
  );

  await normalize(
    client,
    categoryB
  );

  await q(
    client,
    `INSERT INTO category_movements(
       pair_id,
       from_category_id,
       to_category_id,
       reason
     )
     VALUES
       ($1,$2,$3,$4),
       ($5,$3,$2,$4)`,
    [
      a.id,
      categoryA,
      categoryB,
      reason,
      b.id,
    ]
  );
}

async function promotionCheck(
  client,
  pairId
) {
  const pair = (
    await q(
      client,
      `SELECT
         p.*,
         cat.number
       FROM pairs p
       JOIN categories cat
         ON cat.id =
            p.category_id
       WHERE p.id = $1`,
      [pairId]
    )
  ).rows[0];

  if (!pair) {
    return;
  }

  if (
    pair.position === 1 &&
    pair.consecutive_wins >= 3 &&
    pair.number > 1
  ) {
    const upper = (
      await q(
        client,
        `SELECT id
         FROM categories
         WHERE league_id = $1
           AND number = $2`,
        [
          pair.league_id,
          pair.number - 1,
        ]
      )
    ).rows[0];

    if (!upper) {
      return;
    }

    const last = (
      await q(
        client,
        `SELECT id
         FROM pairs
         WHERE category_id = $1
           AND status <> 'inactive'
         ORDER BY
           position DESC
         LIMIT 1`,
        [upper.id]
      )
    ).rows[0];

    if (last) {
      await swapCategories(
        client,
        pair.id,
        last.id,
        "three_wins_promotion"
      );
    }
  }
}

async function relegationCheck(
  client,
  pairId
) {
  const pair = (
    await q(
      client,
      `SELECT
         p.*,
         cat.number
       FROM pairs p
       JOIN categories cat
         ON cat.id =
            p.category_id
       WHERE p.id = $1`,
      [pairId]
    )
  ).rows[0];

  if (!pair) {
    return;
  }

  const last = (
    await q(
      client,
      `SELECT id
       FROM pairs
       WHERE category_id = $1
         AND status <> 'inactive'
       ORDER BY
         position DESC
       LIMIT 1`,
      [pair.category_id]
    )
  ).rows[0];

  if (
    last?.id === pair.id &&
    pair.consecutive_losses >= 3 &&
    pair.number < 7
  ) {
    const lower = (
      await q(
        client,
        `SELECT id
         FROM categories
         WHERE league_id = $1
           AND number = $2`,
        [
          pair.league_id,
          pair.number + 1,
        ]
      )
    ).rows[0];

    if (!lower) {
      return;
    }

    const first = (
      await q(
        client,
        `SELECT id
         FROM pairs
         WHERE category_id = $1
           AND status <> 'inactive'
         ORDER BY position
         LIMIT 1`,
        [lower.id]
      )
    ).rows[0];

    if (first) {
      await swapCategories(
        client,
        first.id,
        pair.id,
        "three_losses_relegation"
      );
    }
  }
}

export async function registerPair(
  userId,
  partnerId,
  categoryNumber
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const users = (
      await q(
        client,
        `SELECT
           id,
           gender
         FROM users
         WHERE id =
           ANY($1::bigint[])`,
        [[
          userId,
          partnerId,
        ]]
      )
    ).rows;

    if (
      users.length !== 2 ||
      users[0].gender !==
        users[1].gender
    ) {
      throw new Error(
        "La pareja debe tener dos jugadores del mismo circuito"
      );
    }

    const league = (
      await q(
        client,
        `SELECT *
         FROM leagues
         WHERE gender = $1
           AND active = true`,
        [users[0].gender]
      )
    ).rows[0];

    if (!league) {
      throw new Error(
        "No hay una liga activa para este circuito"
      );
    }

    const existing = (
      await q(
        client,
        `SELECT 1
         FROM pair_members pm
         JOIN pairs p
           ON p.id =
              pm.pair_id
         WHERE pm.user_id =
           ANY($1::bigint[])
           AND p.league_id = $2
           AND p.status <>
             'inactive'
         LIMIT 1`,
        [
          [
            userId,
            partnerId,
          ],
          league.id,
        ]
      )
    ).rowCount;

    if (existing) {
      throw new Error(
        "Uno de los jugadores ya integra una pareja activa"
      );
    }

    const category = (
      await q(
        client,
        `SELECT *
         FROM categories
         WHERE league_id = $1
           AND number = $2
         FOR UPDATE`,
        [
          league.id,
          categoryNumber,
        ]
      )
    ).rows[0];

    if (
      !category ||
      !category
        .direct_registration_open
    ) {
      throw new Error(
        "Categoría cerrada para inscripción directa"
      );
    }

    const count = Number(
      (
        await q(
          client,
          `SELECT
             count(*) n
           FROM pairs
           WHERE category_id = $1
             AND status <>
               'inactive'`,
          [category.id]
        )
      ).rows[0].n
    );

    if (
      category.capacity !==
        null &&
      count >=
        Number(
          category.capacity
        )
    ) {
      throw new Error(
        "Categoría completa"
      );
    }

    const pair = (
      await q(
        client,
        `INSERT INTO pairs(
           league_id,
           category_id,
           position
         )
         VALUES(
           $1,
           $2,
           $3
         )
         RETURNING *`,
        [
          league.id,
          category.id,
          count + 1,
        ]
      )
    ).rows[0];

    await q(
      client,
      `INSERT INTO pair_members(
         pair_id,
         user_id
       )
       VALUES
         ($1,$2),
         ($1,$3)`,
      [
        pair.id,
        userId,
        partnerId,
      ]
    );

    await q(
      client,
      `INSERT INTO category_movements(
         pair_id,
         to_category_id,
         reason
       )
       VALUES(
         $1,
         $2,
         'registration'
       )`,
      [
        pair.id,
        category.id,
      ]
    );

    if (
      category.capacity !==
        null &&
      count + 1 >=
        Number(
          category.capacity
        )
    ) {
      await q(
        client,
        `UPDATE categories
         SET
           direct_registration_open =
             false
         WHERE id = $1`,
        [category.id]
      );
    }

    await client.query(
      "COMMIT"
    );

    return pair;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function createChallenge(
  userId,
  targetPairId
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const mine =
      await pairForUser(
        client,
        userId
      );

    if (!mine) {
      throw new Error(
        "No tenés pareja activa"
      );
    }

    await refreshDiscipline(
      client,
      mine.id
    );

    const currentStatus = (
      await q(
        client,
        `SELECT status
         FROM pairs
         WHERE id = $1`,
        [mine.id]
      )
    ).rows[0]?.status;

    if (
      currentStatus ===
      "review"
    ) {
      throw new Error(
        "Tu pareja está en revisión y no puede crear desafíos"
      );
    }

    const target = (
      await q(
        client,
        `SELECT *
         FROM pairs
         WHERE id = $1`,
        [targetPairId]
      )
    ).rows[0];

    if (
      !target ||
      Number(
        target.league_id
      ) !==
        Number(
          mine.league_id
        ) ||
      Number(
        target.category_id
      ) !==
        Number(
          mine.category_id
        )
    ) {
      throw new Error(
        "El rival debe estar en tu misma categoría"
      );
    }

    if (
      Number(target.id) ===
      Number(mine.id)
    ) {
      throw new Error(
        "No podés desafiar a tu propia pareja"
      );
    }

    const meetings = Number(
      (
        await q(
          client,
          `SELECT
             count(*) n
           FROM matches
           WHERE
             (
               pair_a_id = $1
               AND
               pair_b_id = $2
             )
             OR
             (
               pair_a_id = $2
               AND
               pair_b_id = $1
             )`,
          [
            mine.id,
            target.id,
          ]
        )
      ).rows[0].n
    );

    const challenge = (
      await q(
        client,
        `INSERT INTO challenges(
           league_id,
           challenger_pair_id,
           challenged_pair_id,
           historical_meetings_at_creation
         )
         VALUES(
           $1,
           $2,
           $3,
           $4
         )
         RETURNING *`,
        [
          mine.league_id,
          mine.id,
          target.id,
          meetings,
        ]
      )
    ).rows[0];

    await client.query(
      "COMMIT"
    );

    return challenge;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function inbox(
  userId
) {
  const client =
    await pool.connect();

  try {
    const mine =
      await pairForUser(
        client,
        userId
      );

    if (!mine) {
      return [];
    }

    return (
      await q(
        client,
        `SELECT
           ch.*,
           p1.position
             challenger_position
         FROM challenges ch
         JOIN pairs p1
           ON p1.id =
              ch.challenger_pair_id
         WHERE
           ch.challenged_pair_id =
             $1
           AND
           ch.status =
             'pending'
         ORDER BY
           ch.historical_meetings_at_creation,
           ch.created_at,
           ch.id`,
        [mine.id]
      )
    ).rows;
  } finally {
    client.release();
  }
}

export async function acceptChallenge(
  userId,
  id
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const mine =
      await pairForUser(
        client,
        userId
      );

    if (!mine) {
      throw new Error(
        "No tenés pareja activa"
      );
    }

    const challenge = (
      await q(
        client,
        `UPDATE challenges
         SET
           status =
             'accepted',
           accepted_at =
             now(),
           play_deadline_at =
             now() +
             interval '30 days'
         WHERE id = $1
           AND
             challenged_pair_id =
               $2
           AND
             status =
               'pending'
         RETURNING *`,
        [
          id,
          mine.id,
        ]
      )
    ).rows[0];

    if (!challenge) {
      throw new Error(
        "El desafío no está disponible para aceptar"
      );
    }

    await client.query(
      "COMMIT"
    );

    return challenge;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function submitMatch(
  userId,
  challengeId,
  winnerPairId,
  score,
  status = "confirmed"
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const mine =
      await pairForUser(
        client,
        userId
      );

    const challenge = (
      await q(
        client,
        `SELECT *
         FROM challenges
         WHERE id = $1
         FOR UPDATE`,
        [challengeId]
      )
    ).rows[0];

    if (
      !challenge ||
      challenge.status !==
        "accepted"
    ) {
      throw new Error(
        "Desafío no disponible"
      );
    }

    const ids = [
      Number(
        challenge
          .challenger_pair_id
      ),
      Number(
        challenge
          .challenged_pair_id
      ),
    ];

    if (
      !ids.includes(
        Number(mine?.id)
      )
    ) {
      throw new Error(
        "No participás del desafío"
      );
    }

    if (
      !ids.includes(
        Number(winnerPairId)
      )
    ) {
      throw new Error(
        "Ganador inválido"
      );
    }

    const loser =
      Number(winnerPairId) ===
      Number(
        challenge
          .challenger_pair_id
      )
        ? challenge
            .challenged_pair_id
        : challenge
            .challenger_pair_id;

    const match = (
      await q(
        client,
        `INSERT INTO matches(
           challenge_id,
           league_id,
           pair_a_id,
           pair_b_id,
           winner_pair_id,
           score,
           status
         )
         VALUES(
           $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7
         )
         RETURNING *`,
        [
          challenge.id,
          challenge.league_id,
          challenge
            .challenger_pair_id,
          challenge
            .challenged_pair_id,
          winnerPairId,
          score || null,
          status,
        ]
      )
    ).rows[0];

    await q(
      client,
      `UPDATE challenges
       SET status = 'played'
       WHERE id = $1`,
      [challenge.id]
    );

    await q(
      client,
      `UPDATE pairs
       SET
         consecutive_wins =
           consecutive_wins + 1,
         consecutive_losses = 0
       WHERE id = $1`,
      [winnerPairId]
    );

    await q(
      client,
      `UPDATE pairs
       SET
         consecutive_losses =
           consecutive_losses + 1,
         consecutive_wins = 0
       WHERE id = $1`,
      [loser]
    );

    await promotionCheck(
      client,
      winnerPairId
    );

    await relegationCheck(
      client,
      loser
    );

    await client.query(
      "COMMIT"
    );

    return match;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function reportPair(
  userId,
  challengeId,
  reason,
  details
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const mine =
      await pairForUser(
        client,
        userId
      );

    const challenge = (
      await q(
        client,
        `SELECT *
         FROM challenges
         WHERE id = $1
         FOR UPDATE`,
        [challengeId]
      )
    ).rows[0];

    if (
      !challenge ||
      !mine
    ) {
      throw new Error(
        "Desafío inexistente"
      );
    }

    const ids = [
      Number(
        challenge
          .challenger_pair_id
      ),
      Number(
        challenge
          .challenged_pair_id
      ),
    ];

    if (
      !ids.includes(
        Number(mine.id)
      )
    ) {
      throw new Error(
        "No participás del desafío"
      );
    }

    const reported =
      ids.find(
        (id) =>
          id !==
          Number(mine.id)
      );

    if (
      ![
        "coordination_refusal",
        "no_show",
        "other",
      ].includes(reason)
    ) {
      throw new Error(
        "Motivo inválido"
      );
    }

    if (
      reason === "other" &&
      !String(
        details || ""
      ).trim()
    ) {
      throw new Error(
        "Explicá el motivo"
      );
    }

    const existingReport = (
      await q(
        client,
        `SELECT id
         FROM reports
         WHERE challenge_id = $1
           AND reporter_pair_id = $2
         LIMIT 1`,
        [
          challengeId,
          mine.id,
        ]
      )
    ).rows[0];

    if (existingReport) {
      throw new Error(
        "Ya registraste una denuncia para este desafío"
      );
    }

    const report = (
      await q(
        client,
        `INSERT INTO reports(
           challenge_id,
           reporter_pair_id,
           reported_pair_id,
           reason,
           details
         )
         VALUES(
           $1,
           $2,
           $3,
           $4,
           $5
         )
         RETURNING *`,
        [
          challengeId,
          mine.id,
          reported,
          reason,
          details || null,
        ]
      )
    ).rows[0];

    await refreshDiscipline(
      client,
      reported
    );

    await client.query(
      "COMMIT"
    );

    return report;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

async function refreshDiscipline(
  client,
  pairId
) {
  const count = Number(
    (
      await q(
        client,
        `SELECT
           count(
             DISTINCT
             reporter_pair_id
           ) n
         FROM reports
         WHERE
           reported_pair_id =
             $1
           AND
           status <>
             'dismissed'
           AND
           created_at >=
             now() -
             interval '180 days'`,
        [pairId]
      )
    ).rows[0].n
  );

  const status =
    count >= 5
      ? "review"
      : count >= 3
        ? "observed"
        : "active";

  await q(
    client,
    `UPDATE pairs
     SET status = $2
     WHERE id = $1
       AND status <>
         'inactive'`,
    [
      pairId,
      status,
    ]
  );
}

async function refreshAllDiscipline(
  client
) {
  await q(
    client,
    `WITH report_counts AS (
       SELECT
         p.id pair_id,
         count(
           DISTINCT
           r.reporter_pair_id
         )::int
           distinct_reporters_180d
       FROM pairs p
       LEFT JOIN reports r
         ON
           r.reported_pair_id =
             p.id
           AND
           r.status <>
             'dismissed'
           AND
           r.created_at >=
             now() -
             interval '180 days'
       WHERE
         p.status <>
           'inactive'
       GROUP BY
         p.id
     )
     UPDATE pairs p
     SET status =
       CASE
         WHEN
           rc.distinct_reporters_180d >=
             5
           THEN 'review'
         WHEN
           rc.distinct_reporters_180d >=
             3
           THEN 'observed'
         ELSE 'active'
       END
     FROM report_counts rc
     WHERE
       p.id =
         rc.pair_id
       AND
       p.status <>
         'inactive'`
  );
}

export async function maintenance() {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    await q(
      client,
      "SELECT pg_advisory_xact_lock(7411801)"
    );

    const expired = (
      await q(
        client,
        `SELECT *
         FROM challenges
         WHERE
           status =
             'accepted'
           AND
           play_deadline_at <=
             now()
           AND
           expiry_penalty_applied_at
             IS NULL
         FOR UPDATE`
      )
    ).rows;

    for (
      const challenge
      of expired
    ) {
      await applyElo(
        client,
        challenge
          .challenger_pair_id,
        -10,
        "challenge_expired",
        "challenge",
        challenge.id
      );

      await applyElo(
        client,
        challenge
          .challenged_pair_id,
        -10,
        "challenge_expired",
        "challenge",
        challenge.id
      );

      await q(
        client,
        `UPDATE challenges
         SET
           status =
             'expired',
           expiry_penalty_applied_at =
             now()
         WHERE id = $1`,
        [challenge.id]
      );
    }

    await refreshAllDiscipline(
      client
    );

    await client.query(
      "COMMIT"
    );

    return expired.length;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function ranking() {
  const result =
    await pool.query(
      `SELECT
         l.slug,
         c.number,
         c.name,
         c.capacity,
         p.id pair_id,
         p.position,
         p.elo,
         p.status,
         string_agg(
           u.first_name ||
           ' ' ||
           u.last_name,
           ' / '
           ORDER BY u.id
         ) players
       FROM pairs p
       JOIN categories c
         ON c.id =
            p.category_id
       JOIN leagues l
         ON l.id =
            p.league_id
       JOIN pair_members pm
         ON pm.pair_id =
            p.id
       JOIN users u
         ON u.id =
            pm.user_id
       WHERE
         p.status <>
           'inactive'
       GROUP BY
         l.slug,
         c.number,
         c.name,
         c.capacity,
         p.id
       ORDER BY
         l.slug,
         c.number,
         p.position`
    );

  return result.rows;
}

export async function myChallenges(
  userId
) {
  const client =
    await pool.connect();

  try {
    const mine =
      await pairForUser(
        client,
        userId
      );

    if (!mine) {
      return [];
    }

    return (
      await q(
        client,
        `SELECT ch.*
         FROM challenges ch
         WHERE
           (
             ch.challenger_pair_id =
               $1
             OR
             ch.challenged_pair_id =
               $1
           )
           AND
           ch.status IN(
             'accepted',
             'pending'
           )
         ORDER BY
           CASE
             WHEN
               ch.status =
                 'accepted'
             THEN 0
             ELSE 1
           END,
           ch.play_deadline_at
             NULLS LAST,
           ch.created_at`,
        [mine.id]
      )
    ).rows;
  } finally {
    client.release();
  }
}

export async function adminReports() {
  await maintenance();

  const result =
    await pool.query(
      `WITH pair_labels AS (
         SELECT
           p.id pair_id,
           p.status,
           l.slug league_slug,
           c.number
             category_number,
           p.position,
           string_agg(
             u.first_name ||
             ' ' ||
             u.last_name,
             ' / '
             ORDER BY u.id
           ) players
         FROM pairs p
         JOIN leagues l
           ON l.id =
              p.league_id
         JOIN categories c
           ON c.id =
              p.category_id
         JOIN pair_members pm
           ON pm.pair_id =
              p.id
         JOIN users u
           ON u.id =
              pm.user_id
         GROUP BY
           p.id,
           p.status,
           l.slug,
           c.number,
           p.position
       ),
       received AS (
         SELECT
           reported_pair_id
             pair_id,

           count(*)::int
             reports_received_total,

           count(*) FILTER (
             WHERE
               status <>
                 'dismissed'
           )::int
             reports_received_valid,

           count(*) FILTER (
             WHERE
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             reports_received_180d_total,

           count(*) FILTER (
             WHERE
               status <>
                 'dismissed'
               AND
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             reports_received_180d_valid,

           count(
             DISTINCT
             reporter_pair_id
           )::int
             distinct_reporters_total,

           count(
             DISTINCT
             reporter_pair_id
           ) FILTER (
             WHERE
               status <>
                 'dismissed'
           )::int
             distinct_reporters_valid,

           count(
             DISTINCT
             reporter_pair_id
           ) FILTER (
             WHERE
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             distinct_reporters_180d_total,

           count(
             DISTINCT
             reporter_pair_id
           ) FILTER (
             WHERE
               status <>
                 'dismissed'
               AND
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             distinct_reporters_180d_valid

         FROM reports
         GROUP BY
           reported_pair_id
       ),
       sent AS (
         SELECT
           reporter_pair_id
             pair_id,

           count(*)::int
             reports_sent_total,

           count(*) FILTER (
             WHERE
               status <>
                 'dismissed'
           )::int
             reports_sent_valid,

           count(*) FILTER (
             WHERE
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             reports_sent_180d_total,

           count(*) FILTER (
             WHERE
               status <>
                 'dismissed'
               AND
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             reports_sent_180d_valid,

           count(
             DISTINCT
             reported_pair_id
           )::int
             distinct_reported_pairs_total,

           count(
             DISTINCT
             reported_pair_id
           ) FILTER (
             WHERE
               status <>
                 'dismissed'
           )::int
             distinct_reported_pairs_valid,

           count(
             DISTINCT
             reported_pair_id
           ) FILTER (
             WHERE
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             distinct_reported_pairs_180d_total,

           count(
             DISTINCT
             reported_pair_id
           ) FILTER (
             WHERE
               status <>
                 'dismissed'
               AND
               created_at >=
                 now() -
                 interval '180 days'
           )::int
             distinct_reported_pairs_180d_valid

         FROM reports
         GROUP BY
           reporter_pair_id
       )

       SELECT
         pl.pair_id,
         pl.players,
         pl.status,
         pl.league_slug,
         pl.category_number,
         pl.position,

         COALESCE(
           r.reports_received_valid,
           0
         ) reports_received,

         COALESCE(
           r.distinct_reporters_valid,
           0
         ) distinct_reporters,

         COALESCE(
           r.reports_received_total,
           0
         ) reports_received_total,

         COALESCE(
           r.reports_received_valid,
           0
         ) reports_received_valid,

         COALESCE(
           r.reports_received_180d_total,
           0
         ) reports_received_180d_total,

         COALESCE(
           r.reports_received_180d_valid,
           0
         ) reports_received_180d_valid,

         COALESCE(
           r.distinct_reporters_total,
           0
         ) distinct_reporters_total,

         COALESCE(
           r.distinct_reporters_valid,
           0
         ) distinct_reporters_valid,

         COALESCE(
           r.distinct_reporters_180d_total,
           0
         ) distinct_reporters_180d_total,

         COALESCE(
           r.distinct_reporters_180d_valid,
           0
         ) distinct_reporters_180d_valid,

         COALESCE(
           s.reports_sent_total,
           0
         ) reports_sent_total,

         COALESCE(
           s.reports_sent_valid,
           0
         ) reports_sent_valid,

         COALESCE(
           s.reports_sent_180d_total,
           0
         ) reports_sent_180d_total,

         COALESCE(
           s.reports_sent_180d_valid,
           0
         ) reports_sent_180d_valid,

         COALESCE(
           s.distinct_reported_pairs_total,
           0
         ) distinct_reported_pairs_total,

         COALESCE(
           s.distinct_reported_pairs_valid,
           0
         ) distinct_reported_pairs_valid,

         COALESCE(
           s.distinct_reported_pairs_180d_total,
           0
         ) distinct_reported_pairs_180d_total,

         COALESCE(
           s.distinct_reported_pairs_180d_valid,
           0
         ) distinct_reported_pairs_180d_valid

       FROM pair_labels pl

       LEFT JOIN received r
         ON r.pair_id =
            pl.pair_id

       LEFT JOIN sent s
         ON s.pair_id =
            pl.pair_id

       ORDER BY
         COALESCE(
           r.distinct_reporters_180d_valid,
           0
         ) DESC,

         COALESCE(
           r.reports_received_180d_valid,
           0
         ) DESC,

         COALESCE(
           s.reports_sent_total,
           0
         ) DESC,

         pl.pair_id`
    );

  return result.rows;
}

export async function adminReportHistory(
  pairId
) {
  await maintenance();

  const pairResult =
    await pool.query(
      `SELECT
         p.id pair_id,
         p.status,
         p.position,
         p.elo,
         l.slug
           league_slug,
         c.number
           category_number,

         string_agg(
           u.first_name ||
           ' ' ||
           u.last_name,
           ' / '
           ORDER BY u.id
         ) players

       FROM pairs p

       JOIN leagues l
         ON l.id =
            p.league_id

       JOIN categories c
         ON c.id =
            p.category_id

       JOIN pair_members pm
         ON pm.pair_id =
            p.id

       JOIN users u
         ON u.id =
            pm.user_id

       WHERE p.id = $1

       GROUP BY
         p.id,
         p.status,
         p.position,
         p.elo,
         l.slug,
         c.number`,
      [pairId]
    );

  const pair =
    pairResult.rows[0];

  if (!pair) {
    throw new Error(
      "Pareja inexistente"
    );
  }

  const reportsResult =
    await pool.query(
      `WITH pair_names AS (
         SELECT
           p.id pair_id,

           string_agg(
             u.first_name ||
             ' ' ||
             u.last_name,
             ' / '
             ORDER BY u.id
           ) players

         FROM pairs p

         JOIN pair_members pm
           ON pm.pair_id =
              p.id

         JOIN users u
           ON u.id =
              pm.user_id

         GROUP BY
           p.id
       )

       SELECT
         r.id,
         r.challenge_id,

         r.reporter_pair_id,

         reporter.players
           reporter_players,

         r.reported_pair_id,

         reported.players
           reported_players,

         r.reason,
         r.details,
         r.status,
         r.created_at,
         r.reviewed_at,
         r.reviewed_by,

         CASE
           WHEN
             reviewer.id IS NULL
           THEN NULL
           ELSE
             reviewer.first_name ||
             ' ' ||
             reviewer.last_name
         END reviewer_name,

         (
           r.created_at >=
             now() -
             interval '180 days'
         ) in_last_180_days

       FROM reports r

       JOIN pair_names reporter
         ON reporter.pair_id =
            r.reporter_pair_id

       JOIN pair_names reported
         ON reported.pair_id =
            r.reported_pair_id

       LEFT JOIN users reviewer
         ON reviewer.id =
            r.reviewed_by

       WHERE
         r.reporter_pair_id = $1
         OR
         r.reported_pair_id = $1

       ORDER BY
         r.created_at DESC,
         r.id DESC`,
      [pairId]
    );

  const reports =
    reportsResult.rows.map(
      (report) => ({
        ...report,

        direction:
          Number(
            report
              .reporter_pair_id
          ) ===
          Number(pairId)
            ? "sent"
            : "received",
      })
    );

  const summary =
    reports.reduce(
      (
        accumulator,
        report
      ) => {
        const dismissed =
          report.status ===
          "dismissed";

        const recent =
          Boolean(
            report
              .in_last_180_days
          );

        const side =
          report.direction ===
          "sent"
            ? accumulator.sent
            : accumulator
                .received;

        const otherId =
          report.direction ===
          "sent"
            ? Number(
                report
                  .reported_pair_id
              )
            : Number(
                report
                  .reporter_pair_id
              );

        side.total += 1;

        side.distinct_pairs.add(
          otherId
        );

        if (!dismissed) {
          side.valid += 1;

          side
            .distinct_pairs_valid
            .add(otherId);
        }

        if (recent) {
          side
            .last_180_days
            .total += 1;

          side
            .distinct_pairs_180d
            .add(otherId);

          if (!dismissed) {
            side
              .last_180_days
              .valid += 1;

            side
              .distinct_pairs_180d_valid
              .add(otherId);
          }
        }

        return accumulator;
      },
      {
        sent: {
          total: 0,
          valid: 0,

          last_180_days: {
            total: 0,
            valid: 0,
          },

          distinct_pairs:
            new Set(),

          distinct_pairs_valid:
            new Set(),

          distinct_pairs_180d:
            new Set(),

          distinct_pairs_180d_valid:
            new Set(),
        },

        received: {
          total: 0,
          valid: 0,

          last_180_days: {
            total: 0,
            valid: 0,
          },

          distinct_pairs:
            new Set(),

          distinct_pairs_valid:
            new Set(),

          distinct_pairs_180d:
            new Set(),

          distinct_pairs_180d_valid:
            new Set(),
        },
      }
    );

  const serialize = (
    side
  ) => ({
    total:
      side.total,

    valid:
      side.valid,

    last_180_days:
      side.last_180_days,

    distinct_pairs_total:
      side
        .distinct_pairs
        .size,

    distinct_pairs_valid:
      side
        .distinct_pairs_valid
        .size,

    distinct_pairs_180d_total:
      side
        .distinct_pairs_180d
        .size,

    distinct_pairs_180d_valid:
      side
        .distinct_pairs_180d_valid
        .size,
  });

  return {
    pair,

    summary: {
      sent:
        serialize(
          summary.sent
        ),

      received:
        serialize(
          summary.received
        ),
    },

    reports,
  };
}