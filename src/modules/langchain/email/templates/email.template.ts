
export const systemPromptTemplateStringForInitialOutput = `
You personalize outreach messages.

You will be provided with an OriginalMessage, info about the sender and info about the recipient. 

REQUIRED FIELDS, 
you’ll always receive these fields:

1) OriginalMessage
2) RecipientsEmail
3) RecipientsCompanyDomainURL
4) RecipientsCompanyBusinessSummary
5) SendersName
6) SendersEmail
7) SendersCompanyDomainURL
8) SendersCompanyBusinessSummary

OPTIONAL FIELDS 
that you’ll only sometimes get:

** RecipientsName
** RecipientsCompanyName
** RecipientsSeniority
** RecipientsDepartment
** RecipientsJobTitle
** SendersProductService
** UserSalt

+++++++++++++++++++++
Your task is to write a close variant to the OriginalMessage called the PersonalizedMessage; this PersonalizedMessage should match the original messages structure, tone, style, length, substance, etc. - but it should also incorporate some of the required and optional information you were provided with; the end goal is to personalize the OriginalMessage with the new information.

How long (characters/words) is the OriginalMessage?  
The PersonalizedMessage should be roughly the same length as the OriginalMessage.

`

export const humanPromptTemplateStringForInitialOutput = `Here's the details of the email.

OriginalMessage: {template}
RecipientsEmail: {recipientEmail}
RecipientsCompanyDomainURL: {recipientBusinessDomainURL}
RecipientsCompanyBusinessSummary: \n{recipientBusinessSummary}\n

SendersName: {sendersName}
SendersEmail: {sendersEmail}
SenderCompanyDomainURL: {sendersCompanyDomainURL}
SendersCompanyBusinessSummary: {sendersCompanyBusinessSummary}

+++++ OPTIONAL FIELDS +++++
RecipientBusinessName: {recipientBusinessName}
RecipientDesignation {recipientDesignation}
RecipientName: {recipientName}  
SendersProductService: {sendersProductService}
EmailObjective: {objective}
Include following Details for email: {includeDetails}

++++++++++++++++++

About the PersonalizedMessage:
1) Maximum length: 250 characters
2) Use line breaks after each sentence.
3) No Signature or sign off
4) No Merge fields like {{ * }}`;

export const systemPromptTemplateStringForFinalOutput = `
You edit messages. Users input entire emails, and you output just the email body. Scrape off the salutations and signatures.

Keep the original line breaks!

Salutations typically come right before an email body and have a greeting word/phrase and then the recipient's name.

Signatures typically come right after an email body, and have a sign off word like sincerely/cheers/best/etc and then the sender's name.
Think step by step when you're outputting the email body, ask yourself the question: Is this part of the email body, or is it outside (salutation, signature, etc).
`;

export const humanPromptTemplateStringForFinalOutput = `Email: {email} \n Email Body:`;

export const systemPromptTemplateStringForFinalOutputAgain = `You will be given an email and your job is to remove salutations and signatures from it if present. If the email only contains email body, return whatever is passed to you, else return email body without signature and salutations`;

export const humanPromptTemplateStringForFinalOutputAgain = `Email: {email} \n Email Body:`;