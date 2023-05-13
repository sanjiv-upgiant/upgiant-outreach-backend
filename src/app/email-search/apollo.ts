import { IntegrationOutputModel } from "./../../modules/integrations/integration.model";
import { getAxiosInstance } from "./../../modules/limitedAxios";
import { IContactEmail } from "./../../helpers/domain-search";
import axios from "axios";

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