.PHONY: up down chaos load check

up:
	docker compose up --build -d

down:
	docker compose down -v --remove-orphans

chaos:
	python3 tests/benchmark_chaos.py

load:
	python3 scripts/load_test.py

check:
	./scripts/check_state.sh
