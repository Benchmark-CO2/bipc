import { TRole } from "./disciplines";
import { TUser } from "./user";

export interface IProjectCollaborator {
  roles: TRole[];
  collaborators: TCollaborator[];
}

export type TCollaborator = TUser & {
  roles: string[];
};

export type TCollaboratorInvite = {
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
  inviter_id: string;
  project_id: string;
  status: "pending" | "accepted" | "declined";
};
