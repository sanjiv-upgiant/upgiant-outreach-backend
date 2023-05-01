import httpStatus from "http-status";
import { catchAsync } from "../utils";
import { Request, Response } from "express";
import { createCampaign, getSingleCampaignUrls, getUserCampaigns, getUserSingleCampaign } from "./campaign.service";
import { JobOptions } from "bull";
import getCampaignQueue from "./../../crawler/queue";

const jobOptions: JobOptions = {
    attempts: 2,
    backoff: {
        type: "exponential",
        delay: 2000
    }
}

export const createCampaignController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaign = await createCampaign(req.body, user);
    const { urls = [] } = req.body;
    const scrapeQueue = getCampaignQueue(campaign.id);
    for (const url of urls) {
        scrapeQueue.add({
            user,
            url,
            campaignJson: campaign.toJSON()
        }, jobOptions)
    }
    res.status(httpStatus.CREATED).send(campaign);
});

export const getUserCampaignsController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const userCampaigns = await getUserCampaigns(user);
    res.status(httpStatus.CREATED).send(userCampaigns);
});

export const getUserSingleCampaignController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaignId = req.params["id"] || "";
    const userCampaign = await getUserSingleCampaign(user, campaignId);
    res.status(httpStatus.CREATED).send(userCampaign);
});

export const getSingleCampaignUrlsController = catchAsync(async (req: Request, res: Response) => {
    const limit = "10";
    const user = req.user?.id || "";
    const campaignId = req.params["id"] || "";
    const { page = "1" } = req.query as { page?: string };
    const userCampaign = await getSingleCampaignUrls(user, campaignId, page, limit);
    res.status(httpStatus.CREATED).send(userCampaign);
});