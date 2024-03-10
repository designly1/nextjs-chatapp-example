'use client';

import React, { useEffect, useState, useRef } from 'react';

import useChat from '@/hooks/useChat';

import { E_WssChannel, T_WssChannel } from '../../ws/src/types/ws.types';

export default function MainPage() {
	const { messages, wsError, connected, sendMessage, connect, disconnect, validateHandle } = useChat();

	const logEndRef = useRef<HTMLPreElement>(null);

	const [channel, setChannel] = useState<T_WssChannel>('general');
	const [handle, setHandle] = useState<string>('');
	const [errors, setErrors] = useState<any>({});
	const [messageInput, setMessageInput] = useState<string>('');

	useEffect(() => {
		setErrors((prev: any) => ({ ...prev, connect: wsError }));
	}, [wsError]);

	// Effect to scroll to the bottom of the log
	useEffect(() => {
		if (logEndRef.current) {
			logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
		}
	}, [messages]);

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
		setErrors({});

		const name = e.target.name;
		const value = e.target.value;

		if (name === 'channel') {
			setChannel(value as T_WssChannel);
		} else if (name === 'handle') {
			// Format handle and uppercase first letter
			const modifiedHandle = value
				.replace(/[^a-zA-Z0-9_]/g, '')
				.toLowerCase()
				.replace(/^[a-z]/, c => c.toUpperCase());
			setHandle(modifiedHandle);
		}
	};

	const handleConnect = () => {
		setErrors({});

		// Validate handle
		if (!validateHandle(handle)) {
			setErrors({
				handle: 'Handle must be 3-16 characters long and contain only letters, numbers, and underscores',
			});
			return;
		}

		// Validate channel
		const channels = Object.keys(E_WssChannel);
		if (!channels.includes(channel)) {
			setErrors({ channel: 'Invalid channel' });
			return;
		}

		try {
			connect({ channel, handle });
		} catch (err: any) {
			setErrors({ connect: err.message });
		}
	};

	const handleSendMessage = () => {
		setErrors({});

		if (!messageInput) {
			setErrors({ message: 'Message cannot be empty' });
			return;
		}

		try {
			sendMessage(messageInput);
			setMessageInput('');
		} catch (err: any) {
			setErrors({ message: err.message });
		}
	};

	return (
		<div className="w-full max-w-5xl flex flex-col gap-6 mx-auto border-2 rounded-xl p-6">
			<div className="grid grid-cols-2 gap-4">
				<div className="form-control">
					<label className="label">
						<span className="label-text">Channel</span>
					</label>
					<select
						className="select select-bordered w-full"
						name="channel"
						value={channel}
						onChange={handleChange}
					>
						{Object.keys(E_WssChannel).map(channel => {
							const channelKey = channel as T_WssChannel;
							return (
								<option key={channelKey} value={channelKey}>
									{E_WssChannel[channelKey]}
								</option>
							);
						})}
					</select>
					<label className="label">
						<span className="label-text-alt text-error">{errors.channel || ' '}</span>
					</label>
				</div>
				<div className="form-control">
					<label className="label">
						<span className="label-text">Handle</span>
					</label>
					<input
						type="text"
						className="input input-bordered w-full"
						name="handle"
						value={handle}
						onChange={handleChange}
					/>
					<label className="label">
						<span className="label-text-alt text-error">{errors.handle || ' '}</span>
					</label>
				</div>
			</div>
			<div className="flex items-center gap-6 justify-center w-full">
				{connected ? (
					<button className="btn btn-secondary" onClick={disconnect}>
						Disconnect
					</button>
				) : (
					<button className="btn btn-primary" onClick={handleConnect}>
						Connect
					</button>
				)}
			</div>
			<div className="w-full text-center text-sm text-error">{errors.connect || ' '}</div>
			<pre
				className="bg-zinc-950 text-green-500 p-6 rounded-xl h-80 overflow-y-auto"
				ref={logEndRef}
				style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
			>
				{messages.join('\n') || 'No messages'}
			</pre>
			<div className="form-control">
				<textarea
					className="textarea textarea-bordered w-full"
					value={messageInput}
					onChange={e => setMessageInput(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							handleSendMessage();
						}
					}}
					placeholder="Type a message..."
				/>
				<label className="label">
					<span className="label-text-alt text-error">{errors.message || ' '}</span>
				</label>
			</div>
		</div>
	);
}
