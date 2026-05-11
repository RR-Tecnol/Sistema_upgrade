export interface NotificationPayload {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
}

export interface NotificationProvider {
    readonly channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
    send(payload: NotificationPayload): Promise<void>;
}
