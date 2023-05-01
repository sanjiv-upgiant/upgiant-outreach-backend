
import { CampaignUrlModel } from './Url.model';
import { ICampaign } from './campaign.interfaces';
import CampaignModel from './campaign.model';

export const createCampaign = async (campaign: ICampaign, user: string) => {
    return CampaignModel.create({ ...campaign, user });
}


export const getUserCampaigns = async (user: string) => {
    return CampaignModel.find({ user }).sort({ "_id": -1 });
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

