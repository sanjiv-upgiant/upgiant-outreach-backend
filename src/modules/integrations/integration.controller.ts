import httpStatus from "http-status";
import { catchAsync } from "../utils";
import { Request, Response } from "express"
import { addNewIntegration, deleteIntegration, getUserIntegrations } from "./integration.service";

export const addIntegrationController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaign = await addNewIntegration(req.body, user);
    res.status(httpStatus.CREATED).send(campaign);
});

export const getIntegrationsController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const integrations = await getUserIntegrations(user);
    res.status(httpStatus.CREATED).send(integrations);
});

export const deleteIntegrationController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const integrations = await deleteIntegration(user, req.params["id"] || "");
    res.status(httpStatus.NO_CONTENT).send(integrations);
});
