import axios, { AxiosInstance } from 'axios';
import axiosRateLimit from 'axios-rate-limit';

const instanceMap: Record<string, AxiosInstance> = {};

export const getAxiosInstance = (key: string, maxRequests = 200, perHour = 1): AxiosInstance => {
    const storedAxiosInstance = instanceMap[key];
    if (storedAxiosInstance) {
        return storedAxiosInstance;
    }

    const axiosInstance = axios.create();
    const instance = axiosRateLimit(axiosInstance, {
        maxRequests,
        perMilliseconds: 1000 * 60 * 60 * perHour,
    });
    instanceMap[key] = instance;

    return axiosInstance;
}

export const cleanupSpecificAxiosInstance = (apikey: string): void => {
    for (const key in instanceMap) {
        if (key === apikey)
            delete instanceMap[key];
    }
}
export const cleanupAllAxiosInstances = (): void => {
    for (const key in instanceMap) {
        delete instanceMap[key];
    }
}
