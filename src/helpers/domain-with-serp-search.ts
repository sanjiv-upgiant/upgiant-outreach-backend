
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
    if (!serpApiIntegration) {
        return;
    }
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);
    if (!serpApiIntegration || !openAIIntegration) {

        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "No openai integration/SERP found. Please add required access tokens"
        });
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
                errorReason: "0 emails found for given position"
            });
        }
        else {
            const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
            if (!outreachIntegration) {
                return;
            }
            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                emailExtracted: true,
                contactEmails
            });

            for (const contactEmail of contactEmails.emails) {
                const emailBodies: string[] = [];
                const emailSubjects: string[] = [];
                for (const template of templates) {
                    const response = await writeSubjectAndBodyOfEmail({
                        template,
                        senderInformation,
                        name: contactEmails["firstName"],
                        businessDomain: url,
                        designation: employee["position"],
                        businessInfo: JSON.stringify(info),
                        motive: objective,
                        includeDetails,
                        openAIApiKey: openAIIntegration.accessToken
                    });
                    const { subject, body } = JSON.parse(response);
                    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                        emailSubject: subject,
                        emailBody: body
                    });
                    emailBodies.push(body);
                    emailSubjects.push(subject);
                }
                await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                    emailSubjects,
                    emailBodies
                });

                if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
                    const { accessToken } = outreachIntegration;
                    const rightOBody: { [x: string]: string } = {
                        rightODesignation: employee["position"],
                        rightOCompanyName: info["name"] || "",
                        rightOFirstName: contactEmails.firstName,
                        rightOLastName: contactEmails.lastName,
                    }
                    for (let i = 0; i < emailBodies.length; i++) {
                        const emailBody = emailBodies[i];
                        const emailSubject = emailSubjects[i];
                        if (emailBody && emailSubject) {
                            rightOBody[`rightOEmailBody-${i + 1}`] = emailBody;
                            rightOBody[`rightOEmailSubject-${i + 1}`] = emailSubject;
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

