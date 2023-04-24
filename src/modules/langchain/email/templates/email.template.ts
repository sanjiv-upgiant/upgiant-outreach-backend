
export const systemPromptTemplateString = `You are an AI that will help me write personalized email's subject and email body based on details given to you`

export const humanPromptTemplateString = `
    Write me email subject and email body in json format based on following information. If any of the details are missing, do not assume yourself, just discard that. 

    Email Motive: {emailMotive}
    Company Summary: {summary}
    Receiver's name: {name}. If missing, write email without the name.

    Output should be in following format. 
    {{
        subject: subject of the email, 
        body: body of the email
    }}
`;