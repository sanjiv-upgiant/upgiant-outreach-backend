import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model"
import { IContactEmail } from "./domain-search";
import { cacheEmailsFinder, getCacheDomainSearchedEmails, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIODomainSearch, parseEmailsFromSnovIOEmailSearch } from "./../app/email-search/snovio";
import { getCachedBulkEmailSearchFromApollo, getCachedEmailFinderFromApollo, parseEmailsFromApolloEmailFinder, parseEmailsFromApolloEmailSearch } from "./../app/email-search/apollo";
import { getCacheDomainSearchedEmailsFromHunter, getCacheEmailsFinderFromHunter, parseEmailsFromHunterDomainSearch, parseEmailsFromHunterEmailFinder } from "./../app/email-search/hunter";
import { ICampaign } from "./../modules/campaign/campaign.interfaces";
import { IEmailFinderSearchResponse } from "./domain-with-serp-search";

interface GetEmailFromEmailFinderServicesProps {
    integrationIds: string[],
    audienceFilters: ICampaign["audienceFilters"],
    url: string,
}

export const getEmailFromEmailFinderServices = async ({ integrationIds, audienceFilters, url }: GetEmailFromEmailFinderServicesProps): Promise<IContactEmail[]> => {
    let contactEmails: IContactEmail[] = [];

    for (const integrationId of integrationIds) {
        const emailSearchIntegration = await IntegrationModel.findById(integrationId);
        if (!emailSearchIntegration) {
            return contactEmails;
        }

        if (emailSearchIntegration.type === IntegrationTypes.SNOVIO) {
            const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

            const domainSearchWithResults = await getCacheDomainSearchedEmails(emailSearchIntegration.id, accessToken, url, audienceFilters.positions);
            contactEmails = parseEmailsFromSnovIODomainSearch(domainSearchWithResults);
        }

        else if (emailSearchIntegration.type === IntegrationTypes.APOLLO) {
            const apolloBulkEmailSearch = await getCachedBulkEmailSearchFromApollo({
                integrationId: emailSearchIntegration.id,
                url,
                positions: audienceFilters.positions,
                accessToken: emailSearchIntegration.accessToken
            });
            contactEmails = parseEmailsFromApolloEmailSearch(apolloBulkEmailSearch);
        }

        else if (emailSearchIntegration.type === IntegrationTypes.HUNTER) {
            const hunterEmailSearchFromDomain = await getCacheDomainSearchedEmailsFromHunter({
                integrationId: emailSearchIntegration.id,
                domain: url,
                seniority: audienceFilters.seniority,
                department: audienceFilters.department,
                accessToken: emailSearchIntegration.accessToken
            });
            contactEmails = parseEmailsFromHunterDomainSearch(hunterEmailSearchFromDomain);
        }

        if (contactEmails.length) {
            return contactEmails;
        }
    }

    return contactEmails;
}

interface GetEmailFromFirstAndLastNameArgs {
    integrationIds: string[],
    url: string,
    firstName: string,
    lastName: string,
}


export const getEmailFromFirstNameAndLastNameServices = async ({ integrationIds, url, firstName, lastName }: GetEmailFromFirstAndLastNameArgs): Promise<IEmailFinderSearchResponse> => {
    let contactEmails: IEmailFinderSearchResponse = {
        firstName: "",
        lastName: "",
        emails: []
    };
    for (const integrationId of integrationIds) {
        const emailSearchIntegration = await IntegrationModel.findById(integrationId);
        if (!emailSearchIntegration) {
            return contactEmails;
        }
        if (emailSearchIntegration.type === IntegrationTypes.SNOVIO) {
            const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

            const employeeEmails = await cacheEmailsFinder(emailSearchIntegration.id, accessToken, firstName, lastName, url);

            contactEmails = parseEmailsFromSnovIOEmailSearch(employeeEmails);
        }
        else if (emailSearchIntegration.type === IntegrationTypes.APOLLO) {
            const employeeEmails = await getCachedEmailFinderFromApollo({
                firstName,
                lastName,
                domain: url,
                accessToken: emailSearchIntegration.accessToken,
                integrationId: emailSearchIntegration.id
            });
            contactEmails = parseEmailsFromApolloEmailFinder(employeeEmails);
        }
        else if (emailSearchIntegration.type === IntegrationTypes.HUNTER) {
            const employeeEmails = await getCacheEmailsFinderFromHunter({
                firstName,
                lastName,
                domain: url,
                accessToken: emailSearchIntegration.accessToken,
                integrationId: emailSearchIntegration.id
            });
            contactEmails = parseEmailsFromHunterEmailFinder(employeeEmails);
        }
        if (contactEmails.emails.length > 0) {
            return contactEmails;
        }
    }



    return contactEmails;

}