import { IIntegration } from "./integration.interfaces";
import IntegrationModel from "./integration.model";

export const addNewIntegration = async (integration: IIntegration, user: string) => {
    return IntegrationModel.create({ ...integration, user });
}