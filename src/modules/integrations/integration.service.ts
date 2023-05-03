import { getJson } from "serpapi";
import { getSnovioAccessToken } from "./../../app/email-search/snovio";
import { testOpenAI } from "./../../app/openai";
import { getLemlistTeam } from "./../../app/outreach/lemlist";
import { IIntegration, IntegrationTypes } from "./integration.interfaces";
import IntegrationModel from "./integration.model";


export const addNewIntegration = async (integration: IIntegration, user: string) => {
    if (integration.type === IntegrationTypes.SNOVIO) {
        const accessToken = await getSnovioAccessToken(integration.clientId, integration.clientSecret);
        integration.accessToken = accessToken;
    }
    else if (integration.type === IntegrationTypes.LEMLIST) {
        await getLemlistTeam(integration.accessToken);
    }
    else if (integration.type === IntegrationTypes.OPENAI) {
        await testOpenAI(integration.accessToken);
    }
    else if (integration.type === IntegrationTypes.SERPAPI) {
        const res = await getJson("google", { q: `Hello World!`, api_key: integration.accessToken });
        if (!res?.search_metadata) {
            throw Error("Invalid key");
        }
    }

    const createdIntegration = await IntegrationModel.create({ ...integration, user });
    return createdIntegration;
}

export const getUserIntegrations = async (user: string) => {
    const integrations = await IntegrationModel.find({ user });
    const integrationTypeWithAccessTokens = integrations.map((integration) => ({
        id: integration.id,
        type: integration.type,
    }))
    return integrationTypeWithAccessTokens;
}

export const deleteIntegration = async (user: string, id: string) => {
    await IntegrationModel.findOneAndDelete({
        user,
        _id: id
    });
}