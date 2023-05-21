import { OpenAI } from "langchain";
import { Configuration, OpenAIApi } from "openai";

export const testOpenAI = async (openAIApiKey: string) => {
    const model = new OpenAI({ openAIApiKey, temperature: 0 });
    await model.call("Is this key working?");
}

export const listModels = async (apiKey: string) => {
    const configuration = new Configuration({
        apiKey,
    });
    const openai = new OpenAIApi(configuration);
    const models = await openai.listModels();
    return models.data.data;
}