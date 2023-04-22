import axios from "axios";
import { stringify } from "querystring";
import { IntegrationOutputModel } from "./../../modules/integrations/integration.model";
import redisClient from './../../redis';

const client = redisClient.client;
const CACHE_TTL = 2 * 24 * 60 * 60; // 2 days in seconds

export const getSnovioAccessTokenIfNeeded = async (integrationId: string, clientId: string, clientSecret: string) => {
    const accessToken = await client.get(integrationId + 'snovioAccessToken');
    const accessTokenExpiration = await client.get(integrationId + 'snovioAccessTokenExpiration');

    if (accessToken && accessTokenExpiration && Date.now() < Number(accessTokenExpiration)) {
        return accessToken;
    }

    const newAccessToken = await getSnovioAccessToken(clientId, clientSecret);
    const accessTokenExpirationInt = Date.now() + 3300000;

    if (newAccessToken) {
        await client.set(integrationId + 'snovioAccessToken', newAccessToken);
        await client.set(integrationId + 'snovioAccessTokenExpiration', accessTokenExpirationInt.toString());
    }

    return newAccessToken;
};

const getSnovioAccessToken = async (clientId: string, clientSecret: string) => {

    const params = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    };

    try {
        const response = await axios.post('https://api.snov.io/v1/oauth/access_token', params);
        return response.data.access_token;
    } catch (error) {
        console.error(error);
        return null;
    }
}

const getEmailFinderFromFirstNameAndLastName = async (accessToken: string, firstName: string, lastName: string, domain: string) => {
    const body = {
        'access_token': accessToken,
        domain,
        firstName,
        lastName
    };
    try {
        const response = await axios.post('https://api.snov.io/v1/get-emails-from-names', body);
        return response.data;
    }
    catch {
        return null;
    }

}

const getDomainSearchedEmails = async (accessToken: string, domain: string, positions: string[] = [], limit = "5", genericOrPersonal = "personal") => {
    const params = {
        access_token: accessToken,
        domain,
        type: genericOrPersonal,
        limit,
        'positions[]': positions
    };

    const query = stringify(params);

    try {
        const response = await axios.get('https://api.snov.io/v2/domain-emails-with-info?' + query);
        return response.data;
    } catch (error) {
        return null;
    }
};

export const cacheDomainSearchedEmails = async (integration: string, accessToken: string, domain: string, positions: string[] = [], limit = "5", genericOrPersonal = "personal") => {
    const key = domain + '|' + positions.join(',') + '|' + limit + '|' + genericOrPersonal;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult && (Date.now() - cachedResult.updatedAt.getTime()) / 1000 < CACHE_TTL) {
        return cachedResult.result;
    }

    const result = await getDomainSearchedEmails(accessToken, domain, positions, limit, genericOrPersonal);

    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, integration, result },
        { upsert: true }
    );

    return result;
};

export const cacheEmailsFinder = async (integration: string, accessToken: string, firstName: string, lastName: string, domain: string) => {
    const key = firstName + '|' + lastName + '|' + domain;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult && (Date.now() - cachedResult.updatedAt.getTime()) / 1000 < CACHE_TTL) {
        return cachedResult.result;
    }

    const result = await getEmailFinderFromFirstNameAndLastName(accessToken, firstName, lastName, domain);

    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, integration, result },
        { upsert: true }
    );

    return result;
};

// (async () => {
//     const clientId = "eb84e5e3cd921de101853c23c2025a8d";
//     const integration = await IntegrationModel.findOne({ clientId });
//     if (integration) {
//         const accessToken = await getSnovioAccessTokenIfNeeded(integration.id, integration.clientId, integration.clientSecret);
//         if (accessToken) {
//             const res = await cacheDomainSearchedEmails(integration.id, accessToken, "https://upgiant.com", ["Marketing Consultant"]);
//             console.log(res)
//         }
//     }
// })()
