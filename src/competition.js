import { pool } from "./db.js";

const q = (client, text, values = []) =>
  client.query(text, values);

function problem(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function activePairForUser(client, userId) {
  return (
    await q(
      client,
      `
        SELECT p.*
        FROM pairs p
        JOIN pair_members pm
          ON pm.pair_id = p.id
        WHERE pm.user_id = $1
          AND p.status <> 'inactive'
        ORDER BY p.id DESC
        LIMIT 1
      `,
      [userId]
    )
  ).rows[0] || null;
}

async function categoryInfo(client, categoryId) {
  return (
    await q(
      client,
      `
        SELECT
          c.id,
          c.number,
          c.name,
          l.id AS league_id,
          l.slug AS league_slug
        FROM categories c
        JOIN leagues l
          ON l.id = c.league_id
        WHERE c.id = $1
      `,
      [categoryId]
    )
  ).rows[0] || null;
}

async function activeRows(client, categoryId) {
  return (
    await q(
      client,
      `
        SELECT
          p.id,
          p.position,
          p.created_at,
          p.first_place_defenses,
          (
            SELECT count(*)::int
            FROM matches m
            WHERE m.status IN ('confirmed', 'walkover')
              AND (
                m.pair_a_id = p.id
                OR m.pair_b_id = p.id
              )
          ) AS matches_played
        FROM pairs p
        WHERE p.category_id = $1
          AND p.status <> 'inactive'
        ORDER BY p.position, p.id
      `,
      [categoryId]
    )
  ).rows;
}

async function renumberByIds(
  client,
  categoryId,
  orderedIds
) {
  if (!orderedIds.length) {
    return;
  }

  const maximum = Number(
    (
      await q(
        client,
        `
          SELECT COALESCE(MAX(position), 0) AS n
          FROM pairs
          WHERE category_id = $1
        `,
        [categoryId]
      )
    ).rows[0].n
  );

  const temporaryBase =
    maximum + orderedIds.length + 10000;

  for (let index = 0; index < orderedIds.length; index += 1) {
    await q(
      client,
      `
        UPDATE pairs
        SET position = $2
        WHERE id = $1
      `,
      [orderedIds[index], temporaryBase + index]
    );
  }

  for (let index = 0; index < orderedIds.length; index += 1) {
    await q(
      client,
      `
        UPDATE pairs
        SET position = $2
        WHERE id = $1
      `,
      [orderedIds[index], index + 1]
    );
  }
}

async function normalizePositions(client, categoryId) {
  const ids = (
    await q(
      client,
      `
        SELECT id
        FROM pairs
        WHERE category_id = $1
          AND status <> 'inactive'
        ORDER BY position, id
      `,
      [categoryId]
    )
  ).rows.map((row) => row.id);

  await renumberByIds(client, categoryId, ids);
}

async function liftFirstTimePlayersAboveUnplayed(
  client,
  categoryId,
  participantIds
) {
  const rows = await activeRows(client, categoryId);
  const participantSet = new Set(
    participantIds.map(Number)
  );

  const firstTimers = rows.filter(
    (row) =>
      participantSet.has(Number(row.id)) &&
      Number(row.matches_played) === 1
  );

  if (!firstTimers.length) {
    return;
  }

  const firstTimerIds = new Set(
    firstTimers.map((row) => Number(row.id))
  );

  const remaining = rows.filter(
    (row) => !firstTimerIds.has(Number(row.id))
  );

  const firstUnplayedIndex = remaining.findIndex(
    (row) => Number(row.matches_played) === 0
  );

  if (firstUnplayedIndex < 0) {
    return;
  }

  const orderedIds = remaining.map((row) => Number(row.id));
  orderedIds.splice(
    firstUnplayedIndex,
    0,
    ...firstTimers.map((row) => Number(row.id))
  );

  await renumberByIds(client, categoryId, orderedIds);
}

async function pairName(client, pairId) {
  return (
    await q(
      client,
      `
        SELECT string_agg(
          u.first_name || ' ' || u.last_name,
          ' / '
          ORDER BY u.id
        ) AS players
        FROM pair_members pm
        JOIN users u
          ON u.id = pm.user_id
        WHERE pm.pair_id = $1
      `,
      [pairId]
    )
  ).rows[0]?.players || `Pareja #${pairId}`;
}

async function currentFirstDivisionRecord(client) {
  return (
    await q(
      client,
      `
        SELECT
          id,
          pair_id,
          pair_name,
          elo,
          category_number,
          league_slug,
          defenses,
          achieved_at,
          recorded_at
        FROM elo_record_history
        WHERE category_number = 1
        ORDER BY elo DESC,
                 achieved_at ASC,
                 id ASC
        LIMIT 1
      `
    )
  ).rows[0] || null;
}

async function recordFirstDivisionPeak(
  client,
  pair,
  category
) {
  const elo = Number(pair.elo);

  if (
    Number(category.number) !== 1 ||
    Number(pair.position) !== 1 ||
    elo < 2000
  ) {
    return;
  }

  const current =
    await currentFirstDivisionRecord(client);

  if (
    current &&
    elo <= Number(current.elo)
  ) {
    return;
  }

  await q(
    client,
    `
      INSERT INTO elo_record_history(
        pair_id,
        pair_name,
        elo,
        category_number,
        league_slug,
        defenses,
        achieved_at
      )
      VALUES($1,$2,$3,1,$4,$5,now())
    `,
    [
      pair.id,
      await pairName(client, pair.id),
      elo,
      category.league_slug,
      Number(pair.first_place_defenses || 0),
    ]
  );
}

export async function recalculateCategoryElo(
  client,
  categoryId
) {
  const category =
    await categoryInfo(client, categoryId);

  if (!category) {
    return;
  }

  const rows = await activeRows(client, categoryId);
  const total = rows.length;

  for (const row of rows) {
    const played = Number(row.matches_played) > 0;
    let elo = 0;

    if (played) {
      if (total <= 1) {
        elo = 2000;
      } else {
        elo =
          2000 *
          (total - Number(row.position)) /
          (total - 1);
      }
    }

    if (
      Number(category.number) === 1 &&
      Number(row.position) === 1 &&
      played
    ) {
      elo =
        2000 +
        Number(row.first_place_defenses || 0);
    }

    await q(
      client,
      `
        UPDATE pairs
        SET elo = $2
        WHERE id = $1
      `,
      [row.id, Number(elo.toFixed(6))]
    );
  }

  if (Number(category.number) === 1 && rows.length) {
    const leader = (
      await q(
        client,
        `
          SELECT *
          FROM pairs
          WHERE category_id = $1
            AND status <> 'inactive'
            AND position = 1
          LIMIT 1
        `,
        [categoryId]
      )
    ).rows[0];

    if (leader) {
      await recordFirstDivisionPeak(
        client,
        leader,
        category
      );
    }
  }
}

export async function recalculateAllElos() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const categories = (
      await q(
        client,
        `
          SELECT id
          FROM categories
          ORDER BY league_id, number
        `
      )
    ).rows;

    for (const category of categories) {
      await recalculateCategoryElo(
        client,
        category.id
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function swapPositions(
  client,
  categoryId,
  firstId,
  secondId
) {
  const rows = await activeRows(client, categoryId);
  const ordered = rows.map((row) => Number(row.id));
  const a = ordered.indexOf(Number(firstId));
  const b = ordered.indexOf(Number(secondId));

  if (a < 0 || b < 0 || a === b) {
    return;
  }

  [ordered[a], ordered[b]] = [ordered[b], ordered[a]];

  await renumberByIds(client, categoryId, ordered);
}

async function applyLadderResult(
  client,
  winnerPairId,
  loserPairId
) {
  const rows = (
    await q(
      client,
      `
        SELECT
          p.id,
          p.category_id,
          p.position,
          p.first_place_defenses,
          c.number AS category_number
        FROM pairs p
        JOIN categories c
          ON c.id = p.category_id
        WHERE p.id = ANY($1::bigint[])
          AND p.status <> 'inactive'
        FOR UPDATE OF p
      `,
      [[winnerPairId, loserPairId]]
    )
  ).rows;

  const winner = rows.find(
    (row) => Number(row.id) === Number(winnerPairId)
  );
  const loser = rows.find(
    (row) => Number(row.id) === Number(loserPairId)
  );

  if (!winner || !loser) {
    throw problem("No se encontraron las parejas del partido");
  }

  const sameCategory =
    Number(winner.category_id) ===
    Number(loser.category_id);

  const winnerWasFirst =
    Number(winner.category_number) === 1 &&
    Number(winner.position) === 1;

  if (
    sameCategory &&
    Number(winner.position) > Number(loser.position)
  ) {
    await swapPositions(
      client,
      winner.category_id,
      winner.id,
      loser.id
    );

    if (
      Number(winner.category_number) === 1 &&
      Number(loser.position) === 1
    ) {
      await q(
        client,
        `
          UPDATE pairs
          SET first_place_defenses = 0
          WHERE id = ANY($1::bigint[])
        `,
        [[winner.id, loser.id]]
      );
    }
  }

  if (sameCategory) {
    await liftFirstTimePlayersAboveUnplayed(
      client,
      winner.category_id,
      [winner.id, loser.id]
    );
  }

  const afterWinner = (
    await q(
      client,
      `
        SELECT p.*, c.number AS category_number
        FROM pairs p
        JOIN categories c
          ON c.id = p.category_id
        WHERE p.id = $1
      `,
      [winnerPairId]
    )
  ).rows[0];

  if (
    winnerWasFirst &&
    Number(afterWinner?.category_number) === 1 &&
    Number(afterWinner?.position) === 1
  ) {
    await q(
      client,
      `
        UPDATE pairs
        SET first_place_defenses = first_place_defenses + 1
        WHERE id = $1
      `,
      [winnerPairId]
    );
  }

  return {
    categoryIds: [
      ...new Set(
        [winner.category_id, loser.category_id]
          .map(Number)
      ),
    ],
  };
}

async function insertInCategory(
  client,
  pairId,
  targetCategoryId,
  requestedPosition
) {
  const maximum = Number(
    (
      await q(
        client,
        `
          SELECT COALESCE(MAX(position), 0) AS n
          FROM pairs
          WHERE category_id = $1
        `,
        [targetCategoryId]
      )
    ).rows[0].n
  );

  await q(
    client,
    `
      UPDATE pairs
      SET category_id = $2,
          position = $3
      WHERE id = $1
    `,
    [pairId, targetCategoryId, maximum + 10000]
  );

  const rows = await activeRows(client, targetCategoryId);
  const without = rows
    .filter((row) => Number(row.id) !== Number(pairId))
    .map((row) => Number(row.id));

  const finalPosition = Math.max(
    1,
    Math.min(
      Number(requestedPosition),
      without.length + 1
    )
  );

  without.splice(finalPosition - 1, 0, Number(pairId));

  await renumberByIds(client, targetCategoryId, without);

  return finalPosition;
}

async function promotePair(client, pair) {
  const upper = (
    await q(
      client,
      `
        SELECT id
        FROM categories
        WHERE league_id = $1
          AND number = $2
        FOR UPDATE
      `,
      [pair.league_id, Number(pair.category_number) - 1]
    )
  ).rows[0];

  if (!upper) {
    return false;
  }

  const sourceCategoryId = Number(pair.category_id);
  const upperCount = Number(
    (
      await q(
        client,
        `
          SELECT count(*) AS n
          FROM pairs
          WHERE category_id = $1
            AND status <> 'inactive'
        `,
        [upper.id]
      )
    ).rows[0].n
  );

  await insertInCategory(
    client,
    pair.id,
    upper.id,
    upperCount + 1
  );

  await q(
    client,
    `
      UPDATE pairs
      SET consecutive_wins = 0,
          first_place_defenses = 0
      WHERE id = $1
    `,
    [pair.id]
  );

  await normalizePositions(client, sourceCategoryId);
  await normalizePositions(client, upper.id);

  await q(
    client,
    `
      INSERT INTO category_movements(
        pair_id,
        from_category_id,
        to_category_id,
        reason
      )
      VALUES($1,$2,$3,'three_wins_promotion')
    `,
    [pair.id, sourceCategoryId, upper.id]
  );

  await recalculateCategoryElo(client, sourceCategoryId);
  await recalculateCategoryElo(client, upper.id);

  return true;
}

async function relegatePair(client, pair) {
  const lower = (
    await q(
      client,
      `
        SELECT id
        FROM categories
        WHERE league_id = $1
          AND number = $2
        FOR UPDATE
      `,
      [pair.league_id, Number(pair.category_number) + 1]
    )
  ).rows[0];

  if (!lower) {
    return false;
  }

  const sourceCategoryId = Number(pair.category_id);
  const debt = Number(pair.position_penalty_debt || 0);
  const lowerCount = Number(
    (
      await q(
        client,
        `
          SELECT count(*) AS n
          FROM pairs
          WHERE category_id = $1
            AND status <> 'inactive'
        `,
        [lower.id]
      )
    ).rows[0].n
  );

  const requestedPosition =
    lowerCount === 0
      ? 1
      : 2 + debt;

  const finalPosition =
    await insertInCategory(
      client,
      pair.id,
      lower.id,
      requestedPosition
    );

  const debtConsumed =
    lowerCount === 0
      ? 0
      : Math.max(0, finalPosition - 2);

  const debtRemaining = Math.max(
    0,
    debt - debtConsumed
  );

  await q(
    client,
    `
      UPDATE pairs
      SET consecutive_losses = 0,
          first_place_defenses = 0,
          position_penalty_debt = $2
      WHERE id = $1
    `,
    [pair.id, debtRemaining]
  );

  await normalizePositions(client, sourceCategoryId);
  await normalizePositions(client, lower.id);

  await q(
    client,
    `
      INSERT INTO category_movements(
        pair_id,
        from_category_id,
        to_category_id,
        reason
      )
      VALUES($1,$2,$3,'three_losses_relegation')
    `,
    [pair.id, sourceCategoryId, lower.id]
  );

  await recalculateCategoryElo(client, sourceCategoryId);
  await recalculateCategoryElo(client, lower.id);

  return true;
}

async function evaluateMovements(
  client,
  winnerPairId,
  loserPairId
) {
  const winner = (
    await q(
      client,
      `
        SELECT p.*, c.number AS category_number
        FROM pairs p
        JOIN categories c
          ON c.id = p.category_id
        WHERE p.id = $1
      `,
      [winnerPairId]
    )
  ).rows[0];

  const loser = (
    await q(
      client,
      `
        SELECT p.*, c.number AS category_number
        FROM pairs p
        JOIN categories c
          ON c.id = p.category_id
        WHERE p.id = $1
      `,
      [loserPairId]
    )
  ).rows[0];

  let shouldPromote = false;
  let shouldRelegate = false;

  if (winner) {
    shouldPromote =
      Number(winner.position) === 1 &&
      Number(winner.consecutive_wins) >= 3 &&
      Number(winner.category_number) > 1;
  }

  if (loser) {
    const last = (
      await q(
        client,
        `
          SELECT id
          FROM pairs
          WHERE category_id = $1
            AND status <> 'inactive'
          ORDER BY position DESC
          LIMIT 1
        `,
        [loser.category_id]
      )
    ).rows[0];

    shouldRelegate =
      Number(last?.id) === Number(loser.id) &&
      Number(loser.consecutive_losses) >= 3 &&
      Number(loser.category_number) < 7;
  }

  if (shouldPromote) {
    await promotePair(client, winner);
  }

  if (shouldRelegate) {
    const refreshedLoser = (
      await q(
        client,
        `
          SELECT p.*, c.number AS category_number
          FROM pairs p
          JOIN categories c
            ON c.id = p.category_id
          WHERE p.id = $1
        `,
        [loserPairId]
      )
    ).rows[0];

    if (
      refreshedLoser &&
      Number(refreshedLoser.category_number) < 7
    ) {
      await relegatePair(client, refreshedLoser);
    }
  }
}

export async function applyConfirmedMatch(
  client,
  match
) {
  const winnerPairId = Number(match.winner_pair_id);
  const loserPairId =
    winnerPairId === Number(match.pair_a_id)
      ? Number(match.pair_b_id)
      : Number(match.pair_a_id);

  const ladder = await applyLadderResult(
    client,
    winnerPairId,
    loserPairId
  );

  await q(
    client,
    `
      UPDATE pairs
      SET consecutive_wins = consecutive_wins + 1,
          consecutive_losses = 0
      WHERE id = $1
    `,
    [winnerPairId]
  );

  await q(
    client,
    `
      UPDATE pairs
      SET consecutive_losses = consecutive_losses + 1,
          consecutive_wins = 0
      WHERE id = $1
    `,
    [loserPairId]
  );

  for (const categoryId of ladder.categoryIds) {
    await recalculateCategoryElo(client, categoryId);
  }

  await evaluateMovements(
    client,
    winnerPairId,
    loserPairId
  );
}

async function applyPositionPenalties(
  client,
  pairIds
) {
  const uniqueIds = [
    ...new Set(
      pairIds
        .map(Number)
        .filter((value) => Number.isInteger(value))
    ),
  ];

  if (!uniqueIds.length) {
    return;
  }

  const pairs = (
    await q(
      client,
      `
        SELECT
          p.id,
          p.category_id,
          p.position,
          c.number AS category_number
        FROM pairs p
        JOIN categories c
          ON c.id = p.category_id
        WHERE p.id = ANY($1::bigint[])
          AND p.status <> 'inactive'
        FOR UPDATE OF p
      `,
      [uniqueIds]
    )
  ).rows;

  const byCategory = new Map();

  for (const pair of pairs) {
    const key = Number(pair.category_id);

    if (!byCategory.has(key)) {
      byCategory.set(key, []);
    }

    byCategory.get(key).push(Number(pair.id));
  }

  for (const [categoryId, ids] of byCategory) {
    const rows = (
      await q(
        client,
        `
          SELECT
            id,
            position,
            first_place_defenses
          FROM pairs
          WHERE category_id = $1
            AND status <> 'inactive'
          ORDER BY position, id
          FOR UPDATE
        `,
        [categoryId]
      )
    ).rows;

    const penalized = new Set(ids.map(Number));
    const originalOrder = rows.map((row) => Number(row.id));
    const order = [...originalOrder];
    const blocks = [];

    let index = 0;

    while (index < originalOrder.length) {
      if (!penalized.has(originalOrder[index])) {
        index += 1;
        continue;
      }

      const start = index;

      while (
        index + 1 < originalOrder.length &&
        penalized.has(originalOrder[index + 1])
      ) {
        index += 1;
      }

      blocks.push({
        start,
        end: index,
        ids: originalOrder.slice(start, index + 1),
      });

      index += 1;
    }

    const debtIds = [];

    for (let blockIndex = blocks.length - 1; blockIndex >= 0; blockIndex -= 1) {
      const block = blocks[blockIndex];

      if (block.end >= originalOrder.length - 1) {
        debtIds.push(...block.ids);
        continue;
      }

      const followerIndex = block.end + 1;
      const followerId = originalOrder[followerIndex];
      const currentFollowerIndex = order.indexOf(followerId);
      const currentBlockStart = order.indexOf(block.ids[0]);

      if (
        currentFollowerIndex >= 0 &&
        currentBlockStart >= 0
      ) {
        order.splice(currentFollowerIndex, 1);
        order.splice(currentBlockStart, 0, followerId);
      }
    }

    if (order.some((id, i) => id !== originalOrder[i])) {
      await renumberByIds(client, categoryId, order);
    }

    if (debtIds.length) {
      await q(
        client,
        `
          UPDATE pairs
          SET position_penalty_debt = position_penalty_debt + 1
          WHERE id = ANY($1::bigint[])
        `,
        [debtIds]
      );
    }

    const formerLeaderId = originalOrder[0];

    if (
      Number(
        pairs.find(
          (pair) => Number(pair.category_id) === Number(categoryId)
        )?.category_number
      ) === 1 &&
      penalized.has(formerLeaderId) &&
      order[0] !== formerLeaderId
    ) {
      await q(
        client,
        `
          UPDATE pairs
          SET first_place_defenses = 0
          WHERE id = $1
        `,
        [formerLeaderId]
      );
    }

    await recalculateCategoryElo(client, categoryId);
  }
}

async function refreshAllDiscipline(client) {
  await q(
    client,
    `
      WITH report_counts AS (
        SELECT
          p.id AS pair_id,
          count(
            DISTINCT r.reporter_pair_id
          )::int AS distinct_reporters_180d
        FROM pairs p
        LEFT JOIN reports r
          ON r.reported_pair_id = p.id
         AND r.status <> 'dismissed'
         AND r.created_at >= now() - interval '180 days'
        WHERE p.status <> 'inactive'
        GROUP BY p.id
      )
      UPDATE pairs p
      SET status = CASE
        WHEN rc.distinct_reporters_180d >= 5 THEN 'review'
        WHEN rc.distinct_reporters_180d >= 3 THEN 'observed'
        ELSE 'active'
      END
      FROM report_counts rc
      WHERE p.id = rc.pair_id
        AND p.status <> 'inactive'
    `
  );
}

export async function maintenance() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await q(
      client,
      "SELECT pg_advisory_xact_lock(7411801)"
    );

    const unanswered = (
      await q(
        client,
        `
          SELECT *
          FROM challenges
          WHERE status = 'pending'
            AND response_deadline_at IS NOT NULL
            AND response_deadline_at <= now()
            AND response_penalty_applied_at IS NULL
          FOR UPDATE
        `
      )
    ).rows;

    for (const challenge of unanswered) {
      await applyPositionPenalties(
        client,
        [challenge.challenged_pair_id]
      );

      await q(
        client,
        `
          UPDATE challenges
          SET status = 'expired',
              response_penalty_applied_at = now()
          WHERE id = $1
        `,
        [challenge.id]
      );
    }

    const unresolved = (
      await q(
        client,
        `
          SELECT ch.*
          FROM challenges ch
          WHERE ch.status = 'accepted'
            AND ch.play_deadline_at IS NOT NULL
            AND ch.play_deadline_at <= now()
            AND ch.resolution_penalty_applied_at IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM match_submissions ms
              WHERE ms.challenge_id = ch.id
                AND ms.status IN ('pending', 'disputed')
            )
          FOR UPDATE OF ch
        `
      )
    ).rows;

    for (const challenge of unresolved) {
      await applyPositionPenalties(
        client,
        [
          challenge.challenger_pair_id,
          challenge.challenged_pair_id,
        ]
      );

      await q(
        client,
        `
          UPDATE challenges
          SET status = 'expired',
              resolution_penalty_applied_at = now()
          WHERE id = $1
        `,
        [challenge.id]
      );
    }

    await refreshAllDiscipline(client);
    await client.query("COMMIT");

    return {
      unanswered: unanswered.length,
      unresolved: unresolved.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createChallenge(
  userId,
  targetPairId
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const mine = await activePairForUser(client, userId);

    if (!mine) {
      throw problem("No tenés pareja activa");
    }

    const currentStatus = (
      await q(
        client,
        `SELECT status FROM pairs WHERE id = $1`,
        [mine.id]
      )
    ).rows[0]?.status;

    if (currentStatus === "review") {
      throw problem(
        "Tu pareja está en revisión y no puede crear desafíos"
      );
    }

    const target = (
      await q(
        client,
        `
          SELECT *
          FROM pairs
          WHERE id = $1
            AND status <> 'inactive'
          FOR UPDATE
        `,
        [targetPairId]
      )
    ).rows[0];

    if (
      !target ||
      Number(target.league_id) !== Number(mine.league_id) ||
      Number(target.category_id) !== Number(mine.category_id)
    ) {
      throw problem(
        "El rival debe estar activo y en tu misma categoría"
      );
    }

    if (Number(target.id) === Number(mine.id)) {
      throw problem("No podés desafiar a tu propia pareja");
    }

    const meetings = Number(
      (
        await q(
          client,
          `
            SELECT count(*) AS n
            FROM matches
            WHERE (
              pair_a_id = $1 AND pair_b_id = $2
            ) OR (
              pair_a_id = $2 AND pair_b_id = $1
            )
          `,
          [mine.id, target.id]
        )
      ).rows[0].n
    );

    const challenge = (
      await q(
        client,
        `
          INSERT INTO challenges(
            league_id,
            challenger_pair_id,
            challenged_pair_id,
            historical_meetings_at_creation,
            response_deadline_at
          )
          VALUES(
            $1,$2,$3,$4,
            now() + interval '30 days'
          )
          RETURNING *
        `,
        [mine.league_id, mine.id, target.id, meetings]
      )
    ).rows[0];

    await client.query("COMMIT");
    return challenge;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function acceptChallenge(
  userId,
  challengeId
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const mine = await activePairForUser(client, userId);

    if (!mine) {
      throw problem("No tenés pareja activa");
    }

    const challenge = (
      await q(
        client,
        `
          UPDATE challenges
          SET status = 'accepted',
              accepted_at = now(),
              play_deadline_at = now() + interval '90 days',
              expiry_penalty_applied_at = COALESCE(
                expiry_penalty_applied_at,
                now()
              )
          WHERE id = $1
            AND challenged_pair_id = $2
            AND status = 'pending'
            AND (
              response_deadline_at IS NULL
              OR response_deadline_at > now()
            )
          RETURNING *
        `,
        [challengeId, mine.id]
      )
    ).rows[0];

    if (!challenge) {
      throw problem(
        "El desafío ya venció o no está disponible para aceptar"
      );
    }

    await client.query("COMMIT");
    return challenge;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function opponents(userId) {
  const client = await pool.connect();

  try {
    const mine = await activePairForUser(client, userId);

    if (!mine) {
      return [];
    }

    return (
      await q(
        client,
        `
          WITH pair_names AS (
            SELECT
              p.id AS pair_id,
              string_agg(
                u.first_name || ' ' || u.last_name,
                ' / '
                ORDER BY u.id
              ) AS players
            FROM pairs p
            JOIN pair_members pm
              ON pm.pair_id = p.id
            JOIN users u
              ON u.id = pm.user_id
            GROUP BY p.id
          ),
          candidates AS (
            SELECT
              p.id AS pair_id,
              p.position,
              p.elo,
              p.status,
              p.created_at,
              pn.players,
              (
                SELECT count(*)::int
                FROM matches m
                WHERE (
                  m.pair_a_id = $1
                  AND m.pair_b_id = p.id
                ) OR (
                  m.pair_a_id = p.id
                  AND m.pair_b_id = $1
                )
              ) AS historical_meetings,
              (
                SELECT count(*)::int
                FROM challenges ch
                WHERE ch.status IN ('pending', 'accepted')
                  AND (
                    (
                      ch.challenger_pair_id = $1
                      AND ch.challenged_pair_id = p.id
                    ) OR (
                      ch.challenger_pair_id = p.id
                      AND ch.challenged_pair_id = $1
                    )
                  )
              ) AS active_challenges
            FROM pairs p
            JOIN pair_names pn
              ON pn.pair_id = p.id
            WHERE p.category_id = $2
              AND p.id <> $1
              AND p.status <> 'inactive'
          )
          SELECT *
          FROM candidates
          ORDER BY
            historical_meetings ASC,
            created_at ASC,
            position ASC,
            pair_id ASC
        `,
        [mine.id, mine.category_id]
      )
    ).rows;
  } finally {
    client.release();
  }
}

function parseWinnerPerspectiveGames(score) {
  const text =
    typeof score === "string"
      ? score
      : score?.text;

  if (!text) {
    return null;
  }

  const matches = [
    ...String(text).matchAll(/(\d+)\s*[-:]\s*(\d+)/g),
  ];

  if (!matches.length) {
    return null;
  }

  let winnerGames = 0;
  let loserGames = 0;

  for (const item of matches) {
    winnerGames += Number(item[1]);
    loserGames += Number(item[2]);
  }

  return {
    winnerGames,
    loserGames,
  };
}

export async function ranking() {
  await maintenance();
  await recalculateAllElos();

  const [rowsResult, matchesResult] = await Promise.all([
    pool.query(
      `
        WITH stats AS (
          SELECT
            p.id AS pair_id,
            (
              SELECT count(*)::int
              FROM matches m
              WHERE m.status IN ('confirmed', 'walkover')
                AND (
                  m.pair_a_id = p.id
                  OR m.pair_b_id = p.id
                )
            ) AS matches_played,
            (
              SELECT count(*)::int
              FROM matches m
              WHERE m.status IN ('confirmed', 'walkover')
                AND m.winner_pair_id = p.id
            ) AS matches_won
          FROM pairs p
        )
        SELECT
          l.slug,
          c.number,
          c.name,
          p.id AS pair_id,
          p.position,
          p.elo,
          p.status,
          p.position_penalty_debt,
          p.first_place_defenses,
          p.created_at,
          s.matches_played,
          s.matches_won,
          string_agg(
            u.first_name || ' ' || u.last_name,
            ' / '
            ORDER BY u.id
          ) AS players
        FROM pairs p
        JOIN categories c
          ON c.id = p.category_id
        JOIN leagues l
          ON l.id = p.league_id
        JOIN stats s
          ON s.pair_id = p.id
        JOIN pair_members pm
          ON pm.pair_id = p.id
        JOIN users u
          ON u.id = pm.user_id
        WHERE p.status <> 'inactive'
        GROUP BY
          l.slug,
          c.number,
          c.name,
          p.id,
          s.matches_played,
          s.matches_won
        ORDER BY l.slug, c.number, p.position
      `
    ),
    pool.query(
      `
        SELECT
          pair_a_id,
          pair_b_id,
          winner_pair_id,
          score
        FROM matches
        WHERE status IN ('confirmed', 'walkover')
      `
    ),
  ]);

  const gameDiff = new Map();

  for (const match of matchesResult.rows) {
    const parsed = parseWinnerPerspectiveGames(match.score);

    if (!parsed) {
      continue;
    }

    const winnerId = Number(match.winner_pair_id);
    const loserId =
      winnerId === Number(match.pair_a_id)
        ? Number(match.pair_b_id)
        : Number(match.pair_a_id);

    const delta =
      parsed.winnerGames - parsed.loserGames;

    gameDiff.set(
      winnerId,
      (gameDiff.get(winnerId) || 0) + delta
    );

    gameDiff.set(
      loserId,
      (gameDiff.get(loserId) || 0) - delta
    );
  }

  return rowsResult.rows.map((row) => ({
    ...row,
    elo: Number(row.elo),
    games_diff: gameDiff.get(Number(row.pair_id)) || 0,
  }));
}

export async function firstDivisionRecords() {
  const result = await pool.query(
    `
      SELECT
        id,
        pair_id,
        pair_name,
        elo,
        category_number,
        league_slug,
        defenses,
        achieved_at,
        recorded_at
      FROM elo_record_history
      WHERE category_number = 1
      ORDER BY elo DESC,
               achieved_at ASC,
               id ASC
    `
  );

  return result.rows.map((row) => ({
    ...row,
    elo: Number(row.elo),
    defenses: Number(row.defenses || 0),
  }));
}
