import { IUserDoc } from './modules/user/user.interfaces';

declare global {
  namespace Express {
    interface User extends IUserDoc {
      id: string;
    }
  }
}

declare module 'express-serve-static-core' {
  export interface Request {
    user: IUserDoc;
  }
}
