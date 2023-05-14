import { IntegrationOutputModel } from "./../../modules/integrations/integration.model";
import { getAxiosInstance } from "./../../modules/limitedAxios";
import { IContactEmail } from "./../../helpers/domain-search";
import axios from "axios";
import { IEmailFinderSearchResponse } from "./../../helpers/domain-with-serp-search";

interface CacheBulkEmailSearchApolloArgs {
    integrationId: string;
    url: string,
    positions: string[],
    accessToken: string,
}

export const getApolloHealth = async (accessToken: string) => {
    const url = `https://api.apollo.io/v1/auth/health?api_key=${accessToken}`;
    const response = await axios.get(url, {
        headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json'
        }
    });
    const res = response.data;
    if (!res?.is_logged_in) {
        throw Error("Something is wrong with your key");
    }

    return response.data

}

const getApollPeopleResult = async ({ positions, integrationId, accessToken, key, url }: CacheBulkEmailSearchApolloArgs & { key: string }) => {

    const apolloUrl = "https://api.apollo.io/v1/mixed_people/search?per_page=10";
    const body: { [x: string]: any } = {
        page: 1,
        q_organization_domains: url,
        api_key: accessToken,
    };

    if (positions.length) {
        body["person_titles"] = positions;
    }

    const axios = getAxiosInstance(integrationId, 80, 1);
    const response = await axios.post(apolloUrl, body, {
        headers: {
            "Content-Type": "application/json"
        }
    });

    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, result: response.data },
        { upsert: true }
    );

    return response.data;
}

export const getCachedBulkEmailSearchFromApollo = async ({ integrationId, positions, url, accessToken }: CacheBulkEmailSearchApolloArgs) => {
    const key = `${integrationId}-${positions.join("-")}-${url}`;

    const integrationOutput = await IntegrationOutputModel.findOne({
        key
    });

    if (integrationOutput) {
        return integrationOutput.result;
    }

    const result = await getApollPeopleResult({ positions, integrationId, accessToken, key, url });
    return result;
}

export const parseEmailsFromApolloEmailSearch = (data: any = {}): IContactEmail[] => {
    const response: IContactEmail[] = [];
    for (const people of data["people"]) {
        const firstName = people["first_name"];
        const lastName = people["last_name"];
        const email = people["email"];
        const position = people["seniority"];
        response.push({
            firstName,
            lastName,
            email,
            position
        })
    }
    return response;
}


interface IGetEmailApolloFromEmailFinder {
    firstName: string,
    lastName: string,
    domain: string,
    accessToken: string,
    integrationId: string
}

const getEmailFromApolloEmailFinder = async ({ firstName, lastName, domain, accessToken, integrationId, key }: IGetEmailApolloFromEmailFinder & { key: string }) => {
    const apolloUrl = "https://api.apollo.io/v1/people/match";
    const body: { [x: string]: any } = {
        "api_key": accessToken,
        "first_name": firstName,
        "last_name": lastName,
        "domain": domain,
    };

    const axios = getAxiosInstance(integrationId, 80, 1);
    const response = await axios.post(apolloUrl, body, {
        headers: {
            "Content-Type": "application/json"
        }
    });

    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, result: response.data },
        { upsert: true }
    );

    return response.data;

}

export const getCachedEmailFinderFromApollo = async ({ firstName, lastName, domain, accessToken, integrationId }: IGetEmailApolloFromEmailFinder) => {
    const key = `${domain}-${firstName}-${lastName}`;
    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult) {
        return cachedResult.result;
    }

    const result = await getEmailFromApolloEmailFinder({ firstName, lastName, domain, accessToken, integrationId, key })
    return result;
}

export const parseEmailsFromApolloEmailFinder = (data: any = {}): IEmailFinderSearchResponse => {
    const person = data["person"];

    const response: IEmailFinderSearchResponse = {
        firstName: person["first_name"] ?? "",
        lastName: person["lastName"] ?? "",
        emails: []
    };

    if (person["email"]) {
        response.emails.push({
            email: person["email"],
            emailStatus: person["email_status"]
        })
    }
    return response;
}
