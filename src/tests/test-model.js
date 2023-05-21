import { OpenAI } from "langchain";

const openAIApiKey = "";
const llm = new OpenAI({ temperature: 0.1, openAIApiKey, modelName: 'gpt-4' }, {

});

import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: openAIApiKey,
});
const openai = new OpenAIApi(configuration);

const models = await openai.listModels();
console.log(models.data.data)

