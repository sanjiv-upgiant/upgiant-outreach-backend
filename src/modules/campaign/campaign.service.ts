
import IntegrationModel from '../integrations/integration.model';
import { writeSubjectAndBodyOfEmail } from '../langchain/email';
import { extractCompanySummaryFromTitleAndBody } from '../langchain/summary';
import { extractTitleAndText } from '../utils/url';
import { listModels } from './../../app/openai';
import { addLemlistWebHookForGivenCampaign } from './../../app/outreach/lemlist';
import scrape from './../../crawler/scraper';
import { getEmailFromEmailFinderServices } from './../../helpers/emailFinder';
import UrlModel, { CampaignUrlModel } from './Url.model';
import { ICampaign, UrlStatus } from './campaign.interfaces';
import CampaignModel from './campaign.model';

interface ICreateTestEmailCampaignArgs extends ICampaign {
    url: string
}

export const createTestEmailCampaign = async ({ templates, url, openAiIntegrationId, senderInformation, objective, includeDetails, gptModelTemperature = 0, modelName, emailSearchServiceIds, audienceFilters }: ICreateTestEmailCampaignArgs) => {
    const openAi = await IntegrationModel.findById(openAiIntegrationId);

    if (!templates?.[0]) {
        throw new Error("Templates not found")
    }
    if (!openAi) {
        throw new Error("No Integration not found")
    }
    const html = await scrape(url);
    const { title, body } = extractTitleAndText(html);
    await UrlModel.findOneAndUpdate({ url }, {
        html,
        url,
        title,
        body,
        status: UrlStatus.SUMMARY_EXTRACTED
    }, {
        upsert: true,
        new: true
    });
    const info = await extractCompanySummaryFromTitleAndBody(title, body, openAi.accessToken)
    await UrlModel.findOneAndUpdate({ url }, {
        info,
        status: UrlStatus.SUMMARY_EXTRACTED
    });

    const contactEmails = await getEmailFromEmailFinderServices({ integrationIds: emailSearchServiceIds, audienceFilters, url });
    const contactEmail = contactEmails?.[0];
    if (!contactEmail) {
        throw new Error("No contact emails were found. Try using different sender service or select different url")
    }
    console.log(`email found for ${url}. ${contactEmail}`)
    const emailBody = await writeSubjectAndBodyOfEmail({
        template: templates[0],
        senderInformation,
        recipientInformation: {
            recipientBusinessDomainURL: url,
            recipientBusinessSummary: info,
            recipientEmail: contactEmail["email"],
            recipientDesignation: contactEmail["position"],
            recipientName: contactEmail["firstName"] ?? ""
        },
        objective,
        includeDetails,
        openAIApiKey: openAi.accessToken,
        gptModelTemperature,
        modelName
    });
    return emailBody;
}

export const createCampaign = async (campaign: ICampaign, user: string) => {
    const integration = await IntegrationModel.findById(campaign.outreachAgentId);
    const openAiIntegration = await IntegrationModel.findById(campaign.openAiIntegrationId);
    if (integration && !integration?.meta?.["webhookAdded"]) {
        const result = await addLemlistWebHookForGivenCampaign(integration?.accessToken ?? "");
        if (result) {
            integration.meta = { ...(integration.meta || {}), webhookAdded: true };
            await integration.save()
        }
    }

    if (!openAiIntegration) {
        throw new Error("No OpenAI found");
    }
    if (openAiIntegration && !openAiIntegration.meta?.["modelsList"]) {
        const modelsList = await listModels(openAiIntegration.accessToken);
        openAiIntegration.meta = { ...(openAiIntegration.meta || {}), modelsList };
        await openAiIntegration.save();
    }
    const modelsList = openAiIntegration.meta["modelsList"] || [];
    if (!modelsList.find((model: any) => model.id !== campaign.modelName)) {
        throw new Error(`No model with name ${campaign.modelName} is available`)
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

