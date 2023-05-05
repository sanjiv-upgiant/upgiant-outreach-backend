import { JobOptions } from 'bull';
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../utils";
import getCampaignQueue from "./../../crawler/queue";
import { CampaignRunningStatus } from "./campaign.interfaces";
import CampaignModel from "./campaign.model";
import { createCampaign, deleteUserCampaign, getSingleCampaignUrls, getUserCampaigns, getUserSingleCampaign } from "./campaign.service";

const limit = "10";
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
    const { page = "1" } = req.query as { page?: string };
    const userCampaigns = await getUserCampaigns(user, page, "1");
    res.status(httpStatus.CREATED).send(userCampaigns);
});

export const getUserSingleCampaignController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaignId = req.params["id"] || "";
    const userCampaign = await getUserSingleCampaign(user, campaignId);
    res.status(httpStatus.CREATED).send(userCampaign);
});

export const getSingleCampaignUrlsController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaignId = req.params["id"] || "";
    const { page = "1" } = req.query as { page?: string };
    const userCampaign = await getSingleCampaignUrls(user, campaignId, page, limit);
    res.status(httpStatus.OK).send(userCampaign);
});

export const deleteUserCampaignController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaignId = req.params["id"] || "";
    const userCampaign = await deleteUserCampaign(user, campaignId);
    res.status(httpStatus.NO_CONTENT).send(userCampaign);
});

export const editCampaignController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaignId = req.params["id"] || "";
    const userOwnerOfCampaign = await CampaignModel.findOne({ _id: campaignId, user });
    if (!userOwnerOfCampaign) {
        throw Error("Not permitted");
    }
    const queue = getCampaignQueue(campaignId);
    const isQueuePaused = await queue.isPaused();
    if (isQueuePaused) {
        queue.resume();
    }
    else if (!isQueuePaused) {
        queue.pause();
    }

    const updatedCampaign = await CampaignModel.findByIdAndUpdate(campaignId, {
        runStatus: isQueuePaused ? CampaignRunningStatus.RUNNING : CampaignRunningStatus.PAUSED
    }, { new: true })
    res.status(httpStatus.OK).send(updatedCampaign?.toJSON());
});
