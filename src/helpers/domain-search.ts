import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import { getCacheDomainSearchedEmails, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIODomainSearch } from "./../app/email-search/snovio";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { logger } from "./../modules/logger";

export const searchWithDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, emailSearchServiceId, audienceFilters, objective, includeDetails, outreachAgentId } = campaign;
    const { url, info } = websiteUrlInfo;
    const emailSearchIntegration = await IntegrationModel.findById(emailSearchServiceId);
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

    for (const contactEmail of contactEmails) {
        const response = await writeSubjectAndBodyOfEmail({
            name: contactEmail["firstName"],
            designation: contactEmail["position"],
            businessName: contactEmail["companyName"],
            businessInfo: JSON.stringify(info),
            businessDomain: url,
            motive: objective,
            includeDetails
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
            if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
                const { accessToken } = outreachIntegration;
                await addLeadToCampaignUsingLemlist(accessToken, campaignId, contactEmail["email"], {
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
        }
        catch (err: any) {
            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                error: true,
                errorReason: "Something went wrong " + err?.message
            });
            logger.error(`parsing or adding lead to campaign error: ${err?.message}`)
        }
    }
}