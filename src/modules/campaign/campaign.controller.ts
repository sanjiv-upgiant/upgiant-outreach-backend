import { JobOptions } from 'bull';
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../utils";
import getCampaignQueue from "./../../crawler/queue";
import { CampaignRunningStatus, SearchType } from "./campaign.interfaces";
import CampaignModel from "./campaign.model";
import { createCampaign, createTestEmailFromEmailTemplate, deleteUserCampaign, getSingleCampaignUrls, getUserCampaigns, getUserSingleCampaign } from "./campaign.service";

import multer from "multer";
import { getCsvDataFromCampaign } from './../../helpers/manual-upload-search';
import path from 'path';


const multerStorage = multer.diskStorage({
    destination: (_, __, cb) => {
        cb(null, "public");
    },
    filename: (_, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        const fileName = `${file.fieldname}-${Date.now()}.${ext}`;
        cb(null, fileName);
    },
});

const limit = "10";
const jobOptions: JobOptions = {
    attempts: 2,
    backoff: {
        type: "exponential",
        delay: 10000
    }
}

export const emailTemplateController = catchAsync(async (req: Request, res: Response) => {
    const emailGenerated = await createTestEmailFromEmailTemplate(req.body);
    res.status(httpStatus.CREATED).send(emailGenerated);
});

export const uploadCampaignFileController = catchAsync(async (req: Request, res: Response) => {

    const upload = multer({
        storage: multerStorage,
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
        fileFilter: (_, file, cb) => {
            if (file.mimetype.split("/")[1] === "csv") {
                return cb(null, true);
            } else {
                return cb(new Error("Only csv upload is supported"));
            }
        }
    });

    await new Promise<void>((resolve, reject) => {
        upload.single("manualUpload")(req, res, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
    const fileName = req.file?.filename;
    return res.send({
        fileName: path.join("public", fileName ?? "")
    })
});

export const createCampaignController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const campaign = await createCampaign(req.body, user);
    const { urls = [] } = req.body;

    const scrapeQueue = getCampaignQueue(campaign.id);
    if (campaign.searchType !== SearchType.MANUAL_UPLOAD) {
        for (const url of urls) {
            scrapeQueue.add({
                url,
                campaignJson: campaign.toJSON()
            }, jobOptions)
        }
    }
    else {
        const csvDataFromList = await getCsvDataFromCampaign(campaign.toJSON());
        for (const eachCsvData of csvDataFromList) {
            scrapeQueue.add({
                campaignJson: campaign.toJSON(),
                csvData: eachCsvData
            }, jobOptions)

        }
    }
    res.status(httpStatus.CREATED).send(campaign);
});

// (async () => {
//     const campaign = await CampaignModel.findById("646cb2eb6f24530390ef4d62");
//     if (!campaign) {
//         return;
//     }
//     const scrapeQueue = getCampaignQueue(campaign.id);
//     for (const url of campaign.urls) {
//         scrapeQueue.add({
//             user: null,
//             url,
//             campaignJson: campaign.toJSON()
//         }, jobOptions)
//     }
// });


export const getUserCampaignsController = catchAsync(async (req: Request, res: Response) => {
    const user = req.user?.id || "";
    const { page = "1" } = req.query as { page?: string };
    const userCampaigns = await getUserCampaigns(user, page, limit);
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
    const { page = "1", filter = "" } = req.query as { page?: string, filter?: string };
    const userCampaign = await getSingleCampaignUrls(user, campaignId, page, limit, filter);
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
