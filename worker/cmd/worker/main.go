package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"replayforge/worker/pkg/streams"
)

type Application struct {
	Redis      *redis.Client
	DB         *pgxpool.Pool
	ShutdownCh chan struct{}
	TaskCh     chan redis.XMessage
}

func newApplication(ctx context.Context) (*Application, error) {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgresql://replayforge_cp:replayforge_cp_pwd@localhost:5432/replayforge"
	}

	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}

	return &Application{
		Redis:      rdb,
		DB:         db,
		ShutdownCh: make(chan struct{}),
		TaskCh:     make(chan redis.XMessage),
	}, nil
}

func waitForSignal() <-chan os.Signal {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	return sigCh
}

func (a *Application) Teardown() {
	close(a.ShutdownCh)
	a.DB.Close()
	_ = a.Redis.Close()
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	app, err := newApplication(ctx)
	if err != nil {
		log.Fatalf("worker boot failed: %v", err)
	}

	streamName := "workflow_events"
	groupName := "replay_forge_workers"
	consumerName := "go-worker"

	if err := streams.EnsureConsumerGroup(ctx, app.Redis, streamName, groupName); err != nil {
		log.Fatalf("consumer group init failed: %v", err)
	}

	go func() {
		err := streams.StartBlockingLoop(ctx, app.Redis, streamName, groupName, consumerName, func(msg redis.XMessage) {
			app.TaskCh <- msg
		})
		if err != nil && ctx.Err() == nil {
			log.Printf("stream loop stopped: %v", err)
		}
	}()

	log.Println("go worker initialized; awaiting signal")
	<-waitForSignal()
	log.Println("signal intercepted; draining resources")
	time.Sleep(250 * time.Millisecond)
	cancel()
	app.Teardown()
	log.Println("teardown complete")
}
