import { getCacheDomainSearchedEmails, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIODomainSearch } from "./../app/email-search/snovio";
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";

export const searchWithDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, emailSearchServiceId, emailSearchServiceCampaignId, audienceFilters, objective, includeDetails, outreachAgentId, openAiIntegrationId } = campaign;
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


    for (const contactEmail of contactEmails) {
        const response = await writeSubjectAndBodyOfEmail({
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

        const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
        if (!outreachIntegration) {
            return;
        }
        if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
            const { accessToken } = outreachIntegration;
            await addLeadToCampaignUsingLemlist(accessToken, emailSearchServiceCampaignId, contactEmail["email"], {
                rightOCompanyName: contactEmail["companyName"],
                rightODesignation: contactEmail["position"],
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
        break;
    }
}