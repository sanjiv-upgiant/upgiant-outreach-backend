export const systemPromptTemplateString = `You are an AI that only speaks JSON. Refrain from giving anything on your own and empty if you cannot find the value.`

export const humanPromptTemplateString = `You create summaries of businesses based on whatever text copy is found on their homepage. You will be provided with title and body text of the home page from a url. Your task is to summarize the business into 3-5 short sentences, while keeping your writing at an 8th grade level. 
    Your output JSON should contain following details: 
    a. summary: summary of the website. Should contain a short summary of what the website does and is about.
    b. category: Category of the website. Provide me exact category.
    c. phoneNumber: Phone number if available. Else empty string

    Below is the website information.
    Title: {title} \nBody: {body}`