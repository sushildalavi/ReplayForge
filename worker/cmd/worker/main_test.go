package main

import "testing"

func TestNextRetryDelay(t *testing.T) {
	got := []int{nextRetryDelay(1), nextRetryDelay(2), nextRetryDelay(3), nextRetryDelay(4), nextRetryDelay(5)}
	want := []int{0, 10, 30, 60, -1}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("attempt %d: got %d want %d", i+1, got[i], want[i])
		}
	}
}

func TestDeterministicFailure(t *testing.T) {
	first := deterministicFailure("event-1", "payment.authorized", 1)
	second := deterministicFailure("event-1", "payment.authorized", 1)
	if first != second {
		t.Fatalf("deterministicFailure should be stable")
	}
}

func TestBoolFlag(t *testing.T) {
	if !boolFlag(map[string]any{"flag": true}, "flag") {
		t.Fatalf("bool flag should accept true")
	}
	if !boolFlag(map[string]any{"flag": "true"}, "flag") {
		t.Fatalf("bool flag should accept string true")
	}
	if boolFlag(map[string]any{"flag": 0}, "flag") {
		t.Fatalf("zero should be false")
	}
}
