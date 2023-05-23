
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { cacheSerpApiResponseWithQuery, parseSerpResponse } from "./../app/serp/serpapi";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";
import { extractEmployeesInformationFromSerp } from "./../modules/langchain/serp";
import { getEmailFromFirstNameAndLastNameServices } from "./emailFinder";

export interface IEmailFinderSearchResponse {
    firstName: string,
    lastName: string,
    emails: { email: string, emailStatus: string }[],
}

export const searchWithSerpAndDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, audienceFilters, objective, includeDetails, emailSearchServiceCampaignId, serpApiId, emailSearchServiceIds, outreachAgentId, openAiIntegrationId, senderInformation, templates, gptModelTemperature = 0, modelName } = campaign;
    const { url, info } = websiteUrlInfo;
    const serpApiIntegration = await IntegrationModel.findById(serpApiId);
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);

    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!outreachIntegration || !serpApiIntegration || !openAIIntegration) {
        return;
    }

    const [query, response] = await cacheSerpApiResponseWithQuery({
        integration: serpApiIntegration.id,
        domain: url,
        accessToken: serpApiIntegration.accessToken,
        positions: audienceFilters.positions,
        department: audienceFilters.department,
    });
    const results = parseSerpResponse(response);
    const employeesInformationString = await extractEmployeesInformationFromSerp(openAIIntegration.accessToken, query, results);
    const employessInformationJson: { firstName: string, lastName: string, position: string }[] = JSON.parse(employeesInformationString) || [];


    for (const employee of employessInformationJson) {

        const contactEmails = await getEmailFromFirstNameAndLastNameServices({ integrationIds: emailSearchServiceIds, url, firstName: employee["firstName"], lastName: employee["lastName"] });

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
                        modelName,
                        gptModelTemperature,
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

