import { pool } from "./db.js";

function problem(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function pairManagement(userId) {
  const client = await pool.connect();

  try {
    const user = (
      await client.query(
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
      throw problem("Jugador inexistente", 404);
    }

    const pair = (
      await client.query(
        `
          SELECT
            p.id,
            p.league_id,
            p.category_id,
            p.position,
            p.elo,
            p.peak_elo,
            p.peak_elo_at,
            p.first_place_defenses,
            p.position_penalty_debt,
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
      await client.query(
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

    const eloRecord = (
      await client.query(
        `
          SELECT
            id,
            pair_id,
            pair_name,
            elo,
            league_slug,
            defenses,
            achieved_at,
            recorded_at
          FROM elo_record_history
          WHERE category_number = 1
          ORDER BY
            elo DESC,
            achieved_at ASC,
            id ASC
          LIMIT 1
        `
      )
    ).rows[0] || null;

    return {
      user,
      pair: pair
        ? {
            ...pair,
            elo: Number(pair.elo),
            peak_elo: Number(pair.peak_elo),
            first_place_defenses:
              Number(pair.first_place_defenses || 0),
            position_penalty_debt:
              Number(pair.position_penalty_debt || 0),
          }
        : null,
      players,
      eloRecord: eloRecord
        ? {
            ...eloRecord,
            elo: Number(eloRecord.elo),
            defenses: Number(eloRecord.defenses || 0),
          }
        : null,
    };
  } finally {
    client.release();
  }
}
