import { pool } from "./db.js";

async function refreshPairDiscipline(client, pairId) {
  const result = await client.query(
    `
      SELECT count(DISTINCT reporter_pair_id)::int AS distinct_reporters
      FROM reports
      WHERE reported_pair_id = $1
        AND status <> 'dismissed'
        AND created_at >= now() - interval '180 days'
    `,
    [pairId]
  );

  const distinctReporters =
    Number(result.rows[0]?.distinct_reporters) || 0;

  const pairStatus =
    distinctReporters >= 5
      ? "review"
      : distinctReporters >= 3
        ? "observed"
        : "active";

  await client.query(
    `
      UPDATE pairs
      SET status = $2
      WHERE id = $1
        AND status <> 'inactive'
    `,
    [pairId, pairStatus]
  );

  return pairStatus;
}

export async function updateReportStatus(
  adminUserId,
  reportId,
  status
) {
  if (!["reviewed", "dismissed"].includes(status)) {
    throw new Error("Estado de denuncia inválido");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = (
      await client.query(
        `
          SELECT *
          FROM reports
          WHERE id = $1
          FOR UPDATE
        `,
        [reportId]
      )
    ).rows[0];

    if (!current) {
      throw new Error("Denuncia inexistente");
    }

    const report = (
      await client.query(
        `
          UPDATE reports
          SET
            status = $2,
            reviewed_at = now(),
            reviewed_by = $3
          WHERE id = $1
          RETURNING *
        `,
        [reportId, status, adminUserId]
      )
    ).rows[0];

    const pairStatus = await refreshPairDiscipline(
      client,
      report.reported_pair_id
    );

    await client.query("COMMIT");

    return {
      report,
      pair_status: pairStatus,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}