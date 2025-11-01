import { TUser } from "./user";

export interface IProjectCollaborator {
  roles: TRole[];
  collaborators: TCollaborator[];
}

export type TRole = {
  id: string;
  name: string;
  description?: string;
  simulation: boolean;
  is_protected: boolean;
  permissions_ids: number[];
  users_ids: string[];
};

export type TCollaborator = TUser & {
  roles: TRole[];
};
