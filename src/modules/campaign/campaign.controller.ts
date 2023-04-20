import httpStatus from "http-status";
import { catchAsync } from "../utils";
import { Request, Response } from "express";
import { createCampaign } from "./campaign.service";
import scrapeQueue from "./../../crawler/queue";

export const createCampaignController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaign = await createCampaign(req.body, user);
    const { urls = [] } = req.body;
    for (const url of urls) {
        scrapeQueue.add({
            url,
            campaign: campaign.id
        })
    }
    res.status(httpStatus.CREATED).send(campaign);
});