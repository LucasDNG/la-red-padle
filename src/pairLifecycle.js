import { pool } from "./db.js";

const q = (client, text, values = []) =>
  client.query(text, values);

function problem(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function activePairForUser(
  client,
  userId,
  { lock = false } = {}
) {
  const sql = `
    SELECT
      p.*,
      c.number AS category_number,
      c.capacity
    FROM pairs p
    JOIN pair_members pm
      ON pm.pair_id = p.id
    JOIN categories c
      ON c.id = p.category_id
    WHERE pm.user_id = $1
      AND p.status <> 'inactive'
    ORDER BY p.id DESC
    LIMIT 1
    ${lock ? "FOR UPDATE OF p" : ""}
  `;

  const result = await q(
    client,
    sql,
    [userId]
  );

  return result.rows[0] || null;
}

async function normalizeActivePositions(
  client,
  categoryId
) {
  const rows = (
    await q(
      client,
      `
        SELECT id, position
        FROM pairs
        WHERE category_id = $1
          AND status <> 'inactive'
        ORDER BY position, id
      `,
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
      `
        UPDATE pairs
        SET position = $2
        WHERE id = $1
      `,
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
      `
        UPDATE pairs
        SET position = $2
        WHERE id = $1
      `,
      [
        rows[index].id,
        index + 1,
      ]
    );
  }
}

async function currentRecord(
  client
) {
  return (
    await q(
      client,
      `
        SELECT
          id,
          pair_id,
          pair_name,
          elo,
          achieved_at,
          recorded_at
        FROM elo_record_history
        ORDER BY elo DESC,
                 achieved_at ASC,
                 id ASC
        LIMIT 1
      `
    )
  ).rows[0] || null;
}

export async function pairManagement(
  userId
) {
  const client =
    await pool.connect();

  try {
    const user = (
      await q(
        client,
        `
          SELECT
            id,
            first_name,
            last_name,
            gender,
            current_category_number
          FROM users
          WHERE id = $1
        `,
        [userId]
      )
    ).rows[0];

    if (!user) {
      throw problem(
        "Jugador inexistente",
        404
      );
    }

    const pair = (
      await q(
        client,
        `
          SELECT
            p.id,
            p.league_id,
            p.category_id,
            p.position,
            p.elo,
            p.peak_elo,
            p.peak_elo_at,
            p.status,
            p.created_at,
            c.number AS category_number,
            c.name AS category_name,
            l.name AS league_name,
            string_agg(
              u.first_name || ' ' || u.last_name,
              ' / '
              ORDER BY u.id
            ) AS players
          FROM pairs p
          JOIN leagues l
            ON l.id = p.league_id
          JOIN categories c
            ON c.id = p.category_id
          JOIN pair_members pm
            ON pm.pair_id = p.id
          JOIN users u
            ON u.id = pm.user_id
          WHERE p.id = (
            SELECT p2.id
            FROM pairs p2
            JOIN pair_members pm2
              ON pm2.pair_id = p2.id
            WHERE pm2.user_id = $1
              AND p2.status <> 'inactive'
            ORDER BY p2.id DESC
            LIMIT 1
          )
          GROUP BY
            p.id,
            c.number,
            c.name,
            l.name
        `,
        [userId]
      )
    ).rows[0] || null;

    const players = (
      await q(
        client,
        `
          SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.gender,
            u.current_category_number
          FROM users u
          WHERE u.role = 'player'
            AND u.id <> $1
            AND u.gender = $2
            AND NOT EXISTS (
              SELECT 1
              FROM pair_members pm
              JOIN pairs p
                ON p.id = pm.pair_id
              WHERE pm.user_id = u.id
                AND p.status <> 'inactive'
            )
          ORDER BY
            u.first_name,
            u.last_name,
            u.id
        `,
        [userId, user.gender]
      )
    ).rows;

    return {
      user,
      pair,
      players,
      eloRecord:
        await currentRecord(
          client
        ),
    };
  } finally {
    client.release();
  }
}

export async function registerStablePair(
  userId,
  partnerId,
  requestedCategoryNumber
) {
  if (
    !Number.isInteger(
      Number(partnerId)
    ) ||
    Number(partnerId) <= 0 ||
    Number(partnerId) ===
      Number(userId)
  ) {
    throw problem(
      "Compañero/a inválido"
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const users = (
      await q(
        client,
        `
          SELECT
            id,
            gender,
            current_category_number
          FROM users
          WHERE id = ANY($1::bigint[])
          FOR UPDATE
        `,
        [[
          userId,
          Number(partnerId),
        ]]
      )
    ).rows;

    if (users.length !== 2) {
      throw problem(
        "No se encontraron los dos jugadores"
      );
    }

    if (
      users[0].gender !==
      users[1].gender
    ) {
      throw problem(
        "La pareja debe tener dos jugadores del mismo circuito"
      );
    }

    const league = (
      await q(
        client,
        `
          SELECT *
          FROM leagues
          WHERE gender = $1
            AND active = true
          LIMIT 1
        `,
        [users[0].gender]
      )
    ).rows[0];

    if (!league) {
      throw problem(
        "No hay una liga activa para este circuito"
      );
    }

    const existing = (
      await q(
        client,
        `
          SELECT 1
          FROM pair_members pm
          JOIN pairs p
            ON p.id = pm.pair_id
          WHERE pm.user_id = ANY($1::bigint[])
            AND p.league_id = $2
            AND p.status <> 'inactive'
          LIMIT 1
        `,
        [
          [
            userId,
            Number(partnerId),
          ],
          league.id,
        ]
      )
    ).rowCount;

    if (existing) {
      throw problem(
        "Uno de los jugadores ya integra una pareja activa"
      );
    }

    const knownCategories =
      users
        .map((user) =>
          user.current_category_number ===
          null
            ? null
            : Number(
                user.current_category_number
              )
        )
        .filter((value) =>
          Number.isInteger(value)
        );

    let categoryNumber;

    if (
      knownCategories.length > 0
    ) {
      categoryNumber =
        Math.min(
          ...knownCategories
        );
    } else {
      categoryNumber =
        Number(
          requestedCategoryNumber
        );

      if (
        !Number.isInteger(
          categoryNumber
        ) ||
        categoryNumber < 1 ||
        categoryNumber > 7
      ) {
        throw problem(
          "Elegí una categoría inicial"
        );
      }
    }

    const category = (
      await q(
        client,
        `
          SELECT *
          FROM categories
          WHERE league_id = $1
            AND number = $2
          FOR UPDATE
        `,
        [
          league.id,
          categoryNumber,
        ]
      )
    ).rows[0];

    if (!category) {
      throw problem(
        "Categoría inexistente"
      );
    }

    const count = Number(
      (
        await q(
          client,
          `
            SELECT count(*) AS n
            FROM pairs
            WHERE category_id = $1
              AND status <> 'inactive'
          `,
          [category.id]
        )
      ).rows[0].n
    );

    if (
      !category
        .direct_registration_open ||
      (
        category.capacity !==
          null &&
        count >=
          Number(
            category.capacity
          )
      )
    ) {
      const inherited =
        knownCategories.length > 0;

      throw problem(
        inherited
          ? `La nueva pareja debe competir en ${categoryNumber}ª por el nivel actual de sus integrantes, pero esa categoría está completa.`
          : "La categoría elegida está completa."
      );
    }

    const pair = (
      await q(
        client,
        `
          INSERT INTO pairs(
            league_id,
            category_id,
            position
          )
          VALUES($1,$2,$3)
          RETURNING *
        `,
        [
          league.id,
          category.id,
          count + 1,
        ]
      )
    ).rows[0];

    await q(
      client,
      `
        INSERT INTO pair_members(
          pair_id,
          user_id
        )
        VALUES
          ($1,$2),
          ($1,$3)
      `,
      [
        pair.id,
        userId,
        Number(partnerId),
      ]
    );

    await q(
      client,
      `
        UPDATE users
        SET current_category_number = $2
        WHERE id = ANY($1::bigint[])
      `,
      [
        [
          userId,
          Number(partnerId),
        ],
        categoryNumber,
      ]
    );

    await q(
      client,
      `
        INSERT INTO category_movements(
          pair_id,
          to_category_id,
          reason
        )
        VALUES(
          $1,
          $2,
          'registration'
        )
      `,
      [
        pair.id,
        category.id,
      ]
    );

    if (
      category.capacity !== null &&
      count + 1 >=
        Number(category.capacity)
    ) {
      await q(
        client,
        `
          UPDATE categories
          SET direct_registration_open = false
          WHERE id = $1
        `,
        [category.id]
      );
    }

    await client.query("COMMIT");

    return {
      ...pair,
      category_number:
        categoryNumber,
      category_forced:
        knownCategories.length > 0,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function dissolveCurrentPair(
  userId
) {
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const pair =
      await activePairForUser(
        client,
        userId,
        { lock: true }
      );

    if (!pair) {
      throw problem(
        "No tenés una pareja activa"
      );
    }

    const pairName = (
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
        [pair.id]
      )
    ).rows[0]?.players ||
      `Pareja #${pair.id}`;

    await q(
      client,
      `
        UPDATE users
        SET current_category_number = $2
        WHERE id IN (
          SELECT user_id
          FROM pair_members
          WHERE pair_id = $1
        )
      `,
      [
        pair.id,
        Number(
          pair.category_number
        ),
      ]
    );

    await q(
      client,
      `
        UPDATE challenges
        SET status = 'cancelled'
        WHERE status IN (
          'pending',
          'accepted'
        )
          AND (
            challenger_pair_id = $1
            OR challenged_pair_id = $1
          )
      `,
      [pair.id]
    );

    await q(
      client,
      `
        UPDATE match_submissions
        SET
          status = 'rejected',
          response_note = CASE
            WHEN response_note IS NULL
              OR trim(response_note) = ''
            THEN 'Pareja desarmada.'
            ELSE response_note || E'\\nPareja desarmada.'
          END,
          responded_at = now(),
          updated_at = now()
        WHERE status IN (
          'pending',
          'disputed'
        )
          AND (
            pair_a_id = $1
            OR pair_b_id = $1
          )
      `,
      [pair.id]
    );

    await q(
      client,
      `
        UPDATE pairs
        SET
          status = 'inactive',
          archived_at = now(),
          consecutive_wins = 0,
          consecutive_losses = 0
        WHERE id = $1
      `,
      [pair.id]
    );

    await normalizeActivePositions(
      client,
      pair.category_id
    );

    if (
      pair.capacity !== null
    ) {
      const activeCount = Number(
        (
          await q(
            client,
            `
              SELECT count(*) AS n
              FROM pairs
              WHERE category_id = $1
                AND status <> 'inactive'
            `,
            [pair.category_id]
          )
        ).rows[0].n
      );

      if (
        activeCount <
        Number(pair.capacity)
      ) {
        await q(
          client,
          `
            UPDATE categories
            SET direct_registration_open = true
            WHERE id = $1
          `,
          [pair.category_id]
        );
      }
    }

    const peakElo = Math.max(
      Number(pair.peak_elo || 0),
      Number(pair.elo || 0)
    );

    const existingRecord =
      await currentRecord(
        client
      );

    let recordCreated = false;

    if (
      peakElo >= 2000 &&
      (
        !existingRecord ||
        peakElo >
          Number(
            existingRecord.elo
          )
      )
    ) {
      await q(
        client,
        `
          INSERT INTO elo_record_history(
            pair_id,
            pair_name,
            elo,
            achieved_at
          )
          VALUES($1,$2,$3,$4)
        `,
        [
          pair.id,
          pairName,
          peakElo,
          pair.peak_elo_at ||
            new Date(),
        ]
      );

      recordCreated = true;
    }

    await client.query("COMMIT");

    return {
      ok: true,
      pairId: pair.id,
      archived: true,
      currentCategoryNumber:
        Number(
          pair.category_number
        ),
      eloRecordCreated:
        recordCreated,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function eloRecords() {
  const result =
    await pool.query(
      `
        SELECT
          id,
          pair_id,
          pair_name,
          elo,
          achieved_at,
          recorded_at
        FROM elo_record_history
        ORDER BY
          elo DESC,
          achieved_at ASC,
          id ASC
      `
    );

  return result.rows;
}
