// Types //

export enum E_WssChannel {
	general = 'General Discussion',
	tech = 'Tech Discussion',
}

export type T_WssChannel = keyof typeof E_WssChannel;

export type T_WssChatRequestType = 'system' | 'chat';

// Interfaces //

export interface I_WssResponse {
	success: boolean;
	message?: string;
}

export interface I_WssSend<T> extends I_WssResponse {
	data?: T;
}

export interface I_WssChatResponse {
	channel: T_WssChannel;
	message: string;
}

export interface I_WssChatRequest {
	type: T_WssChatRequestType;
	handle: string;
	message: string;
}
