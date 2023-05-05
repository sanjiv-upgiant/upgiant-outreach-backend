import httpStatus from "http-status";
import { catchAsync } from "../utils";
import { Request, Response } from "express"
import { addNewIntegration, deleteIntegration, getCampaignList, getUserIntegrations } from "./integration.service";

export const getCampaignsFromIntegrationController = catchAsync(async (req: Request, res: Response) => {
    const integrationId = req.params["id"] ?? "";
    const user = req.user?.id || "";
    const campaignList = await getCampaignList(integrationId, user);
    res.status(httpStatus.OK).send(campaignList);
});

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
