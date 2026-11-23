package main

import (
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/google/uuid"
)

func (app *application) syncMissingModuleConsumptions(moduleIDs []uuid.UUID) error {
	for i, moduleID := range moduleIDs {
		dataModule, err := app.models.Modules.Get(moduleID)
		if err != nil {
			return err
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

		// Refresh the module row totals as well, otherwise legacy modules keep
		// NULL/stale total_material and any subsequent duplication still reads
		// a zero material value from the stored row.
		err = app.models.Modules.UpdateComputedConsumption(
			dataModule.ID,
			result.CO2Min,
			result.CO2Max,
			result.EnergyMin,
			result.EnergyMax,
			result.Material,
			dataModule.Completed,
			result.Materials,
		)
		if err != nil {
			return err
		}

		app.logger.Info("module consumption synced",
			"module_id", dataModule.ID.String(),
			"type", dataModule.Type,
			"index", i+1,
			"total", len(moduleIDs),
		)
	}

	return nil
}

func (app *application) backfillMissingModuleConsumptions() error {
	moduleIDs, err := app.models.Modules.ListModuleIDsMissingConsumption()
	if err != nil {
		return err
	}

	if err := app.syncMissingModuleConsumptions(moduleIDs); err != nil {
		return err
	}

	app.logger.Info("material backfill completed", "modules", len(moduleIDs))
	return nil
}

// backfillMissingMaterialConsumptions computes the per-material breakdown for
// modules whose jsonb column is still NULL. It runs the full sync path so the
// module totals and target consumption rows are refreshed from the same
// calculation, keeping the summary and the material breakdown consistent.
func (app *application) backfillMissingMaterialConsumptions() error {
	moduleIDs, err := app.models.Modules.ListModuleIDsMissingMaterialConsumption()
	if err != nil {
		return err
	}

	if err := app.syncMissingModuleConsumptions(moduleIDs); err != nil {
		return err
	}

	app.logger.Info("material consumption backfill completed", "modules", len(moduleIDs))
	return nil
}
