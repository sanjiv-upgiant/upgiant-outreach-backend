
export const systemPromptTemplateString = `Your task is to create an AI service that generates an email in response to your command. The email should be addressed to a specific person and business, with a clear motive and include important details about the sender. The email subject and body should be outputted in JSON format.`

export const humanPromptTemplateString = `Here's the details of the email.
    Receiver's name: {name}  
    Receiver's Designation {designation}. 
    Receiver's Business name: {businessName}
    Receiver's Business Domain: {businessDomain}
    Receiver's Business Info: {businessInfo}
    
    Email Motive: {motive}

    Include following Details for email:
    {includeDetails}

    Do not use exclamation. Write email in a professional manner. No signature in email body please.

    Output should be in following format. 
    {{
        subject: subject of the email, 
        body: body of the email. Do not write signature only email body. I will write signature myself.
    }}
`;