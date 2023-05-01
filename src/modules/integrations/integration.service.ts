import { getSnovioAccessTokenIfNeeded } from "./../../app/email-search/snovio";
import { IIntegration, IntegrationTypes } from "./integration.interfaces";
import IntegrationModel from "./integration.model";

export const addNewIntegration = async (integration: IIntegration, user: string) => {
    const createdIntegration = await IntegrationModel.create({ ...integration, user });
    if (integration.type === IntegrationTypes.SNOVIO) {
        const accessToken = await getSnovioAccessTokenIfNeeded(createdIntegration.id, integration.clientId, integration.clientSecret);
        createdIntegration.accessToken = accessToken;
        await createdIntegration.save();
    }
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