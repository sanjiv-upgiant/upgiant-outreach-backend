import axios from "axios";
import { stringify } from "querystring";
import { IntegrationOutputModel } from "../../modules/integrations/integration.model";
import { getAxiosInstance } from "../../modules/limitedAxios";
import redisClient from '../../redis';

const client = redisClient.client;

interface IRateLimitConfig {
    maxRequests: number,
    hours: number
}


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

export const getSnovioAccessToken = async (clientId: string, clientSecret: string) => {

    const params = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    };

    const response = await axios.post('https://api.snov.io/v1/oauth/access_token', params);
    return response.data.access_token;
}

const getEmailFinderFromFirstNameAndLastName = async (accessToken: string, firstName: string, lastName: string, domain: string, rateLimit: IRateLimitConfig = {
    maxRequests: 200, hours: 1
}) => {
    const body = {
        access_token: accessToken,
        domain,
        firstName,
        lastName
    };
    try {
        const axiosInstance = getAxiosInstance(accessToken, rateLimit.maxRequests, rateLimit.hours);
        const response = await axiosInstance.post('https://api.snov.io/v1/get-emails-from-names', body);
        return response.data;
    }
    catch {
        return null;
    }

}

const getDomainSearchedEmails = async (accessToken: string, domain: string, positions: string[] = [], limit = "1", genericOrPersonal = "personal") => {
    const params = {
        access_token: accessToken,
        domain,
        type: genericOrPersonal,
        limit,
        'positions[]': positions
    };

    const query = stringify(params);

    const response = await axios.get('https://api.snov.io/v2/domain-emails-with-info?' + query);
    return response.data;
};

export const getCacheDomainSearchedEmails = async (integration: string, accessToken: string, domain: string, positions: string[] = [], limit = "1", genericOrPersonal = "personal") => {
    const key = domain + '|' + positions.join(',') + '|' + limit + '|' + genericOrPersonal;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult) {
        return cachedResult.result;
    }

    const result = await getDomainSearchedEmails(accessToken, domain, positions, limit, genericOrPersonal);
    if (result) {
        await IntegrationOutputModel.findOneAndUpdate(
            { key },
            { key, integration, result },
            { upsert: true }
        );
    }
    return result;
};

export const cacheEmailsFinder = async (integration: string, accessToken: string, firstName: string, lastName: string, domain: string) => {
    const key = firstName + '|' + lastName + '|' + domain;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult) {
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

export const parseEmailsFromSnovIODomainSearch = (data: any = {}) => {
    const emails = data["emails"] || [];
    return emails.filter((email: any) => email.status === "verified");
}

export const parseEmailsFromSnovIOEmailSearch = (data: any = {}) => {
    const emailsData = data["data"];
    return {
        ...emailsData,
        emails: emailsData["emails"].filter((insideEmail: any) => insideEmail.emailStatus === "valid")
    }
}

