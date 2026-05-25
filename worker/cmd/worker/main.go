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
)

type Application struct {
	Redis      *redis.Client
	DB         *pgxpool.Pool
	ShutdownCh chan struct{}
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

	return &Application{Redis: rdb, DB: db, ShutdownCh: make(chan struct{})}, nil
}

func waitForSignal() <-chan os.Signal {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	return sigCh
}

func (a *Application) Teardown() {
	close(a.ShutdownCh)
	for {
		select {
		case <-a.ShutdownCh:
			// drain channel once to avoid senders blocking on stale references
		default:
			a.DB.Close()
			_ = a.Redis.Close()
			return
		}
	}
}

func main() {
	ctx := context.Background()
	app, err := newApplication(ctx)
	if err != nil {
		log.Fatalf("worker boot failed: %v", err)
	}

	log.Println("go worker initialized; awaiting signal")
	<-waitForSignal()
	log.Println("signal intercepted; draining resources")
	time.Sleep(250 * time.Millisecond)
	app.Teardown()
	log.Println("teardown complete")
}
