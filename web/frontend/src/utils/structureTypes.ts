import { Translations } from "@/i18n/translations/pt-BR";

export const structureTypes = (t: Translations) => ({
  concrete_wall: t.modules.structureTypes.concreteWall,
  beam_column: t.modules.structureTypes.beamColumn,
  structural_masonry: t.modules.structureTypes.masonry,
  raft_foundation: t.modules.structureTypes.raftFoundation,
  piles_foundation: t.modules.structureTypes.pilesFoundation,
  raft_piles_foundation: t.modules.structureTypes.raftPilesFoundation,
});
