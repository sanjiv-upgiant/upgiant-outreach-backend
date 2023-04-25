import httpStatus from "http-status";
import { catchAsync } from "../utils";
import { Request, Response } from "express";
import { createCampaign } from "./campaign.service";
import scrapeQueue from "./../../crawler/queue";
import { JobOptions } from "bull";

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
    for (const url of urls) {
        scrapeQueue.add({
            user,
            url,
            campaign: campaign.id,
            searchType: campaign.searchType,
            emailSearchService: campaign.emailSearchService,
            audienceFilters: campaign.audienceFilters,
            includeDetails: campaign.includeDetails,
            outreachAgent: campaign.outreachAgent,
            campaignId: campaign.campaignId
        }, jobOptions)
    }
    res.status(httpStatus.CREATED).send(campaign);
});