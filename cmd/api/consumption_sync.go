package main

import (
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/google/uuid"
)

func (app *application) syncMissingModuleConsumptions(moduleIDs []uuid.UUID) error {
	for _, moduleID := range moduleIDs {
		dataModule, err := app.models.Modules.Get(moduleID)
		if err != nil {
			return err
		}

		if dataModule.Type == "structural_masonry" {
			continue
		}

		moduleAPI, err := modules.ParseModuleType(dataModule.Type)
		if err != nil {
			return err
		}

		module, err := moduleAPI.Get(app.models, moduleID)
		if err != nil {
			return err
		}

		result, err := module.Calculate()
		if err != nil {
			return err
		}

		option, err := app.models.Options.GetByID(dataModule.OptionID)
		if err != nil {
			return err
		}

		targets, err := modules.PrepareModuleTargetConsumptions(
			app.models,
			dataModule.ID,
			dataModule.OptionID,
			option.RoleID,
			result,
			dataModule.FloorIDs,
			dataModule.UnitID,
		)
		if err != nil {
			return err
		}

		err = app.models.Modules.UpsertModuleTargetConsumptions(dataModule.ID, targets)
		if err != nil {
			return err
		}
	}

	return nil
}

func (app *application) backfillMissingModuleConsumptions() error {
	moduleIDs, err := app.models.Modules.ListModuleIDsMissingConsumption()
	if err != nil {
		return err
	}

	return app.syncMissingModuleConsumptions(moduleIDs)
}
