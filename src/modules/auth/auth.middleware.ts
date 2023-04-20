import { NextFunction, Request, Response } from 'express';
import passport from 'passport';


const authMiddleware = () => async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', (error, user, info) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      const message = info && info.message ? info.message : 'Unauthorized';
      return res.status(401).json({ code: 401, message });
    }
    req.user = user;
    next();
  })(req, res, next);
}

export default authMiddleware;
