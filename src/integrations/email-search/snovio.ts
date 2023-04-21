import axios from "axios";

export const getSnovioAccessToken = async (clientId: string, clientSecret: string) => {
    const params = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    };

    try {
        const response = await axios.post('https://api.snov.io/v1/oauth/access_token', params);
        return response.data.access_token;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export const getDomainSearchedEmails = async (accessToken: string, domain: string, positions: string[] = [], limit = "5", genericOrPersonal = "personal") => {
    const params = new URLSearchParams({
        access_token: accessToken,
        domain,
        type: genericOrPersonal,
        limit,
        'positions[]': JSON.stringify(positions)
    });

    try {
        const response = await axios.get('https://api.snov.io/v2/domain-emails-with-info', { params });
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
};
