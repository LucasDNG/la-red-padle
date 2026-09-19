import { pool } from "./db.js";

async function pairForUser(client, userId) {
  const result = await client.query(
    `
      SELECT p.*
      FROM pairs p
      JOIN pair_members pm ON pm.pair_id = p.id
      WHERE pm.user_id = $1
        AND p.status <> 'inactive'
      ORDER BY p.id DESC
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export async function availablePlayers(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.gender
      FROM users u
      WHERE u.role = 'player'
        AND u.id <> $1
        AND u.gender = (
          SELECT gender
          FROM users
          WHERE id = $1
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pair_members pm
          JOIN pairs p ON p.id = pm.pair_id
          WHERE pm.user_id = u.id
            AND p.status <> 'inactive'
        )
      ORDER BY
        u.first_name,
        u.last_name
    `,
    [userId]
  );

  return result.rows;
}

export async function myPair(userId) {
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.league_id,
        p.category_id,
        p.position,
        p.elo,
        p.status,
        p.consecutive_wins,
        p.consecutive_losses,
        p.created_at,

        l.slug league_slug,
        l.name league_name,

        c.number category_number,
        c.name category_name,
        c.capacity,

        string_agg(
          u.first_name || ' ' || u.last_name,
          ' / '
          ORDER BY u.id
        ) players,

        jsonb_agg(
          jsonb_build_object(
            'id', u.id,
            'name', u.first_name || ' ' || u.last_name,
            'phone', u.phone
          )
          ORDER BY u.id
        ) members

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
        p.league_id,
        p.category_id,
        p.position,
        p.elo,
        p.status,
        p.consecutive_wins,
        p.consecutive_losses,
        p.created_at,
        l.slug,
        l.name,
        c.number,
        c.name,
        c.capacity
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export async function opponents(userId) {
  const client = await pool.connect();

  try {
    const mine = await pairForUser(
      client,
      userId
    );

    if (!mine) {
      return [];
    }

    const result =
      await client.query(
        `
          WITH pair_names AS (
            SELECT
              p.id pair_id,

              string_agg(
                u.first_name || ' ' || u.last_name,
                ' / '
                ORDER BY u.id
              ) players

            FROM pairs p

            JOIN pair_members pm
              ON pm.pair_id = p.id

            JOIN users u
              ON u.id = pm.user_id

            GROUP BY p.id
          )

          SELECT
            p.id pair_id,
            p.position,
            p.elo,
            p.status,
            pn.players,

            (
              SELECT count(*)::int
              FROM matches m
              WHERE
                (
                  m.pair_a_id = $1
                  AND
                  m.pair_b_id = p.id
                )
                OR
                (
                  m.pair_a_id = p.id
                  AND
                  m.pair_b_id = $1
                )
            ) historical_meetings,

            (
              SELECT count(*)::int
              FROM challenges ch
              WHERE
                ch.status IN(
                  'pending',
                  'accepted'
                )
                AND
                (
                  (
                    ch.challenger_pair_id = $1
                    AND
                    ch.challenged_pair_id = p.id
                  )
                  OR
                  (
                    ch.challenger_pair_id = p.id
                    AND
                    ch.challenged_pair_id = $1
                  )
                )
            ) active_challenges

          FROM pairs p

          JOIN pair_names pn
            ON pn.pair_id = p.id

          WHERE p.category_id = $2
            AND p.id <> $1
            AND p.status <> 'inactive'

          ORDER BY
            p.position,
            p.id
        `,
        [
          mine.id,
          mine.category_id,
        ]
      );

    return result.rows;
  } finally {
    client.release();
  }
}

export async function challengeInbox(userId) {
  const client = await pool.connect();

  try {
    const mine = await pairForUser(
      client,
      userId
    );

    if (!mine) {
      return [];
    }

    const result =
      await client.query(
        `
          WITH pair_info AS (
            SELECT
              p.id pair_id,
              p.position,
              p.elo,

              string_agg(
                u.first_name || ' ' || u.last_name,
                ' / '
                ORDER BY u.id
              ) players

            FROM pairs p

            JOIN pair_members pm
              ON pm.pair_id = p.id

            JOIN users u
              ON u.id = pm.user_id

            GROUP BY
              p.id,
              p.position,
              p.elo
          )

          SELECT
            ch.*,

            challenger.players
              challenger_players,

            challenger.position
              challenger_position,

            challenger.elo
              challenger_elo

          FROM challenges ch

          JOIN pair_info challenger
            ON challenger.pair_id =
               ch.challenger_pair_id

          WHERE
            ch.challenged_pair_id = $1
            AND
            ch.status = 'pending'

          ORDER BY
            ch.historical_meetings_at_creation,
            ch.created_at,
            ch.id
        `,
        [mine.id]
      );

    return result.rows;
  } finally {
    client.release();
  }
}

export async function playerChallenges(userId) {
  const client = await pool.connect();

  try {
    const mine = await pairForUser(
      client,
      userId
    );

    if (!mine) {
      return [];
    }

    const result =
      await client.query(
        `
          WITH pair_info AS (
            SELECT
              p.id pair_id,
              p.position,
              p.elo,

              string_agg(
                u.first_name || ' ' || u.last_name,
                ' / '
                ORDER BY u.id
              ) players,

              jsonb_agg(
                jsonb_build_object(
                  'id', u.id,
                  'name',
                    u.first_name ||
                    ' ' ||
                    u.last_name,
                  'phone', u.phone
                )
                ORDER BY u.id
              ) contacts

            FROM pairs p

            JOIN pair_members pm
              ON pm.pair_id = p.id

            JOIN users u
              ON u.id = pm.user_id

            GROUP BY
              p.id,
              p.position,
              p.elo
          )

          SELECT
            ch.*,

            CASE
              WHEN
                ch.challenger_pair_id = $1
              THEN 'challenger'
              ELSE 'challenged'
            END role,

            opponent.pair_id
              opponent_pair_id,

            opponent.players
              opponent_players,

            opponent.position
              opponent_position,

            opponent.elo
              opponent_elo,

            CASE
              WHEN ch.status = 'accepted'
              THEN opponent.contacts
              ELSE '[]'::jsonb
            END opponent_contacts,

            EXISTS (
              SELECT 1
              FROM reports r
              WHERE
                r.challenge_id = ch.id
                AND
                r.reporter_pair_id = $1
            ) report_submitted

          FROM challenges ch

          JOIN pair_info opponent
            ON opponent.pair_id =
              CASE
                WHEN
                  ch.challenger_pair_id = $1
                THEN
                  ch.challenged_pair_id
                ELSE
                  ch.challenger_pair_id
              END

          WHERE
            (
              ch.challenger_pair_id = $1
              OR
              ch.challenged_pair_id = $1
            )

            AND
            ch.status IN(
              'pending',
              'accepted'
            )

            AND NOT EXISTS (
              SELECT 1
              FROM match_submissions ms
              WHERE
                ms.challenge_id = ch.id
                AND
                ms.status IN(
                  'pending',
                  'disputed'
                )
            )

          ORDER BY
            CASE
              WHEN
                ch.status = 'accepted'
              THEN 0
              ELSE 1
            END,

            ch.play_deadline_at
              NULLS LAST,

            ch.created_at,
            ch.id
        `,
        [mine.id]
      );

    return result.rows;
  } finally {
    client.release();
  }
}

export async function acceptPendingChallenge(
  userId,
  challengeId
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const mine = await pairForUser(
      client,
      userId
    );

    if (!mine) {
      throw new Error(
        "No tenés pareja activa"
      );
    }

    const result =
      await client.query(
        `
          UPDATE challenges
          SET
            status = 'accepted',
            accepted_at = now(),
            play_deadline_at =
              now() + interval '30 days'

          WHERE id = $1
            AND challenged_pair_id = $2
            AND status = 'pending'

          RETURNING *
        `,
        [
          challengeId,
          mine.id,
        ]
      );

    const challenge =
      result.rows[0];

    if (!challenge) {
      throw new Error(
        "El desafío no está disponible para aceptar"
      );
    }

    await client.query("COMMIT");

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