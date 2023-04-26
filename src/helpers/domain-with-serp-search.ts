
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { cacheEmailsFinder, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIOEmailSearch } from "./../app/email-search/snovio";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";
import { logger } from "./../modules/logger";
import { cacheSerpApiResponseWithQuery, parseSerpResponse } from "./../app/serp/serpapi";
import { extractEmployeesInformationFromSerp } from "./../modules/langchain/serp";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";

export const searchWithSerpAndDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, audienceFilters, objective, includeDetails, serpApiId, emailSearchServiceId, outreachAgentId } = campaign;
    const { url, info } = websiteUrlInfo;
    const serpApiIntegration = await IntegrationModel.findById(serpApiId);
    if (!serpApiIntegration) {
        return;
    }
    const [query, response] = await cacheSerpApiResponseWithQuery({
        integration: serpApiIntegration.id,
        domain: url,
        accessToken: serpApiIntegration.accessToken,
        position: audienceFilters.position,
        department: "Executive"
    });
    const results = parseSerpResponse(response);
    const employeesInformationString = await extractEmployeesInformationFromSerp(query, results);
    try {
        const employessInformationJson: { firstName: string, lastName: string, position: string }[] = JSON.parse(employeesInformationString) || [];
        for (const employee of employessInformationJson) {
            // we now need to use email finder
            const emailSearchIntegration = await IntegrationModel.findById(emailSearchServiceId);
            if (!emailSearchIntegration) {
                await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                    error: true,
                    errorReason: "No email search integration found. Please add one of email integration service."
                });
                return;
            }

            let contactEmails: {
                firstName: string,
                lastName: string,
                emails: { email: string, emailStatus: string }[],
            }[] = [];

            if (emailSearchIntegration.type === IntegrationTypes.SNOVIO) {
                const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

                const employeeEmails = await cacheEmailsFinder(emailSearchIntegration.id, accessToken, employee.firstName, employee.lastName, url);

                contactEmails = parseEmailsFromSnovIOEmailSearch(employeeEmails);
                if (!contactEmails?.length) {
                    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                        error: true,
                        errorReason: "0 emails found for given position"
                    });
                    return;
                }
            }

            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                emailExtracted: true,
                contactEmails
            });


            for (const contactEmail of contactEmails) {
                const response = await writeSubjectAndBodyOfEmail({
                    name: contactEmail["firstName"],
                    businessDomain: url,
                    designation: employee["position"],
                    businessInfo: JSON.stringify(info),
                    motive: objective,
                    includeDetails,
                });

                try {
                    const { subject, body } = JSON.parse(response);
                    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                        emailSubject: subject,
                        emailBody: body
                    });
                    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
                    if (!outreachIntegration) {
                        return;
                    }
                    const { accessToken } = outreachIntegration;
                    const firstEmail = contactEmail["emails"]?.[0]?.email || "";
                    if (!firstEmail) {
                        return;
                    }
                    await addLeadToCampaignUsingLemlist(accessToken, campaignId, firstEmail, {
                        rightODesignation: employee["position"],
                        rightOCompanyName: info["name"] || "",
                        rightOFirstName: contactEmail["firstName"],
                        rightOLastName: contactEmail["lastName"],
                        rightOEmailBody: body,
                        rightOEmailSubject: subject,
                    })

                    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                        emailSubject: subject,
                        emailBody: body,
                        isCompleted: true
                    });
                }
                catch (err: any) {
                    logger.error(`parsing or adding lead to campaign error: ${err?.message}`)
                }
                break;
            }


        }
    }
    catch {
        logger.error(`Parsing error for employees`);

        await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
            error: true,
            errorReason: "No email search integration found. Please add one of email integration service."
        });
        return;

    }
}