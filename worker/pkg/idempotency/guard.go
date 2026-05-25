package idempotency

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ClaimResult struct {
	Claimed bool
}

func AtomicClaim(ctx context.Context, db *pgxpool.Pool, eventUUID, pipelineID string) (ClaimResult, error) {
	cmd, err := db.Exec(ctx, `
		INSERT INTO event_idempotency_registry (event_uuid, pipeline_id, status)
		VALUES ($1::uuid, $2::uuid, 'processing')
		ON CONFLICT (event_uuid) DO NOTHING
	`, eventUUID, pipelineID)
	if err != nil {
		return ClaimResult{}, err
	}

	return ClaimResult{Claimed: cmd.RowsAffected() == 1}, nil
}
