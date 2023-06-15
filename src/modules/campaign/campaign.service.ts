import { writeEmailBodyUsingManualData, writeEmailSubject, writeEmailSubjectForManualUpload } from './../../modules/langchain/email';

import IntegrationModel from '../integrations/integration.model';
import { writeEmailBody } from '../langchain/email';
import { extractCompanySummaryFromTitleAndBody } from '../langchain/summary';
import { extractTitleAndText } from '../utils/url';
import { listModels } from './../../app/openai';
import { addLemlistWebHookForGivenCampaign, deleteLeadOfCampaignLemlist, getLemlistLeadBodyFromContactEmails, updateLeadOfCampaignLemlist } from './../../app/outreach/lemlist';
import scrape from './../../crawler/scraper';
import { getEmailFromEmailFinderServices } from './../../helpers/emailFinder';
import UrlModel, { CampaignUrlModel } from './Url.model';
import { ICampaign, IVoteStatus, SearchType, UrlStatus } from './campaign.interfaces';
import CampaignModel from './campaign.model';
import getCampaignQueue from './../../crawler/queue';

interface ICreateTestEmailCampaignArgs extends ICampaign {
    url: string,
    email?: string,
    recipientInformation?: any
}

interface IGetEmailTemplate {
    objective: string;
    page: string;
}

interface IEditCampaignUrl {
    emailBody: string,
    emailSubject: string,
    campaignUrlId: string,
    campaignId: string,
    bodyVote: IVoteStatus,
    subjectVote: IVoteStatus,
}

export const getEmailTemplates = async ({ objective, page }: IGetEmailTemplate) => {
    const pageInt = parseInt(page);
    const limitInt = 25;
    const campaigns = await CampaignModel.find({ objective }).sort({ "_id": -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt);

    const res = campaigns.map((campaign) => ({ ...campaign.toJSON() })).map((campaign) => ({
        objective: campaign.objective,
        templates: campaign.templates,
        id: campaign.id
    }));

    return res;
}

export const createTestEmailFromEmailTemplate = async ({ searchType, templates, url, openAiIntegrationId, senderInformation, objective, includeDetails, gptModelTemperature = 0, modelName, emailSearchServiceIds, audienceFilters, email, recipientInformation }: ICreateTestEmailCampaignArgs) => {
    const openAi = await IntegrationModel.findById(openAiIntegrationId);

    if (!templates?.[0]) {
        throw new Error("Templates not found")
    }
    if (!openAi) {
        throw new Error("No Integration not found")
    }

    if (searchType === SearchType.MANUAL_UPLOAD) {
        if (!email || !recipientInformation) {
            return;
        }
        for (const template of templates) {
            const emailBody = await writeEmailBodyUsingManualData({
                email,
                template,
                senderInformation,
                recipientInformation,
                includeDetails,
                openAIApiKey: openAi.accessToken,
                gptModelTemperature,
                modelName
            });

            const emailSubject = await writeEmailSubjectForManualUpload({
                template,
                recipientInformation,
                openAIApiKey: openAi.accessToken,
                gptModelTemperature,
                modelName,
                emailBody
            })

            return {
                emailBody, emailSubject
            };
        }
        return;
    }

    const urlFromDb = await UrlModel.findOne({ url });
    let businessInfo = "";
    if (!urlFromDb) {
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
        businessInfo = await extractCompanySummaryFromTitleAndBody(title, body, openAi.accessToken)
        await UrlModel.findOneAndUpdate({ url }, {
            info: businessInfo,
            status: UrlStatus.SUMMARY_EXTRACTED
        });
    }
    else {
        businessInfo = urlFromDb.info
    }

    const contactEmails = await getEmailFromEmailFinderServices({ integrationIds: emailSearchServiceIds, audienceFilters, url });
    const contactEmail = contactEmails?.[0];
    if (!contactEmail) {
        throw new Error("No contact emails were found. Try using different sender service or select different url")
    }
    const emailBody = await writeEmailBody({
        template: templates[0],
        senderInformation,
        recipientInformation: {
            recipientBusinessDomainURL: url,
            recipientBusinessSummary: businessInfo,
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

    const emailSubject = await writeEmailSubject({
        template: templates[0],
        recipientInformation: {
            recipientBusinessDomainURL: url,
            recipientBusinessSummary: businessInfo,
            recipientEmail: contactEmail["email"],
            recipientDesignation: contactEmail["position"],
            recipientName: contactEmail["firstName"] ?? ""
        },
        openAIApiKey: openAi.accessToken,
        gptModelTemperature,
        modelName,
        emailBody
    })
    return { emailBody, emailSubject };
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
    const campaigns = await CampaignModel.find({
        user,
        $or: [{ isArchived: false }, { isArchived: { $exists: false } }]
    }).sort({ "_id": -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt);


    return {
        data: campaigns,
        totalResults,
        resultsPerPage: limitInt,
        currentPage: pageInt
    }

}

export const archiveUserCampaign = async (user: string, id: string) => {
    const queue = getCampaignQueue(id);
    const isQueuePaused = await queue.isPaused();
    if (!isQueuePaused) {
        queue.pause();
    }

    return CampaignModel.findOneAndUpdate({ user, _id: id }, {
        isArchived: true
    })
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
        queryFilter["addedToOutreachAgent"] = true;
    }
    else if (filter === "incomplete") {
        queryFilter["error"] = true;
    }


    const totalResults = await CampaignUrlModel.countDocuments({ campaignId: campaign.id, ...queryFilter });

    const urls = await CampaignUrlModel.find({ campaignId: campaign.id, ...queryFilter }).sort({ "_id": -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt || limitInt)

    const urlsId = urls.map((url) => url.url);
    const detailInfoPromise = await Promise.all(urlsId.map(async (id) => {
        return await UrlModel.findOne({ url: id })
    }))


    const urlsWithDetailInfo = urls.map((url) => ({
        ...url.toJSON(),
        detail: detailInfoPromise.find((info) => info?.url === url.url)
    }))

    return {
        data: urlsWithDetailInfo,
        totalResults,
        resultsPerPage: limitInt,
        currentPage: pageInt
    };
}

export const editUserCampaignUrlService = async (user: string, campaignUrlData: IEditCampaignUrl) => {
    const { campaignId, campaignUrlId, emailBody, emailSubject, bodyVote = IVoteStatus.NEUTRAL, subjectVote = IVoteStatus.NEUTRAL } = campaignUrlData;
    const campaign = await CampaignModel.findById(campaignId);

    if (campaign?.user !== user) {
        throw new Error("Not authorized for this action")
    }

    const campaignUrl = await CampaignUrlModel.findById(campaignUrlId);
    if (!campaignUrl) {
        throw new Error("Campaign Url not found");
    }
    const integration = await IntegrationModel.findById(campaign?.outreachAgentId);
    if (!integration) {
        throw new Error("Integration not found");
    }

    const voteOnly = campaignUrl.emailBody === emailBody && campaignUrl.emailSubject === emailSubject;

    const contactEmail = campaignUrl.contactEmails?.[0] || {};
    campaignUrl.emailBody = emailBody;
    campaignUrl.emailSubject = emailSubject;
    campaignUrl.subjectVote = subjectVote;
    campaignUrl.bodyVote = bodyVote;
    const updatedLemlistBody = getLemlistLeadBodyFromContactEmails(emailBody, emailSubject, contactEmail);
    if (!voteOnly) {
        await updateLeadOfCampaignLemlist(integration.accessToken, campaign.emailSearchServiceCampaignId, contactEmail.email, updatedLemlistBody);
    }
    campaignUrl.save();
    return campaignUrl;

}

export const deleteLeadFromCampaignService = async (user: string, campaignId: string, campaignUrlId: string) => {
    const campaign = await CampaignModel.findById(campaignId);

    if (campaign?.user !== user) {
        throw new Error("Not authorized for this action")
    }

    const integration = await IntegrationModel.findById(campaign?.outreachAgentId);
    if (!integration) {
        throw new Error("Integration not found");
    }

    const campaignUrlModel = await CampaignUrlModel.findById(campaignUrlId);
    if (!campaignUrlModel) {
        throw new Error("Not found");
    }

    const email = campaignUrlModel.contactEmails?.[0]?.email ?? "";
    if (!email) {
        throw new Error("Email not found")
    }

    await deleteLeadOfCampaignLemlist(integration.accessToken, campaign.emailSearchServiceCampaignId, email);
    campaignUrlModel.addedToOutreachAgent = false;
    await campaignUrlModel.save();
}


