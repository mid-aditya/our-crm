import type { Component } from 'svelte';
import {
	Bot,
	Globe,
	Hash,
	MessageCircle,
	Phone,
	ShoppingBag,
	MessageSquare,
	User
} from '@lucide/svelte';

export type AuthType = 'bearer' | 'basic' | 'url' | 'websocket' | 'bot';

export type ConfigField = {
	key: string;
	labelId: string;
	placeholder?: string;
	type: 'text' | 'password' | 'url' | 'number';
	required?: boolean;
	helpId?: string;
};

export type ChannelDef = {
	id: string;
	nameId: string;
	descriptionId: string;
	icon: Component<any>;
	color: string; // CSS color for icon bg
	authType: AuthType;
	fields: ConfigField[];
};

export const channelDefs: ChannelDef[] = [
	{
		id: 'whatsapp-official',
		nameId: 'channels.whatsappOfficial.name',
		descriptionId: 'channels.whatsappOfficial.description',
		icon: Phone,
		color: '#25D366',
		authType: 'bearer',
		fields: [
			{
				key: 'access_token',
				labelId: 'channels.fields.accessToken',
				type: 'password',
				required: true,
				helpId: 'channels.fields.accessTokenHelp'
			},
			{
				key: 'phone_number_id',
				labelId: 'channels.fields.phoneNumberId',
				type: 'number',
				placeholder: '123456789',
				required: true
			},
			{
				key: 'webhook_url',
				labelId: 'channels.fields.webhookUrl',
				type: 'url',
				placeholder: 'https://yourapp.com/api/wa-webhook/123'
			},
			{
				key: 'verify_token',
				labelId: 'channels.fields.verifyToken',
				type: 'password',
				helpId: 'channels.fields.verifyTokenHelp'
			}
		]
	},
	{
		id: 'whatsapp-baileys',
		nameId: 'channels.whatsappBaileys.name',
		descriptionId: 'channels.whatsappBaileys.description',
		icon: Phone,
		color: '#128C7E',
		authType: 'url',
		fields: [
			{
				key: 'gateway_url',
				labelId: 'channels.fields.gatewayUrl',
				type: 'url',
				placeholder: 'http://localhost:8081',
				required: true,
				helpId: 'channels.fields.baileysGatewayHelp'
			},
			{
				key: 'auth_key',
				labelId: 'channels.fields.authKey',
				type: 'password',
				required: true
			},
			{
				key: 'device_name',
				labelId: 'channels.fields.deviceName',
				type: 'text',
				placeholder: 'Galaxy S23'
			}
		]
	},
	{
		id: 'livechat',
		nameId: 'channels.livechat.name',
		descriptionId: 'channels.livechat.description',
		icon: MessageSquare,
		color: '#6366F1',
		authType: 'websocket',
		fields: [
			{
				key: 'wss_url',
				labelId: 'channels.fields.wssUrl',
				type: 'url',
				placeholder: 'wss://your-livechat.com/ws',
				required: true,
				helpId: 'channels.fields.livechatWssHelp'
			},
			{
				key: 'api_key',
				labelId: 'channels.fields.apiKey',
				type: 'password',
				required: true
			}
		]
	},
	{
		id: 'facebook',
		nameId: 'channels.facebook.name',
		descriptionId: 'channels.facebook.description',
		icon: MessageCircle,
		color: '#1877F2',
		authType: 'bearer',
		fields: [
			{
				key: 'page_access_token',
				labelId: 'channels.fields.pageAccessToken',
				type: 'password',
				required: true
			},
			{
				key: 'page_id',
				labelId: 'channels.fields.pageId',
				type: 'number',
				required: true
			},
			{
				key: 'app_id',
				labelId: 'channels.fields.appId',
				type: 'number',
				required: true
			}
		]
	},
	{
		id: 'instagram',
		nameId: 'channels.instagram.name',
		descriptionId: 'channels.instagram.description',
		icon: User,
		color: '#E1306C',
		authType: 'bearer',
		fields: [
			{
				key: 'access_token',
				labelId: 'channels.fields.accessToken',
				type: 'password',
				required: true
			},
			{
				key: 'instagram_account_id',
				labelId: 'channels.fields.igAccountId',
				type: 'number',
				required: true
			}
		]
	},
	{
		id: 'line',
		nameId: 'channels.line.name',
		descriptionId: 'channels.line.description',
		icon: MessageCircle,
		color: '#00B900',
		authType: 'bearer',
		fields: [
			{
				key: 'channel_access_token',
				labelId: 'channels.fields.channelAccessToken',
				type: 'password',
				required: true,
				helpId: 'channels.fields.lineTokenHelp'
			},
			{
				key: 'channel_secret',
				labelId: 'channels.fields.channelSecret',
				type: 'password',
				required: true
			}
		]
	},
	{
		id: 'shopee',
		nameId: 'channels.shopee.name',
		descriptionId: 'channels.shopee.description',
		icon: ShoppingBag,
		color: '#EE4D2D',
		authType: 'basic',
		fields: [
			{
				key: 'shop_id',
				labelId: 'channels.fields.shopId',
				type: 'number',
				required: true
			},
			{
				key: 'partner_id',
				labelId: 'channels.fields.partnerId',
				type: 'number',
				required: true
			},
			{
				key: 'partner_key',
				labelId: 'channels.fields.partnerKey',
				type: 'password',
				required: true
			}
		]
	},
	{
		id: 'telegram',
		nameId: 'channels.telegram.name',
		descriptionId: 'channels.telegram.description',
		icon: Bot,
		color: '#0088CC',
		authType: 'bot',
		fields: [
			{
				key: 'bot_token',
				labelId: 'channels.fields.botToken',
				type: 'password',
				placeholder: '123456789:ABCdef...',
				required: true,
				helpId: 'channels.fields.telegramBotHelp'
			},
			{
				key: 'webhook_url',
				labelId: 'channels.fields.webhookUrl',
				type: 'url',
				placeholder: 'https://yourapp.com/api/telegram-webhook'
			}
		]
	}
];
