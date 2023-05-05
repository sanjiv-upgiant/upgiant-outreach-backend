import Joi from 'joi';
import { SearchType } from './campaign.interfaces';

export const createCampaignValidation = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        urls: Joi.array().items(Joi.string().uri().required()).required(),
        modelName: Joi.string().required(),
        objective: Joi.string().required(),
        audienceFilters: Joi.object().keys({
            position: Joi.string().optional().allow(""),
            seniority: Joi.string().optional().allow(""),
            department: Joi.string().optional().allow(""),
        }).required(),
        searchType: Joi.string().valid(
            SearchType.CONTACTS,
            SearchType.DOMAINS,
            SearchType.DOMAINS_WITH_SERP
        ).required(),
        emailSearchServiceId: Joi.string().required(),
        emailSearchServiceCampaignId: Joi.string().required(),
        openAiIntegrationId: Joi.string().required(),
        outreachAgentId: Joi.string().required(),
        serpApiId: Joi.when('searchType', {
            is: SearchType.DOMAINS_WITH_SERP,
            then: Joi.string().required(),
            otherwise: Joi.string().allow(null),
        }),
        includeDetails: Joi.string().optional(),
    }),
};
