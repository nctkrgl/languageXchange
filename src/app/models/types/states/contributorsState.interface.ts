import { User } from 'src/app/models/User';
import { ErrorInterface } from 'src/app/models/types/errors/error.interface';

export interface ContributorsStateInterface {
  isLoading: boolean;
  total: number;
  users: User[] | null;
  error: ErrorInterface | null;
}
