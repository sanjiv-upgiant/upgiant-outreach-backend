
import getCampaignQueue from './../../crawler/queue';
import { CampaignUrlModel } from './Url.model';
import { ICampaign } from './campaign.interfaces';
import CampaignModel from './campaign.model';

export const createCampaign = async (campaign: ICampaign, user: string) => {
    return CampaignModel.create({ ...campaign, user });
}


export const getUserCampaigns = async (user: string, page: string, limit: string) => {
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const totalResults = await CampaignModel.countDocuments({ user });
    const campaigns = await CampaignModel.find({ user }).sort({ "_id": -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt || limitInt);

    const campaignsData: { campaign: ICampaign, jobStatus: any }[] = [];

    for (const campaign of campaigns) {
        const queue = getCampaignQueue(campaign.id);
        const jobStatus = await queue.getJobCounts();
        campaignsData.push({
            ...campaign.toJSON(),
            jobStatus
        })
    }

    return {
        data: campaignsData,
        totalResults,
        resultsPerPage: limitInt,
        currentPage: pageInt
    }

}

export const deleteUserCampaign = async (user: string, id: string) => {
    return CampaignModel.deleteOne({ user, _id: id })
}


export const getUserSingleCampaign = async (user: string, _id: string) => {
    return CampaignModel.findOne({ user, _id });
}

export const getSingleCampaignUrls = async (user: string, _id: string, page: string, limit: string) => {
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const campaign = await CampaignModel.findOne({ user, _id });
    if (!campaign) {
        return {
            data: [],
            totalResults: 0,
            resultsPerPage: 0,
            currentPage: 1
        };
    }
    const totalResults = await CampaignUrlModel.countDocuments({ campaignId: campaign.id });

    const urls = await CampaignUrlModel.find({ campaignId: campaign.id }).sort({ "_id": -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt || limitInt)

    return {
        data: urls,
        totalResults,
        resultsPerPage: limitInt,
        currentPage: pageInt
    };

}

