import Joi from 'joi';
import { SearchType } from './campaign.interfaces';

export const createCampaignValidation = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        urls: Joi.alternatives().conditional("searchType", {
            is: Joi.not(SearchType.MANUAL_UPLOAD),
            then: Joi.array().items(Joi.string().uri().required()).min(1).max(5000).required(),
            otherwise: Joi.optional()
        }),
        modelName: Joi.string().required(),
        objective: Joi.string().required(),
        audienceFilters: Joi.object().keys({
            positions: Joi.array()
                .items(Joi.string().optional())
                .optional(),
            seniority: Joi.string().optional().allow(""),
            department: Joi.string().optional().allow(""),
        }).required(),
        searchType: Joi.string().valid(
            SearchType.MANUAL_UPLOAD,
            SearchType.DOMAINS,
            SearchType.DOMAINS_WITH_SERP
        ).required(),
        emailSearchServiceIds: Joi.alternatives().conditional("searchType", {
            is: (searchType: SearchType) => searchType !== SearchType.MANUAL_UPLOAD,
            then: Joi.array()
                .items(Joi.string())
                .required(),
            otherwise: Joi.optional()
        }),
        emailSearchServiceCampaignId: Joi.string().required(),
        openAiIntegrationId: Joi.string().required(),
        outreachAgentId: Joi.string().required(),
        serpApiId: Joi.when('searchType', {
            is: SearchType.DOMAINS_WITH_SERP,
            then: Joi.string().required(),
            otherwise: Joi.string().allow(null),
        }),
        includeDetails: Joi.string().optional(),
        gptModelTemperature: Joi.number().min(0).max(1).optional().default(0),
        senderInformation: Joi.object().keys({
            sendersName: Joi.string().required(),
            sendersCompanyBusinessSummary: Joi.string().required(),
            sendersEmail: Joi.string().email().required().allow(""),
            sendersCompanyDomainURL: Joi.string().uri().required(),
            sendersProductService: Joi.string().optional().allow(""),
        }),
        templates: Joi.array()
            .items(Joi.object().keys({
                body: Joi.string().required(),
                subject: Joi.string().required()
            }))
            .required().min(1),
        manualUpload: Joi.object({
            file: Joi.string().required(),
            selectedColumnNames: Joi.array().items(Joi.string().required()).optional(),
            mappedEmail: Joi.string().required()
        }).optional(),
    }),
};

export const createEmailTemplateValidation = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        urls: Joi.array().items(Joi.string().uri().required()).min(1).max(5000).required(),
        modelName: Joi.string().required(),
        objective: Joi.string().required(),
        audienceFilters: Joi.object().keys({
            positions: Joi.array()
                .items(Joi.string().optional())
                .optional(),
            seniority: Joi.string().optional().allow(""),
            department: Joi.string().optional().allow(""),
        }).required(),
        searchType: Joi.string().valid(
            SearchType.MANUAL_UPLOAD,
            SearchType.DOMAINS,
            SearchType.DOMAINS_WITH_SERP
        ).required(),
        emailSearchServiceIds: Joi.array()
            .items(Joi.string())
            .required(),
        emailSearchServiceCampaignId: Joi.string().required(),
        openAiIntegrationId: Joi.string().required(),
        outreachAgentId: Joi.string().required(),
        serpApiId: Joi.when('searchType', {
            is: SearchType.DOMAINS_WITH_SERP,
            then: Joi.string().required(),
            otherwise: Joi.string().allow(null),
        }),
        includeDetails: Joi.string().optional(),
        gptModelTemperature: Joi.number().min(0).max(1).optional().default(0),
        senderInformation: Joi.object().keys({
            sendersName: Joi.string().required(),
            sendersCompanyBusinessSummary: Joi.string().required(),
            sendersEmail: Joi.string().email().required().allow(""),
            sendersCompanyDomainURL: Joi.string().uri().required(),
            sendersProductService: Joi.string().optional().allow(""),
        }),
        templates: Joi.array()
            .items(Joi.object().keys({
                body: Joi.string().required(),
                subject: Joi.string().required()
            }))
            .required().min(1),
        url: Joi.string().required()
    }),
};
