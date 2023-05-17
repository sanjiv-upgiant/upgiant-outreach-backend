import axios from "axios";
import { stringify } from "querystring";
import { IntegrationOutputModel } from "../../modules/integrations/integration.model";
import { IContactEmail } from './../../helpers/domain-search';
import { IEmailFinderSearchResponse } from './../../helpers/domain-with-serp-search';


interface IGetDomainSearchEmailsArgs {
    accessToken: string,
    integrationId: string,
    domain: string,
    limit?: string,
    positions?: string[],
    department?: string,
    seniority?: string,
    genericOrPersonal?: string,
}

export const testHunterApi = async (apiKey: string) => {
    const result = await axios.get("https://api.hunter.io/v2/leads?api_key=" + apiKey);
    return result.data?.leads;
}

const getDomainSearchedEmails = async ({ accessToken, domain, limit = "1", genericOrPersonal = "personal", department, seniority }: IGetDomainSearchEmailsArgs) => {
    const params = {
        api_key: accessToken,
        domain,
        type: genericOrPersonal,
        limit,
        seniority,
        department
    };

    const query = stringify(params);

    const response = await axios.get('https://api.hunter.io/v2/domain-search?' + query);
    return response.data;
};

export const getCacheDomainSearchedEmailsFromHunter = async ({ accessToken, domain, department = "", seniority = "", limit = "1", genericOrPersonal = "personal", integrationId }: IGetDomainSearchEmailsArgs) => {
    const key = domain + '|' + department + '|' + seniority + "|" + limit + '|' + genericOrPersonal;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult) {
        return cachedResult.result;
    }

    const result = await getDomainSearchedEmails({ domain, department, seniority, limit, genericOrPersonal, accessToken, integrationId });
    if (result) {
        await IntegrationOutputModel.findOneAndUpdate(
            { key },
            { key, result, integration: integrationId },
            { upsert: true }
        );
    }
    return result;
};

interface IHunterEmailFinderFromFirstNameAndLastNameArgs {
    accessToken: string, firstName: string, lastName: string, domain: string, integrationId: string
}

const getEmailFinderFromFirstNameAndLastName = async ({ accessToken, firstName, lastName, domain }: IHunterEmailFinderFromFirstNameAndLastNameArgs) => {
    const params = {
        api_key: accessToken,
        domain,
        first_name: firstName,
        last_name: lastName
    };

    const query = stringify(params);
    const response = await axios.get('https://api.hunter.io/v2/email-finder?' + query);
    return response.data;
}

export const getCacheEmailsFinderFromHunter = async ({ firstName, lastName, domain, accessToken, integrationId }: IHunterEmailFinderFromFirstNameAndLastNameArgs) => {
    const key = firstName + '|' + lastName + '|' + domain;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult) {
        return cachedResult.result;
    }

    const result = await getEmailFinderFromFirstNameAndLastName({ firstName, lastName, domain, accessToken, integrationId });

    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, result, integration: integrationId },
        { upsert: true }
    );

    return result;
};

export const parseEmailsFromHunterDomainSearch = (data: any = {}): IContactEmail[] => {
    const emails = data?.["data"]?.["emails"] || [];
    const contactEmails: IContactEmail[] = emails?.map((email: any) => {
        const contactEmail: IContactEmail = {
            firstName: email["first_name"],
            lastName: email["first_name"],
            email: email["value"],
            companyName: data?.["data"]["organization"],
            position: email["position"]
        }
        return contactEmail;
    });
    return contactEmails;
}

export const parseEmailsFromHunterEmailFinder = (data: any = {}): IEmailFinderSearchResponse => {
    const emails = data["data"];
    const contactEmail: IEmailFinderSearchResponse = {
        firstName: emails["first_name"],
        lastName: emails["last_name"],
        emails: []
    }

    if (emails?.email) {
        contactEmail.emails.push({
            email: emails["email"],
            emailStatus: emails["verification"]?.["status"] ?? ""
        })
    }

    return contactEmail;
}

