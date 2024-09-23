import { CreateBan } from "./create-ban.interface";

export interface UpdateBan extends Partial<CreateBan> {
  active?: boolean;
}
