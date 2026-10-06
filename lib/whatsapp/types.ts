export type WhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: { type: string; text?: string; format?: string }[];
};
export type MetaMessageResult = { messages: { id: string }[] };
export type EmbeddedSignupResult = {
  code: string;
  wabaId: string;
  phoneNumberId: string;
};
export type IntegrationView = {
  status: string;
  businessPhone?: string;
  businessName?: string;
  connectedAt?: string;
  webhookVerified: boolean;
  configurationRequired: string[];
  embeddedSignup: { ready: boolean; appId?: string; configId?: string };
};
