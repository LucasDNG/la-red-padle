import { pool } from "./db.js";

async function pairForUser(
  client,
  userId
) {
  const result =
    await client.query(
      `
        SELECT p.*
        FROM pairs p

        JOIN pair_members pm
          ON pm.pair_id = p.id

        WHERE
          pm.user_id = $1
          AND p.status <> 'inactive'

        ORDER BY p.id DESC

        LIMIT 1
      `,
      [userId]
    );

  return result.rows[0] || null;
}

async function normalize(
  client,
  categoryId
) {
  const rows = (
    await client.query(
      `
        SELECT
          id,
          position

        FROM pairs

        WHERE
          category_id = $1
          AND status <> 'inactive'

        ORDER BY
          position,
          id
      `,
      [categoryId]
    )
  ).rows;

  if (!rows.length) {
    return;
  }

  const maxPosition =
    Math.max(
      ...rows.map(
        (row) =>
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
    await client.query(
      `
        UPDATE pairs
        SET position = $2
        WHERE id = $1
      `,
      [
        rows[index].id,
        temporaryBase +
          index,
      ]
    );
  }

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    await client.query(
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

async function swapCategories(
  client,
  upPair,
  downPair,
  reason
) {
  const a = (
    await client.query(
      `
        SELECT *
        FROM pairs
        WHERE id = $1
        FOR UPDATE
      `,
      [upPair]
    )
  ).rows[0];

  const b = (
    await client.query(
      `
        SELECT *
        FROM pairs
        WHERE id = $1
        FOR UPDATE
      `,
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

  const maxA =
    Number(
      (
        await client.query(
          `
            SELECT
              COALESCE(
                MAX(position),
                0
              ) max_position

            FROM pairs

            WHERE
              category_id = $1
          `,
          [categoryA]
        )
      ).rows[0]
        .max_position
    );

  const maxB =
    Number(
      (
        await client.query(
          `
            SELECT
              COALESCE(
                MAX(position),
                0
              ) max_position

            FROM pairs

            WHERE
              category_id = $1
          `,
          [categoryB]
        )
      ).rows[0]
        .max_position
    );

  const offsetA =
    maxA + 1000;

  const offsetB =
    maxB + 1000;

  await client.query(
    `
      UPDATE pairs

      SET
        position =
          position + $2

      WHERE
        category_id = $1
    `,
    [
      categoryA,
      offsetA,
    ]
  );

  await client.query(
    `
      UPDATE pairs

      SET
        position =
          position + $2

      WHERE
        category_id = $1
    `,
    [
      categoryB,
      offsetB,
    ]
  );

  await client.query(
    `
      UPDATE pairs
      SET position = $2
      WHERE id = $1
    `,
    [
      a.id,
      maxA +
        offsetA +
        1,
    ]
  );

  await client.query(
    `
      UPDATE pairs
      SET position = $2
      WHERE id = $1
    `,
    [
      b.id,
      maxB +
        offsetB +
        1,
    ]
  );

  await client.query(
    `
      UPDATE pairs

      SET
        category_id = $2,
        position = $3,
        consecutive_wins = 0,
        consecutive_losses = 0

      WHERE id = $1
    `,
    [
      a.id,
      categoryB,
      positionB +
        offsetB,
    ]
  );

  await client.query(
    `
      UPDATE pairs

      SET
        category_id = $2,
        position = $3,
        consecutive_wins = 0,
        consecutive_losses = 0

      WHERE id = $1
    `,
    [
      b.id,
      categoryA,
      positionA +
        offsetA,
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

  await client.query(
    `
      INSERT INTO category_movements(
        pair_id,
        from_category_id,
        to_category_id,
        reason
      )
      VALUES
        (
          $1,
          $2,
          $3,
          $4
        ),
        (
          $5,
          $3,
          $2,
          $4
        )
    `,
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
    await client.query(
      `
        SELECT
          p.*,
          c.number

        FROM pairs p

        JOIN categories c
          ON c.id =
             p.category_id

        WHERE p.id = $1
      `,
      [pairId]
    )
  ).rows[0];

  if (!pair) {
    return;
  }

  if (
    Number(
      pair.position
    ) === 1 &&
    Number(
      pair.consecutive_wins
    ) >= 3 &&
    Number(
      pair.number
    ) > 1
  ) {
    const upper = (
      await client.query(
        `
          SELECT id

          FROM categories

          WHERE
            league_id = $1
            AND number = $2
        `,
        [
          pair.league_id,
          Number(
            pair.number
          ) - 1,
        ]
      )
    ).rows[0];

    if (!upper) {
      return;
    }

    const last = (
      await client.query(
        `
          SELECT id

          FROM pairs

          WHERE
            category_id = $1
            AND status <> 'inactive'

          ORDER BY
            position DESC

          LIMIT 1
        `,
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
    await client.query(
      `
        SELECT
          p.*,
          c.number

        FROM pairs p

        JOIN categories c
          ON c.id =
             p.category_id

        WHERE p.id = $1
      `,
      [pairId]
    )
  ).rows[0];

  if (!pair) {
    return;
  }

  const last = (
    await client.query(
      `
        SELECT id

        FROM pairs

        WHERE
          category_id = $1
          AND status <> 'inactive'

        ORDER BY
          position DESC

        LIMIT 1
      `,
      [
        pair.category_id,
      ]
    )
  ).rows[0];

  if (
    Number(
      last?.id
    ) ===
      Number(
        pair.id
      ) &&
    Number(
      pair.consecutive_losses
    ) >= 3 &&
    Number(
      pair.number
    ) < 7
  ) {
    const lower = (
      await client.query(
        `
          SELECT id

          FROM categories

          WHERE
            league_id = $1
            AND number = $2
        `,
        [
          pair.league_id,
          Number(
            pair.number
          ) + 1,
        ]
      )
    ).rows[0];

    if (!lower) {
      return;
    }

    const first = (
      await client.query(
        `
          SELECT id

          FROM pairs

          WHERE
            category_id = $1
            AND status <> 'inactive'

          ORDER BY position

          LIMIT 1
        `,
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

async function finalizeSubmission(
  client,
  submission
) {
  const challenge = (
    await client.query(
      `
        SELECT *

        FROM challenges

        WHERE id = $1

        FOR UPDATE
      `,
      [
        submission
          .challenge_id,
      ]
    )
  ).rows[0];

  if (
    !challenge ||
    challenge.status !==
      "accepted"
  ) {
    throw new Error(
      "El desafío ya no está disponible"
    );
  }

  const winnerPairId =
    Number(
      submission
        .winner_pair_id
    );

  const loserPairId =
    winnerPairId ===
    Number(
      submission
        .pair_a_id
    )
      ? submission
          .pair_b_id
      : submission
          .pair_a_id;

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
        VALUES(
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          'confirmed'
        )
        RETURNING *
      `,
      [
        submission
          .challenge_id,

        submission
          .league_id,

        submission
          .pair_a_id,

        submission
          .pair_b_id,

        winnerPairId,

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
    [
      submission
        .challenge_id,
    ]
  );

  await client.query(
    `
      UPDATE pairs

      SET
        consecutive_wins =
          consecutive_wins + 1,

        consecutive_losses = 0

      WHERE id = $1
    `,
    [winnerPairId]
  );

  await client.query(
    `
      UPDATE pairs

      SET
        consecutive_losses =
          consecutive_losses + 1,

        consecutive_wins = 0

      WHERE id = $1
    `,
    [loserPairId]
  );

  await promotionCheck(
    client,
    winnerPairId
  );

  await relegationCheck(
    client,
    loserPairId
  );

  await client.query(
    `
      UPDATE match_submissions

      SET
        status = 'confirmed',
        updated_at = now()

      WHERE id = $1
    `,
    [submission.id]
  );

  return match;
}

export async function createMatchSubmission(
  userId,
  challengeId,
  winnerPairId,
  score
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
      await client.query(
        `
          SELECT *

          FROM challenges

          WHERE id = $1

          FOR UPDATE
        `,
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

    if (
      challenge
        .play_deadline_at &&
      new Date(
        challenge
          .play_deadline_at
      ).getTime() <=
        Date.now()
    ) {
      throw new Error(
        "El plazo del desafío ya venció"
      );
    }

    const pairIds = [
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
      !pairIds.includes(
        Number(
          mine.id
        )
      )
    ) {
      throw new Error(
        "No participás del desafío"
      );
    }

    if (
      !pairIds.includes(
        Number(
          winnerPairId
        )
      )
    ) {
      throw new Error(
        "Ganador inválido"
      );
    }

    const active = (
      await client.query(
        `
          SELECT id

          FROM match_submissions

          WHERE
            challenge_id = $1
            AND status IN (
              'pending',
              'disputed'
            )

          LIMIT 1
        `,
        [challenge.id]
      )
    ).rows[0];

    if (active) {
      throw new Error(
        "Ya hay un resultado pendiente para este desafío"
      );
    }

    const submission = (
      await client.query(
        `
          INSERT INTO match_submissions(
            challenge_id,
            league_id,
            pair_a_id,
            pair_b_id,
            submitted_by_pair_id,
            winner_pair_id,
            score,
            play_deadline_at
          )
          VALUES(
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          RETURNING *
        `,
        [
          challenge.id,

          challenge
            .league_id,

          challenge
            .challenger_pair_id,

          challenge
            .challenged_pair_id,

          mine.id,

          winnerPairId,

          score || null,

          challenge
            .play_deadline_at,
        ]
      )
    ).rows[0];

    await client.query(
      `
        UPDATE challenges

        SET
          play_deadline_at =
            NULL

        WHERE id = $1
      `,
      [challenge.id]
    );

    await client.query(
      "COMMIT"
    );

    return submission;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function myMatchSubmissions(
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

    const result =
      await client.query(
        `
          WITH pair_names AS (
            SELECT
              p.id
                pair_id,

              string_agg(
                u.first_name ||
                ' ' ||
                u.last_name,
                ' / '
                ORDER BY u.id
              )
                players

            FROM pairs p

            JOIN pair_members pm
              ON pm.pair_id =
                 p.id

            JOIN users u
              ON u.id =
                 pm.user_id

            GROUP BY p.id
          )

          SELECT
            ms.*,

            submitter.players
              submitted_by_players,

            winner.players
              winner_players,

            opponent.players
              opponent_players,

            CASE
              WHEN
                ms.submitted_by_pair_id =
                  $1
              THEN
                'submitted'

              ELSE
                'received'
            END
              role

          FROM match_submissions ms

          JOIN pair_names submitter
            ON
              submitter.pair_id =
                ms.submitted_by_pair_id

          JOIN pair_names winner
            ON
              winner.pair_id =
                ms.winner_pair_id

          JOIN pair_names opponent
            ON
              opponent.pair_id =
                CASE
                  WHEN
                    ms.pair_a_id =
                      $1
                  THEN
                    ms.pair_b_id

                  ELSE
                    ms.pair_a_id
                END

          WHERE
            (
              ms.pair_a_id = $1
              OR
              ms.pair_b_id = $1
            )

            AND
            ms.status IN (
              'pending',
              'disputed'
            )

          ORDER BY
            CASE
              WHEN
                ms.status =
                  'pending'
              THEN 0
              ELSE 1
            END,

            ms.created_at DESC
        `,
        [mine.id]
      );

    return result.rows;
  } finally {
    client.release();
  }
}

export async function confirmMatchSubmission(
  userId,
  submissionId
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

    if (
      !submission ||
      submission.status !==
        "pending"
    ) {
      throw new Error(
        "Resultado no disponible para confirmar"
      );
    }

    const pairIds = [
      Number(
        submission
          .pair_a_id
      ),

      Number(
        submission
          .pair_b_id
      ),
    ];

    if (
      !pairIds.includes(
        Number(
          mine.id
        )
      )
    ) {
      throw new Error(
        "No participás de este resultado"
      );
    }

    if (
      Number(
        submission
          .submitted_by_pair_id
      ) ===
      Number(
        mine.id
      )
    ) {
      throw new Error(
        "El resultado debe confirmarlo la otra pareja"
      );
    }

    const match =
      await finalizeSubmission(
        client,
        submission
      );

    await client.query(
      `
        UPDATE match_submissions

        SET
          responded_by_pair_id =
            $2,

          responded_at =
            now(),

          updated_at =
            now()

        WHERE id = $1
      `,
      [
        submission.id,
        mine.id,
      ]
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

export async function disputeMatchSubmission(
  userId,
  submissionId,
  note
) {
  const cleanNote =
    String(
      note || ""
    ).trim();

  if (!cleanNote) {
    throw new Error(
      "Explicá brevemente qué dato no coincide"
    );
  }

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

    if (
      !submission ||
      submission.status !==
        "pending"
    ) {
      throw new Error(
        "Resultado no disponible para objetar"
      );
    }

    const pairIds = [
      Number(
        submission
          .pair_a_id
      ),

      Number(
        submission
          .pair_b_id
      ),
    ];

    if (
      !pairIds.includes(
        Number(
          mine.id
        )
      )
    ) {
      throw new Error(
        "No participás de este resultado"
      );
    }

    if (
      Number(
        submission
          .submitted_by_pair_id
      ) ===
      Number(
        mine.id
      )
    ) {
      throw new Error(
        "El desacuerdo debe registrarlo la otra pareja"
      );
    }

    const updated = (
      await client.query(
        `
          UPDATE match_submissions

          SET
            status =
              'disputed',

            response_note =
              $2,

            responded_by_pair_id =
              $3,

            responded_at =
              now(),

            updated_at =
              now()

          WHERE id = $1

          RETURNING *
        `,
        [
          submission.id,
          cleanNote,
          mine.id,
        ]
      )
    ).rows[0];

    await client.query(
      "COMMIT"
    );

    return updated;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function adminDisputedMatchSubmissions() {
  const result =
    await pool.query(
      `
        WITH pair_names AS (
          SELECT
            p.id
              pair_id,

            string_agg(
              u.first_name ||
              ' ' ||
              u.last_name,
              ' / '
              ORDER BY u.id
            )
              players

          FROM pairs p

          JOIN pair_members pm
            ON pm.pair_id =
               p.id

          JOIN users u
            ON u.id =
               pm.user_id

          GROUP BY p.id
        )

        SELECT
          ms.*,

          pair_a.players
            pair_a_players,

          pair_b.players
            pair_b_players,

          submitter.players
            submitted_by_players,

          winner.players
            winner_players,

          responder.players
            responded_by_players

        FROM match_submissions ms

        JOIN pair_names pair_a
          ON
            pair_a.pair_id =
              ms.pair_a_id

        JOIN pair_names pair_b
          ON
            pair_b.pair_id =
              ms.pair_b_id

        JOIN pair_names submitter
          ON
            submitter.pair_id =
              ms.submitted_by_pair_id

        JOIN pair_names winner
          ON
            winner.pair_id =
              ms.winner_pair_id

        LEFT JOIN pair_names responder
          ON
            responder.pair_id =
              ms.responded_by_pair_id

        WHERE
          ms.status =
            'disputed'

        ORDER BY
          ms.responded_at
            NULLS LAST,

          ms.created_at,

          ms.id
      `
    );

  return result.rows;
}

export async function adminResolveMatchSubmission(
  submissionId,
  action
) {
  if (
    ![
      "confirm",
      "reject",
    ].includes(action)
  ) {
    throw new Error(
      "Resolución inválida"
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

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

    if (
      !submission ||
      submission.status !==
        "disputed"
    ) {
      throw new Error(
        "El resultado ya no está en disputa"
      );
    }

    if (
      action ===
      "confirm"
    ) {
      const match =
        await finalizeSubmission(
          client,
          submission
        );

      await client.query(
        "COMMIT"
      );

      return {
        action:
          "confirmed",

        match,
      };
    }

    const rejected = (
      await client.query(
        `
          UPDATE match_submissions

          SET
            status =
              'rejected',

            updated_at =
              now()

          WHERE id = $1

          RETURNING *
        `,
        [submission.id]
      )
    ).rows[0];

    await client.query(
      `
        UPDATE challenges

        SET
          play_deadline_at =
            $2

        WHERE
          id = $1

          AND
          status =
            'accepted'
      `,
      [
        submission
          .challenge_id,

        submission
          .play_deadline_at,
      ]
    );

    await client.query(
      "COMMIT"
    );

    return {
      action:
        "rejected",

      submission:
        rejected,
    };
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}
