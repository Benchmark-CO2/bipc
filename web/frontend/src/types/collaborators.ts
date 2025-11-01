import { TRole } from "./disciplines";
import { TUser } from "./user";

export interface IProjectCollaborator {
  roles: TRole[];
  collaborators: TCollaborator[];
}

export type TCollaborator = TUser & {
  roles: string[];
};
