import httpStatus from "http-status";
import { catchAsync } from "../utils";
import { Request, Response } from "express"
import { addNewIntegration } from "./integration.service";

export const addIntegrationController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaign = await addNewIntegration(req.body, user);
    res.status(httpStatus.CREATED).send(campaign);
});