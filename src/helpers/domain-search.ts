import { getCacheDomainSearchedEmails, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIODomainSearch } from "./../app/email-search/snovio";
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";

export const searchWithDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, emailSearchServiceId, emailSearchServiceCampaignId, audienceFilters, objective, includeDetails, outreachAgentId, openAiIntegrationId, senderInformation, templates, name: campaignName } = campaign;
    const { url, info } = websiteUrlInfo;
    const emailSearchIntegration = await IntegrationModel.findById(emailSearchServiceId);
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);
    if (!openAIIntegration) {
        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "No openai integration found. Please add OpenAI access token"
        });
        return;
    }
    if (!emailSearchIntegration) {
        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "No email search integration found. Please add one of email integration service."
        });
        return;
    }
    const positions: string[] = [];
    if (audienceFilters.position) {
        positions.push(audienceFilters.position);
    }

    let contactEmails: {
        firstName: string,
        lastName: string,
        email: string,
        position: string
        companyName: string,
    }[] = [];

    if (emailSearchIntegration.type === IntegrationTypes.SNOVIO) {
        const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

        const domainSearchWithResults = await getCacheDomainSearchedEmails(emailSearchIntegration.id, accessToken, url, positions);
        contactEmails = parseEmailsFromSnovIODomainSearch(domainSearchWithResults);
    }

    if (!contactEmails?.length) {
        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "0 emails found for given position"
        });
        return;
    }

    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
        emailExtracted: true,
        contactEmails
    });

    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!outreachIntegration) {
        return;
    }

    for (const contactEmail of contactEmails) {
        const emailBodies: string[] = [];
        const emailSubjects: string[] = [];
        for (const template of templates) {
            const response = await writeSubjectAndBodyOfEmail({
                template,
                senderInformation,
                name: contactEmail["firstName"],
                designation: contactEmail["position"],
                businessName: contactEmail["companyName"],
                businessInfo: JSON.stringify(info),
                businessDomain: url,
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
                rightOCompanyName: contactEmail["companyName"],
                rightODesignation: contactEmail["position"],
                rightOFirstName: contactEmail["firstName"],
                rightOLastName: contactEmail["lastName"],
            };
            for (let i = 0; i < emailBodies.length; i++) {
                const emailBody = emailBodies[i];
                const emailSubject = emailSubjects[i];
                if (emailBody && emailSubject) {
                    rightOBody[`rightOEmailBody-${campaignName.replace(/\s\s+/g, '-')}-${i + 1}`] = emailBody;
                    rightOBody[`rightOEmailSubject-${i + 1}`] = emailSubject;
                }
            }

            await addLeadToCampaignUsingLemlist(accessToken, emailSearchServiceCampaignId, contactEmail["email"], rightOBody)

            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                isCompleted: true
            });
        }
        break;
    }
}