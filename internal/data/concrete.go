package data

import (
	"context"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/utils"
	"github.com/gofrs/uuid"
)

type ConcreteVolume struct {
	Fck    int     `json:"fck"`
	Volume float64 `json:"volume"`
}

type SteelMass struct {
	CA   int     `json:"ca"`
	Mass float64 `json:"mass"`
}

type Concrete struct {
	ID      uuid.UUID        `json:"id"`
	Volumes []ConcreteVolume `json:"volumes"`
	Steel   []SteelMass      `json:"steel"`
}

func InsertConcrete(db dbExecutor, c *Concrete) (uuid.UUID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	concreteID, err := utils.NewUUIDv7()
	if err != nil {
		return uuid.Nil, err
	}
	_, err = db.ExecContext(ctx, `INSERT INTO concrete (id) VALUES ($1)`, concreteID)
	if err != nil {
		return uuid.Nil, err
	}
	for _, v := range c.Volumes {
		_, err := db.ExecContext(ctx, `INSERT INTO concrete_volume (concrete_id, fck, volume) VALUES ($1, $2, $3)`, concreteID, v.Fck, v.Volume)
		if err != nil {
			return uuid.Nil, err
		}
	}
	for _, s := range c.Steel {
		_, err := db.ExecContext(ctx, `INSERT INTO steel_mass (concrete_id, ca, mass) VALUES ($1, $2, $3)`, concreteID, s.CA, s.Mass)
		if err != nil {
			return uuid.Nil, err
		}
	}
	return concreteID, nil
}
