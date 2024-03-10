import { useEffect, useState } from 'react';

import {
	T_WssChannel,
	E_WssChannel,
	I_WssChatResponse,
	I_WssSend,
	I_WssChatRequest,
} from '../../ws/src/types/ws.types';

interface I_UseChatReturn {
	messages: string[];
	wsError: string;
	connected: boolean;
	connect: (props: I_UseChatConnect) => void;
	disconnect: () => void;
	sendMessage: (message: string) => void;
	validateHandle: (handle: string) => boolean;
}

interface I_UseChatConnect {
	channel: T_WssChannel;
	handle: string;
}

export const CHANNELS = Object.keys(E_WssChannel);
export const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
export const KEEPALIVE_INTERVAL = 30000; // 30 seconds

export default function useChat(): I_UseChatReturn {
	// Validate environment variables
	const wssUrl = process.env.NEXT_PUBLIC_WSS_URL;
	if (!wssUrl) {
		throw new Error('NEXT_PUBLIC_WSS_URL is not defined');
	}

	// State
	const [messages, setMessages] = useState<string[]>([]);
	const [ws, setWs] = useState<WebSocket | null>(null);
	const [wsError, setWsError] = useState<string>('');
	const [connected, setConnected] = useState<boolean>(false);
	const [channel, setChannel] = useState<T_WssChannel>('general');
	const [handle, setHandle] = useState<string>('');

	// Methods
	const connect = (props: I_UseChatConnect) => {
		const { channel, handle } = props;

		// Validate that handle and channel are set
		if (!handle || !HANDLE_REGEX.test(handle)) {
			throw new Error(`Invalid handle: ${handle}`);
		}

		if (!channel || !CHANNELS.includes(channel)) {
			throw new Error(`Invalid channel: ${channel}`);
		}

		setChannel(channel);
		setHandle(handle);

		// Set up the WebSocket connection
		const urlParams = new URLSearchParams();
		urlParams.append('channel', channel);
		urlParams.append('handle', handle);

		const socket = new WebSocket(`${wssUrl}?${urlParams.toString()}`);
		setWs(socket);
		setMessages([`Connected to [${E_WssChannel[channel]}] as ${handle}`]);
	};

	const disconnect = () => {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.close();
		} else {
			console.error('WebSocket is not open');
		}
	};

	const sendMessage = (message: string) => {
		if (ws?.readyState === WebSocket.OPEN) {
			const payload: I_WssChatRequest = {
				type: 'chat',
				handle,
				message,
			};
			ws.send(JSON.stringify(payload));
		} else {
			console.error('WebSocket is not open');
		}
	};

	const sendSystemMessage = (message: string) => {
		if (ws?.readyState === WebSocket.OPEN) {
			const payload: I_WssChatRequest = {
				type: 'system',
				handle,
				message,
			};
			ws.send(JSON.stringify(payload));
		} else {
			console.error('WebSocket is not open');
		}
	};

	const validateHandle = (handle: string) => {
		return HANDLE_REGEX.test(handle);
	};

	// Effects
	useEffect(() => {
		if (ws) {
			ws.onopen = () => {
				setConnected(true);
				console.info(`Connected to chat channel: ${channel} as ${handle}`);
			};

			ws.onmessage = event => {
				const response = JSON.parse(event.data) as I_WssSend<I_WssChatResponse>;
				const { success, message, data } = response;

				if (!success || !data) {
					setWsError(message || 'Unknown error receiving message');
					return;
				}

				console.info(`Received message from channel: ${data.channel}`);

				if (data.message) {
					setMessages(prevMessages => [...prevMessages, data.message.trim()]);
				}
			};

			ws.onclose = () => {
				setConnected(false);
				setMessages([`Disconnected from [${E_WssChannel[channel]}]`]);
				setChannel('general');
				setHandle('');
				console.info('Disconnected from chat channel');
			};

			ws.onerror = error => {
				setConnected(false);
				setWsError('Error connecting to chat channel');
				console.error('WebSocket error:', error);
			};

			// Keep the connection alive
			const keepAliveInterval = setInterval(() => {
				if (ws.readyState === WebSocket.OPEN) {
					sendSystemMessage('keepalive');
				}
			}, KEEPALIVE_INTERVAL);

			return () => {
				ws.close();
				clearInterval(keepAliveInterval);
				setConnected(false);
			};
		}
	}, [ws]);

	return {
		messages,
		wsError,
		connected,
		connect,
		disconnect,
		sendMessage,
		validateHandle,
	};
}
