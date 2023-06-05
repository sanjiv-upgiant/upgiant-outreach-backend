import IntegrationModel from "./../modules/integrations/integration.model";
import { getCachedVerifiedEmailResponseFromEmailable, parseEmailableResponse } from "./../app/email-verifier/emailable"

export const getVerifiedEmailAndFirstName = async (email: string, integrationId: string) => {
    const emailVerifierIntegration = await IntegrationModel.findById(integrationId);
    if (!emailVerifierIntegration) {
        throw new Error("No email verifier with that id found");
    }

    const emailableResponse = await getCachedVerifiedEmailResponseFromEmailable(email, emailVerifierIntegration.accessToken, integrationId);
    const parsedResponse = parseEmailableResponse(emailableResponse);
    return parsedResponse;
}