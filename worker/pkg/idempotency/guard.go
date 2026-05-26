package idempotency

import (
	"context"
	"crypto/sha256"
	"encoding/hex"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ClaimResult struct {
	Claimed bool
	Status  string
}

func ClaimAndComplete(ctx context.Context, db *pgxpool.Pool, eventUUID, pipelineID string, sideEffectPayload []byte) (ClaimResult, error) {
	tx, err := db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return ClaimResult{}, err
	}
	defer tx.Rollback(ctx)

	h := sha256.Sum256(sideEffectPayload)
	hash := hex.EncodeToString(h[:])

	var status string
	var retryCount int
	var maxRetries int

	err = tx.QueryRow(ctx, `
		SELECT status::text, retry_count, max_retries
		FROM event_idempotency_registry
		WHERE event_uuid = $1::uuid
		FOR UPDATE
	`, eventUUID).Scan(&status, &retryCount, &maxRetries)

	if err == pgx.ErrNoRows {
		_, insertErr := tx.Exec(ctx, `
			INSERT INTO event_idempotency_registry
				(event_uuid, pipeline_id, status, retry_count, max_retries, side_effect_hash, updated_at)
			VALUES ($1::uuid, $2::uuid, 'completed', 0, 3, $3, CURRENT_TIMESTAMP)
		`, eventUUID, pipelineID, hash)
		if insertErr != nil {
			return ClaimResult{}, insertErr
		}
		if err := tx.Commit(ctx); err != nil {
			return ClaimResult{}, err
		}
		return ClaimResult{Claimed: true, Status: "completed"}, nil
	}
	if err != nil {
		return ClaimResult{}, err
	}

	if status == "completed" {
		if err := tx.Commit(ctx); err != nil {
			return ClaimResult{}, err
		}
		return ClaimResult{Claimed: false, Status: "completed"}, nil
	}

	if status == "terminal" {
		if err := tx.Commit(ctx); err != nil {
			return ClaimResult{}, err
		}
		return ClaimResult{Claimed: false, Status: "terminal"}, nil
	}

	retryCount++
	if retryCount >= maxRetries {
		_, err = tx.Exec(ctx, `
			UPDATE event_idempotency_registry
			SET status = 'terminal', retry_count = $2, updated_at = CURRENT_TIMESTAMP
			WHERE event_uuid = $1::uuid
		`, eventUUID, retryCount)
		if err != nil {
			return ClaimResult{}, err
		}
		if err := tx.Commit(ctx); err != nil {
			return ClaimResult{}, err
		}
		return ClaimResult{Claimed: false, Status: "terminal"}, nil
	}

	_, err = tx.Exec(ctx, `
		UPDATE event_idempotency_registry
		SET status = 'completed', retry_count = $2, side_effect_hash = $3, updated_at = CURRENT_TIMESTAMP
		WHERE event_uuid = $1::uuid
	`, eventUUID, retryCount, hash)
	if err != nil {
		return ClaimResult{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return ClaimResult{}, err
	}
	return ClaimResult{Claimed: true, Status: "completed"}, nil
}
