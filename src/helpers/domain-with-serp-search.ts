
import { cacheEmailsFinder, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIOEmailSearch } from "./../app/email-search/snovio";
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { cacheSerpApiResponseWithQuery, parseSerpResponse } from "./../app/serp/serpapi";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";
import { extractEmployeesInformationFromSerp } from "./../modules/langchain/serp";

export const searchWithSerpAndDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, audienceFilters, objective, includeDetails, emailSearchServiceCampaignId, serpApiId, emailSearchServiceId, outreachAgentId, openAiIntegrationId, senderInformation, templates } = campaign;
    const { url, info } = websiteUrlInfo;
    const serpApiIntegration = await IntegrationModel.findById(serpApiId);
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);

    const emailSearchIntegration = await IntegrationModel.findById(emailSearchServiceId);
    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!emailSearchIntegration || !outreachIntegration || !serpApiIntegration || !openAIIntegration) {
        return;
    }

    const [query, response] = await cacheSerpApiResponseWithQuery({
        integration: serpApiIntegration.id,
        domain: url,
        accessToken: serpApiIntegration.accessToken,
        position: audienceFilters.position,
        department: audienceFilters.department
    });
    const results = parseSerpResponse(response);
    const employeesInformationString = await extractEmployeesInformationFromSerp(openAIIntegration.accessToken, query, results);
    const employessInformationJson: { firstName: string, lastName: string, position: string }[] = JSON.parse(employeesInformationString) || [];


    for (const employee of employessInformationJson) {

        let contactEmails: {
            firstName: string,
            lastName: string,
            emails: { email: string, emailStatus: string }[],
        } = {
            firstName: "",
            lastName: "",
            emails: []
        };

        if (emailSearchIntegration.type === IntegrationTypes.SNOVIO) {
            const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

            const employeeEmails = await cacheEmailsFinder(emailSearchIntegration.id, accessToken, employee.firstName, employee.lastName, url);

            contactEmails = parseEmailsFromSnovIOEmailSearch(employeeEmails);
        }

        if (!contactEmails?.emails?.length) {
            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                error: true,
                errorReason: "0 emails found"
            });
        }
        else {
            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                emailExtracted: true,
                contactEmails
            });

            for (const contactEmail of contactEmails.emails) {
                const emailBodies: string[] = [];
                const emailSubjects: string[] = [];
                for (const template of templates) {
                    const emailBody = await writeSubjectAndBodyOfEmail({
                        template,
                        senderInformation,
                        recipientInformation: {
                            recipientBusinessDomainURL: url,
                            recipientBusinessSummary: info,
                            recipientEmail: contactEmail["email"],
                            recipientDesignation: employee["position"]
                        },
                        objective,
                        includeDetails,
                        openAIApiKey: openAIIntegration.accessToken
                    });
                    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                        emailSubject: "",
                        emailBody
                    });
                    emailBodies.push(emailBody);
                    emailSubjects.push("");
                }
                await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                    emailSubjects,
                    emailBodies
                });

                if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
                    const { accessToken } = outreachIntegration;
                    const rightOBody: { [x: string]: string } = {
                        rightOFirstName: contactEmails.firstName,
                        rightODesignation: employee["position"],
                        rightOLastName: contactEmails.lastName,
                    }
                    for (let i = 0; i < emailBodies.length; i++) {
                        const emailBody = emailBodies[i];
                        if (emailBody) {
                            rightOBody["icebreaker"] = emailBody;
                            rightOBody["rightOEmailSubject"] = "";
                        }
                    }

                    await addLeadToCampaignUsingLemlist(accessToken, emailSearchServiceCampaignId, contactEmail.email, rightOBody)

                    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                        addedToOutreachAgent: true,
                        isCompleted: true
                    });
                    break;
                }

            }
            break;
        }
    }

}

