
import IntegrationModel from '../integrations/integration.model';
import { addLemlistWebHookForGivenCampaign } from './../../app/outreach/lemlist';
import { CampaignUrlModel } from './Url.model';
import { ICampaign } from './campaign.interfaces';
import CampaignModel from './campaign.model';

export const createCampaign = async (campaign: ICampaign, user: string) => {
    const integration = await IntegrationModel.findById(campaign.outreachAgentId);
    if (integration && !integration?.meta?.["webhookAdded"]) {
        const result = await addLemlistWebHookForGivenCampaign(integration?.accessToken ?? "");
        if (result) {
            integration.meta = { ...(integration.meta || {}), webhookAdded: true };
            await integration.save()
        }
    }
    return CampaignModel.create({ ...campaign, user });
}


export const getUserCampaigns = async (user: string, page: string, limit: string) => {
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit) || 10;
    const totalResults = await CampaignModel.countDocuments({ user });
    const campaigns = await CampaignModel.find({ user }).sort({ "_id": -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt);


    return {
        data: campaigns,
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

export const getSingleCampaignUrls = async (user: string, _id: string, page: string, limit: string, filter: string) => {
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

    const queryFilter: { [x: string]: boolean } = {};
    if (filter === "complete") {
        queryFilter["isCompleted"] = true;
        queryFilter["emailExtracted"] = true;
    }
    else if (filter === "incomplete") {
        queryFilter["emailExtracted"] = false;
    }


    const totalResults = await CampaignUrlModel.countDocuments({ campaignId: campaign.id, ...queryFilter });

    const urls = await CampaignUrlModel.find({ campaignId: campaign.id, ...queryFilter }).sort({ "_id": -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt || limitInt)

    return {
        data: urls,
        totalResults,
        resultsPerPage: limitInt,
        currentPage: pageInt
    };

}

