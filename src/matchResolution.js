import { pool } from "./db.js";
import { applyConfirmedMatch } from "./competition.js";

async function pairForUser(client, userId) {
  return (
    await client.query(
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

async function finalizeSubmission(client, submission) {
  await client.query(
    "SELECT pg_advisory_xact_lock(7411801)"
  );

  const challenge = (
    await client.query(
      `
        SELECT *
        FROM challenges
        WHERE id = $1
        FOR UPDATE
      `,
      [submission.challenge_id]
    )
  ).rows[0];

  if (!challenge || challenge.status !== "accepted") {
    throw new Error("El desafío ya no está disponible");
  }

  const match = (
    await client.query(
      `
        INSERT INTO matches(
          challenge_id,
          league_id,
          pair_a_id,
          pair_b_id,
          winner_pair_id,
          score,
          status
        )
        VALUES($1,$2,$3,$4,$5,$6,'confirmed')
        RETURNING *
      `,
      [
        submission.challenge_id,
        submission.league_id,
        submission.pair_a_id,
        submission.pair_b_id,
        submission.winner_pair_id,
        submission.score,
      ]
    )
  ).rows[0];

  await client.query(
    `
      UPDATE challenges
      SET status = 'played'
      WHERE id = $1
    `,
    [submission.challenge_id]
  );

  await applyConfirmedMatch(client, match);

  await client.query(
    `
      UPDATE match_submissions
      SET status = 'confirmed',
          updated_at = now()
      WHERE id = $1
    `,
    [submission.id]
  );

  return match;
}

export async function confirmMatchSubmission(
  userId,
  submissionId
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const mine = await pairForUser(client, userId);

    if (!mine) {
      throw new Error("No tenés pareja activa");
    }

    const submission = (
      await client.query(
        `
          SELECT *
          FROM match_submissions
          WHERE id = $1
          FOR UPDATE
        `,
        [submissionId]
      )
    ).rows[0];

    if (!submission || submission.status !== "pending") {
      throw new Error(
        "Resultado no disponible para confirmar"
      );
    }

    const pairIds = [
      Number(submission.pair_a_id),
      Number(submission.pair_b_id),
    ];

    if (!pairIds.includes(Number(mine.id))) {
      throw new Error("No participás de este resultado");
    }

    if (
      Number(submission.submitted_by_pair_id) ===
      Number(mine.id)
    ) {
      throw new Error(
        "El resultado debe confirmarlo la otra pareja"
      );
    }

    const match = await finalizeSubmission(
      client,
      submission
    );

    await client.query(
      `
        UPDATE match_submissions
        SET responded_by_pair_id = $2,
            responded_at = now(),
            updated_at = now()
        WHERE id = $1
      `,
      [submission.id, mine.id]
    );

    await client.query("COMMIT");
    return match;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function adminResolveMatchSubmission(
  submissionId,
  action
) {
  if (!["confirm", "reject"].includes(action)) {
    throw new Error("Resolución inválida");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const submission = (
      await client.query(
        `
          SELECT *
          FROM match_submissions
          WHERE id = $1
          FOR UPDATE
        `,
        [submissionId]
      )
    ).rows[0];

    if (!submission || submission.status !== "disputed") {
      throw new Error("El resultado ya no está en disputa");
    }

    if (action === "confirm") {
      const match = await finalizeSubmission(
        client,
        submission
      );

      await client.query("COMMIT");

      return {
        action: "confirmed",
        match,
      };
    }

    const rejected = (
      await client.query(
        `
          UPDATE match_submissions
          SET status = 'rejected',
              updated_at = now()
          WHERE id = $1
          RETURNING *
        `,
        [submission.id]
      )
    ).rows[0];

    await client.query(
      `
        UPDATE challenges
        SET play_deadline_at = $2
        WHERE id = $1
          AND status = 'accepted'
      `,
      [
        submission.challenge_id,
        submission.play_deadline_at,
      ]
    );

    await client.query("COMMIT");

    return {
      action: "rejected",
      submission: rejected,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
