package db

import (
	"context"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool per-tenant dengan LRU eviction sederhana (map + last-used).
// Untuk skala kecil-menengah ini cukup; max tenant aktif dibatasi.
type TenantPools struct {
	mu    sync.Mutex
	pools map[string]*entry
	max   int
}

type entry struct {
	pool     *pgxpool.Pool
	lastUsed int64 // unix nano, diupdate tiap Get
}

func NewTenantPools(max int) *TenantPools {
	if max <= 0 {
		max = 50
	}
	return &TenantPools{pools: make(map[string]*entry), max: max}
}

func (t *TenantPools) Get(ctx context.Context, companyID, dsn string, now int64) (*pgxpool.Pool, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if e, ok := t.pools[companyID]; ok {
		e.lastUsed = now
		return e.pool, nil
	}
	if len(t.pools) >= t.max {
		// evict LRU
		var oldest string
		var oldestTs int64
		first := true
		for k, e := range t.pools {
			if first || e.lastUsed < oldestTs {
				oldest, oldestTs, first = k, e.lastUsed, false
			}
		}
		if oldest != "" {
			t.pools[oldest].pool.Close()
			delete(t.pools, oldest)
		}
	}
	p, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	t.pools[companyID] = &entry{pool: p, lastUsed: now}
	return p, nil
}

func (t *TenantPools) Close(companyID string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if e, ok := t.pools[companyID]; ok {
		e.pool.Close()
		delete(t.pools, companyID)
	}
}

func (t *TenantPools) Size() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return len(t.pools)
}
