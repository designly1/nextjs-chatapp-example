import WebSocket from 'ws';

import { I_WssResponse, I_WssSend, I_WssChatResponse } from './types/ws.types';

class WsHelper {
	public static send<T>(ws: WebSocket, data: I_WssSend<T>, closeConnection = false) {
		ws.send(JSON.stringify(data));
		if (closeConnection) ws.close();
	}

	public static success<T>(ws: WebSocket, data: T, closeConnection = false) {
		WsHelper.send(ws, { success: true, data }, closeConnection);
	}

	public static error(ws: WebSocket, message: string, closeConnection = false) {
		WsHelper.send(ws, { success: false, message }, closeConnection);
	}

	public static chat(ws: WebSocket, data: I_WssChatResponse) {
		WsHelper.send(ws, { success: true, data });
	}
}

export default WsHelper;
