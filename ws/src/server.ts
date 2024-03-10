import WebSocket, { WebSocketServer } from 'ws';
import WsHelper from './WsHelper';
import fs from 'fs';
import url from 'url';
import path from 'path';
import dayjs from 'dayjs';

// Types
import { T_WssChannel, E_WssChannel, I_WssChatRequest } from './types/ws.types';

// Constants
const CHANNELS = Object.keys(E_WssChannel);
const DATA_DIR = path.join(__dirname, '../data');
const REGISTERED_USERS_FILE = path.join(DATA_DIR, 'registered_users.log');
const LISTEN_PORT = 1337;
const SYSTEM_USER = 'System';

// Create a WebSocket server
const wss: WebSocketServer = new WebSocket.Server({ port: LISTEN_PORT });

const getTimestemp = () => {
	return dayjs().format('YYYY-MM-DD HH:mm:ss');
};

const makeLinePrefix = (handle: string) => {
	return `[${getTimestemp()}] ${handle}: `;
};

wss.on('listening', () => {
	// Clean up the data directory
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR);
	}

	// Create the registered users file if it doesn't exist, otherwise clear it
	if (!fs.existsSync(REGISTERED_USERS_FILE)) {
		fs.writeFileSync(REGISTERED_USERS_FILE, '', 'utf8');
	} else {
		fs.truncate(REGISTERED_USERS_FILE, 0, () => {});
	}

	console.log(`WebSocket server listening on port ${LISTEN_PORT}`);
});

wss.on('connection', (ws: WebSocket, req: any) => {
	// Parse the query parameters
	const location = url.parse(req.url, true);
	const channel: T_WssChannel | undefined = location.query.channel as T_WssChannel | undefined;
	const handle: string = location.query.handle as string;

	// Validate query parameters
	if (!channel || !CHANNELS.includes(channel)) {
		WsHelper.error(ws, 'No valid channel provided', true);
		return;
	}

	if (!handle) {
		WsHelper.error(ws, 'No valid handle provided', true);
		return;
	}

	// Create the log file path
	const logFile: string = path.join(DATA_DIR, `channel_${channel}.log`);

	// Check if the log file exists, create it if it doesn't
	if (!fs.existsSync(logFile)) {
		fs.writeFileSync(logFile, '', 'utf8');
	}

	// Check if the user is already registered
	fs.readFile(REGISTERED_USERS_FILE, 'utf8', (err, data) => {
		if (err) {
			console.error('Error reading registered users file:', err);
			return;
		}

		const users = data.split('\n');
		const searchTerm = `${handle}|${channel}`;
		if (users.includes(searchTerm)) {
			WsHelper.error(ws, 'User already registered', true);
			console.error(`User ${handle} is already registered in channel ${E_WssChannel[channel]}`);
			return;
		}

		// Register the user
		fs.appendFile(REGISTERED_USERS_FILE, `${handle}|${channel}\n`, 'utf8', err => {
			if (err) {
				console.error('Error writing to registered users file:', err);
				return;
			}
		});
	});

	// Notify chat room of new user
	fs.appendFile(logFile, `${makeLinePrefix(SYSTEM_USER)} ${handle} has joined the chat\n`, 'utf8', err => {
		if (err) {
			console.error('Error writing to chat log:', err);
		}
	});

	// Send chat history to the client
	fs.readFile(logFile, 'utf8', (err, data) => {
		if (err) {
			console.error('Error reading chat log:', err);
			return;
		}

		const messages = data.split('\n');
		messages.forEach(message => {
			WsHelper.chat(ws, { channel, message });
		});
	});

	console.log(`Client connected to channel: ${E_WssChannel[channel]}`);

	// Watch the log file for changes
	let lastSize: number = fs.statSync(logFile).size;
	fs.watch(logFile, (eventType: string, filename: string | null) => {
		if (eventType === 'change') {
			fs.stat(logFile, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
				if (err) {
					console.error('Error getting file stats:', err);
					return;
				}

				if (stats.size > lastSize) {
					// Read the new content
					const stream = fs.createReadStream(logFile, {
						start: lastSize,
						end: stats.size,
					});

					// Send the new content to the client
					stream.on('data', (newData: Buffer) => {
						const message = newData.toString();
						WsHelper.chat(ws, { channel, message });
					});

					lastSize = stats.size;
				}
			});
		}
	});

	ws.on('message', (payload: string) => {
		try {
			const data: I_WssChatRequest = JSON.parse(payload);
			const { handle, message, type } = data;

			// Validate the payload
			if (!handle || !message || !type) {
				WsHelper.error(ws, 'Invalid payload', true);
				return;
			}

			console.log(`Received: [${type}] message from ${handle}`);

			switch (type) {
				case 'chat':
					// Append the message to the chat log
					fs.appendFile(logFile, `${makeLinePrefix(handle)} ${message}\n`, 'utf8', err => {
						if (err) {
							console.error('Error writing to chat log:', err);
						}
					});
					break;
				case 'system':
					switch (message) {
						case 'keepalive':
							console.log('Received keepalive message');
							break;
						default:
							console.error('Invalid system message:', message);
							break;
					}
					break;
				default:
					console.error('Invalid message type:', type);
					break;
			}
		} catch (err: any) {
			WsHelper.error(ws, 'Error parsing message', true);
			console.error('Error parsing message:', err);
		}
	});

	ws.on('close', () => {
		console.log('Client disconnected');

		// Notify chat room of user leaving
		fs.appendFile(logFile, `${makeLinePrefix(SYSTEM_USER)} ${handle} has left the chat\n`, 'utf8', err => {
			if (err) {
				console.error('Error writing to chat log:', err);
			}
		});

		// Remove the user from the registered users file
		const searchTerm = `${handle}|${channel}`;
		fs.readFile(REGISTERED_USERS_FILE, 'utf8', (err, data) => {
			if (err) {
				console.error('Error reading registered users file:', err);
				return;
			}

			const users = data.split('\n');
			const newUsers = users.filter(user => user !== searchTerm);

			fs.writeFile(REGISTERED_USERS_FILE, newUsers.join('\n'), 'utf8', err => {
				if (err) {
					console.error('Error writing to registered users file:', err);
				}
			});
		});
	});
});
