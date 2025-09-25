package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
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

	concreteID, err := uuid.NewV7()
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

func GetConcrete(db *sql.DB, id uuid.UUID) (Concrete, error) {
	var concrete Concrete
	concrete.ID = id

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `SELECT fck, volume FROM concrete_volume WHERE concrete_id = $1`, id)
	if err != nil {
		return concrete, err
	}
	defer rows.Close()

	var volumes []ConcreteVolume
	for rows.Next() {
		var vol ConcreteVolume
		if err := rows.Scan(&vol.Fck, &vol.Volume); err != nil {
			return concrete, err
		}
		volumes = append(volumes, vol)
	}
	concrete.Volumes = volumes

	rows, err = db.QueryContext(ctx, `SELECT ca, mass FROM steel_mass WHERE concrete_id = $1`, id)
	if err != nil {
		return concrete, err
	}
	defer rows.Close()

	var steels []SteelMass
	for rows.Next() {
		var s SteelMass
		if err := rows.Scan(&s.CA, &s.Mass); err != nil {
			return concrete, err
		}
		steels = append(steels, s)
	}
	concrete.Steel = steels

	return concrete, nil
}
